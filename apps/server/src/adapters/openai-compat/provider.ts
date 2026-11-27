import {
  CONTRACT_VERSION,
  INTERNAL_CLASSIFICATIONS,
  MODERATION_REASON_CODES,
  POLICY_REASON_CODES,
  SC_ITEM_FIELDS,
  SC_MULTILINGUAL_ITEM_FIELDS,
  type AiBatchInput,
  type InferenceCapabilities,
  type InferenceModelCapability,
  type InferenceProvider,
  type InferenceRequest,
  type InferenceResult,
  type InferenceResultItem,
  type InternalClassification,
  type MatchedSpan,
  type ModerationReasonCode,
  type ScMultilingualBatchInput,
} from "@voxward/contracts";
import { OutboundUrlError, safeOutboundFetch, trimTrailingSlashes } from "../../security/outbound-url.js";

export interface HttpValidatedItem {
  readonly itemId: string;
  readonly verdict: InternalClassification;
  readonly reasonCodes: readonly ModerationReasonCode[];
  readonly matchedSpan?: MatchedSpan;
}

export type HttpBatchOutputOutcome =
  | { readonly ok: true; readonly items: readonly HttpValidatedItem[] }
  | { readonly ok: false; readonly errors: readonly { readonly code: string }[] };

export type HttpBatchValidator = (output: unknown, input: AiBatchInput) => Promise<HttpBatchOutputOutcome>;

export interface HttpInferenceUsage {
  readonly provider: "openai-compat" | "anthropic-compat";
  readonly modelId: string;
  readonly batchId: string;
  readonly latencyMs: number;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly statusCode: number;
}

export interface OpenAiCompatProviderOptions {
  readonly baseUrl?: string;
  readonly apiKey: string;
  readonly model?: string;
  readonly maxTokens?: number;
  readonly maxItems?: number;
  readonly timeoutMs?: number;
  readonly models?: readonly InferenceModelCapability[];
  readonly validateOutput?: HttpBatchValidator;
  readonly fetchImpl?: typeof fetch;
  readonly onUsage?: (usage: HttpInferenceUsage) => void;
}

export interface RemoteModelSummary {
  readonly modelId: string;
  readonly displayName: string;
  readonly reasoningLevels: readonly string[];
  readonly source: "remote";
}

export interface HttpProbeResult {
  readonly ok: boolean;
  readonly statusCode: number;
  readonly latencyMs: number;
  readonly url: string;
  readonly models?: readonly RemoteModelSummary[];
  readonly errorCode?: string;
  readonly rawBodyPreview?: string;
}

export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_MAX_ITEMS = 50;

export function normalizeOpenAiBaseUrl(baseUrl?: string): string {
  const raw = (baseUrl ?? "").trim();
  if (!raw) return DEFAULT_OPENAI_BASE_URL;
  return trimTrailingSlashes(raw);
}

function stripJsonCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return match?.[1]?.trim() ?? trimmed;
}

export function stripReasoningPrefix(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^\s*<think>[\s\S]*?(?=\s*(?:```|\{))/i, "");
}

export function parseModelJsonObject(text: string, errorCode = "OPENAI_OUTPUT_NOT_JSON"): unknown {
  const clean = stripJsonCodeFence(stripReasoningPrefix(text));
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(clean.slice(start, end + 1));
    }
    throw new Error(errorCode);
  }
}

const VALID_VERDICTS = new Set<InternalClassification>(INTERNAL_CLASSIFICATIONS);

function defaultValidateModeration(output: unknown, input: AiBatchInput): HttpBatchOutputOutcome {
  if (typeof output !== "object" || output === null || !Array.isArray((output as { items?: unknown }).items)) {
    return { ok: false, errors: [{ code: "SCHEMA_INVALID" }] };
  }
  const expectedIds = new Set(input.items.map((i) => i.itemId));
  const seen = new Set<string>();
  const items: HttpValidatedItem[] = [];
  for (const raw of (output as { items: unknown[] }).items) {
    if (typeof raw !== "object" || raw === null) return { ok: false, errors: [{ code: "ITEM_INVALID" }] };
    const r = raw as Record<string, unknown>;
    if (typeof r.itemId !== "string" || !expectedIds.has(r.itemId) || seen.has(r.itemId)) {
      return { ok: false, errors: [{ code: "ITEM_ID_MISMATCH" }] };
    }
    if (typeof r.verdict !== "string" || !VALID_VERDICTS.has(r.verdict as InternalClassification)) {
      return { ok: false, errors: [{ code: "VERDICT_INVALID" }] };
    }
    const reasonCodes = Array.isArray(r.reasonCodes)
      ? r.reasonCodes.filter((c): c is ModerationReasonCode => typeof c === "string")
      : [];
    seen.add(r.itemId);
    items.push({
      itemId: r.itemId,
      verdict: r.verdict as InternalClassification,
      reasonCodes,
    });
  }
  if (seen.size !== expectedIds.size) return { ok: false, errors: [{ code: "ITEMS_MISSING" }] };
  return { ok: true, items };
}

export function buildModerationPrompt(input: AiBatchInput): string {
  return [
    "You are VoxWard's live-stream chat moderation classifier.",
    "Evaluate every item strictly and return ONLY a raw JSON object (no prose, no markdown fences, no extra fields):",
    `{"items":[{"itemId":"...","verdict":"${INTERNAL_CLASSIFICATIONS.join("|")}","reasonCodes":["${MODERATION_REASON_CODES.join(' | ')}"]}]}`,
    "Strict contract rules:",
    `- Allowed verdicts: ${INTERNAL_CLASSIFICATIONS.join(", ")}.`,
    `- Allowed reasonCodes (exact enum strings ONLY): ${MODERATION_REASON_CODES.join(", ")}.`,
    `- ALLOW_MEANINGFUL MUST use reasonCodes: ["NONE"] (safe substantive chat or viewer questions).`,
    `- ALLOW_NOISE MUST use reasonCodes: ["NOISE"] (harmless reactions, laughter, emotes, or short greetings).`,
    `- BLOCK MUST use 1 or more codes from [${POLICY_REASON_CODES.join(", ")}], NEVER ["NONE"] and NEVER ["NOISE"] and NEVER [].`,
    "- Do NOT add extra keys besides itemId, verdict, reasonCodes (and optional matchedSpan {start,end}).",
    "- Every input itemId must appear exactly once. Output raw JSON only.",
    "",
    JSON.stringify(input),
  ].join("\n");
}

export function buildScTranslationPrompt(input: AiBatchInput | ScMultilingualBatchInput): string {
  const isMultilingual = "targetLanguages" in input && Array.isArray(input.targetLanguages);
  const exampleShape = isMultilingual
    ? `{"items":[{"itemId":"...","verdict":"${INTERNAL_CLASSIFICATIONS.join("|")}","reasonCodes":["NONE"],"sourceLanguage":"ja","translations":[{"language":"en","translatedText":"...","slangNote":"...","replyCue":"..."}]}]}`
    : '{"items":[{"itemId":"...","verdict":"ALLOW_MEANINGFUL|ALLOW_NOISE|BLOCK","reasonCodes":["NONE"],"translatedText":"...","slangNote":"...","replyCue":"..."}]}';
  const allowedFields = (isMultilingual ? SC_MULTILINGUAL_ITEM_FIELDS : SC_ITEM_FIELDS).join(", ");
  return [
    "You are VoxWard's Super Chat safety moderator and concise translator.",
    "Evaluate safety and translate safe Super Chat messages. Return ONLY raw JSON matching the exact schema below (no markdown, no extra keys):",
    exampleShape,
    "Strict contract rules:",
    `- Required item keys ONLY: ${allowedFields}.`,
    `- Allowed reasonCodes: ${MODERATION_REASON_CODES.join(", ")} (ALLOW_MEANINGFUL -> ["NONE"], ALLOW_NOISE -> ["NOISE"], BLOCK -> 1+ of [${POLICY_REASON_CODES.join(", ")}]).`,
    isMultilingual
      ? "- Include BCP-47 sourceLanguage (e.g. ja, en, zh-CN, ko) and one entry in translations per requested targetLanguage with language, translatedText, slangNote, replyCue (empty strings if BLOCK -> translations: [])."
      : "- Provide concise translatedText, slangNote, replyCue strings (empty strings \"\" when verdict is BLOCK).",
    "- Every input itemId must appear exactly once. Output raw JSON only.",
    "",
    JSON.stringify(input),
  ].join("\n");
}

export function inferReasoningLevelsForModel(modelId: string): readonly string[] {
  const lower = modelId.toLowerCase();
  if (/^(o1|o3|o4|gpt-5)/.test(lower)) return ["low", "medium", "high"];
  return [];
}

export async function probeOpenAiCompatEndpoint(options: {
  readonly baseUrl?: string;
  readonly apiKey: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}): Promise<HttpProbeResult> {
  const base = normalizeOpenAiBaseUrl(options.baseUrl);
  const url = `${base}/models`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
  const started = Date.now();
  try {
    const response = await safeOutboundFetch(
      url,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${options.apiKey}`,
        },
        signal: controller.signal,
      },
      { fetchImpl: options.fetchImpl },
    );
    const latencyMs = Math.max(0, Date.now() - started);
    const bodyText = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        statusCode: response.status,
        latencyMs,
        url,
        errorCode: `HTTP_${response.status}`,
        rawBodyPreview: bodyText.slice(0, 512),
      };
    }
    const parsed = JSON.parse(bodyText) as { data?: Array<{ id?: unknown }> };
    const models: RemoteModelSummary[] = (Array.isArray(parsed.data) ? parsed.data : [])
      .filter((entry): entry is { id: string } => typeof entry?.id === "string" && entry.id.length > 0)
      .slice(0, 100)
      .map((entry) => ({
        modelId: entry.id,
        displayName: entry.id,
        reasoningLevels: inferReasoningLevelsForModel(entry.id),
        source: "remote" as const,
      }));
    return {
      ok: true,
      statusCode: response.status,
      latencyMs,
      url,
      models,
      rawBodyPreview: JSON.stringify({ modelCount: models.length }),
    };
  } catch (err) {
    return {
      ok: false,
      statusCode: 0,
      latencyMs: Math.max(0, Date.now() - started),
      url,
      errorCode:
        err instanceof OutboundUrlError
          ? err.code
          : err instanceof Error && err.name === "AbortError"
            ? "TIMEOUT"
            : "NETWORK_ERROR",
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface OpenAiCompatProvider extends InferenceProvider {
  testConnection(): Promise<HttpProbeResult>;
  fetchModels(): Promise<HttpProbeResult>;
  inferScBatch(
    input: AiBatchInput | ScMultilingualBatchInput,
    call: { readonly batchId: string; readonly modelId: string; readonly reasoning?: string | null },
  ): Promise<unknown>;
}

export function createOpenAiCompatInferenceProvider(options: OpenAiCompatProviderOptions): OpenAiCompatProvider {
  const baseUrl = normalizeOpenAiBaseUrl(options.baseUrl);
  const fetchFn = options.fetchImpl ?? fetch;
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const activeControllers = new Map<string, AbortController>();
  let cachedModels: readonly InferenceModelCapability[] | undefined = options.models;

  async function callChatCompletion(
    batchId: string,
    modelId: string,
    prompt: string,
    reasoning?: string | null,
  ): Promise<unknown> {
    if (activeControllers.has(batchId)) {
      throw new Error("DUPLICATE_BATCH_ID");
    }
    const controller = new AbortController();
    activeControllers.set(batchId, controller);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    try {
      const payload: Record<string, unknown> = {
        model: modelId,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      };
      if (reasoning && inferReasoningLevelsForModel(modelId).length > 0) {
        payload.reasoning_effort = reasoning;
      } else {
        payload.temperature = 0;
      }
      const response = await safeOutboundFetch(
        `${baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            authorization: `Bearer ${options.apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
        { fetchImpl: options.fetchImpl },
      );
      const latencyMs = Math.max(0, Date.now() - started);
      const rawText = await response.text();
      if (!response.ok) {
        options.onUsage?.({
          provider: "openai-compat",
          modelId,
          batchId,
          latencyMs,
          inputTokens: null,
          outputTokens: null,
          statusCode: response.status,
        });
        throw new Error(`OPENAI_HTTP_${response.status}`);
      }
      const data = JSON.parse(rawText) as {
        choices?: Array<{ message?: { content?: unknown } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      options.onUsage?.({
        provider: "openai-compat",
        modelId,
        batchId,
        latencyMs,
        inputTokens: typeof data.usage?.prompt_tokens === "number" ? data.usage.prompt_tokens : null,
        outputTokens: typeof data.usage?.completion_tokens === "number" ? data.usage.completion_tokens : null,
        statusCode: response.status,
      });
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim().length === 0) {
        throw new Error("OPENAI_EMPTY_CONTENT");
      }
      return parseModelJsonObject(content);
    } finally {
      clearTimeout(timer);
      activeControllers.delete(batchId);
    }
  }

  return {
    moduleName: "InferenceProvider",
    contractVersion: CONTRACT_VERSION,

    describe(): InferenceCapabilities {
      return {
        contractVersion: CONTRACT_VERSION,
        providerName: "openai-compat",
        supportsCancel: true,
        ...(cachedModels !== undefined ? { models: cachedModels } : {}),
      };
    },

    async testConnection(): Promise<HttpProbeResult> {
      const res = await probeOpenAiCompatEndpoint({
        baseUrl,
        apiKey: options.apiKey,
        fetchImpl: options.fetchImpl,
        timeoutMs: Math.min(timeoutMs, 20_000),
      });
      if (res.ok && res.models) {
        cachedModels = res.models.map(({ modelId, reasoningLevels }) => ({
          modelId,
          reasoningLevels,
        }));
      }
      return res;
    },

    async fetchModels(): Promise<HttpProbeResult> {
      return this.testConnection();
    },

    async infer(request: InferenceRequest): Promise<InferenceResult> {
      if (request.items.length === 0 || request.items.length > maxItems) {
        throw new Error("OPENAI_BATCH_SIZE_INVALID");
      }
      const modelId = request.selection?.modelId ?? options.model;
      if (!modelId) throw new Error("OPENAI_MODEL_NOT_SELECTED");
      const batchInput: AiBatchInput = {
        items: request.items.map((item, idx) => ({
          itemId: `i${idx}`,
          text: item.text,
        })),
      };
      const rawOutput = await callChatCompletion(
        request.batchId,
        modelId,
        buildModerationPrompt(batchInput),
        request.selection?.reasoning ?? null,
      );
      const outcome = options.validateOutput
        ? await options.validateOutput(rawOutput, batchInput)
        : defaultValidateModeration(rawOutput, batchInput);
      if (!outcome.ok) {
        throw new Error(`OPENAI_OUTPUT_INVALID:${outcome.errors[0]?.code ?? "UNKNOWN"}`);
      }
      const byItemId = new Map(outcome.items.map((item) => [item.itemId, item]));
      const resultItems: InferenceResultItem[] = request.items.map((reqItem, idx) => {
        const matched = byItemId.get(`i${idx}`);
        if (matched === undefined) throw new Error("OPENAI_ITEM_MISSING");
        return {
          correlationId: reqItem.correlationId,
          itemId: matched.itemId,
          classification: matched.verdict,
          reasonCodes: matched.reasonCodes,
          ...(matched.matchedSpan !== undefined ? { matchedSpan: matched.matchedSpan } : {}),
        };
      });
      return {
        contractVersion: CONTRACT_VERSION,
        batchId: request.batchId,
        items: resultItems,
      };
    },

    async inferScBatch(input, call): Promise<unknown> {
      return callChatCompletion(call.batchId, call.modelId, buildScTranslationPrompt(input), call.reasoning ?? null);
    },

    async cancel(batchId: string): Promise<void> {
      activeControllers.get(batchId)?.abort();
      activeControllers.delete(batchId);
    },

    async releaseSession(batchId: string): Promise<void> {
      activeControllers.get(batchId)?.abort();
      activeControllers.delete(batchId);
    },
  };
}
