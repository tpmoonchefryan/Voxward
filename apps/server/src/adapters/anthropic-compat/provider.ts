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
  type ModerationReasonCode,
  type ScMultilingualBatchInput,
} from "@voxward/contracts";
import { OutboundUrlError, safeOutboundFetch } from "../../security/outbound-url.js";
import {
  buildModerationPrompt,
  buildScTranslationPrompt,
  parseModelJsonObject,
  type HttpBatchOutputOutcome,
  type HttpBatchValidator,
  type HttpInferenceUsage,
  type HttpProbeResult,
  type HttpValidatedItem,
  type RemoteModelSummary,
} from "../openai-compat/provider.js";

export interface AnthropicCompatProviderOptions {
  readonly baseUrl?: string;
  readonly apiKey: string;
  readonly model?: string;
  readonly anthropicVersion?: string;
  readonly maxTokens?: number;
  readonly maxItems?: number;
  readonly timeoutMs?: number;
  readonly models?: readonly InferenceModelCapability[];
  readonly validateOutput?: HttpBatchValidator;
  readonly fetchImpl?: typeof fetch;
  readonly onUsage?: (usage: HttpInferenceUsage) => void;
}

export const DEFAULT_ANTHROPIC_BASE_URL = "https://api.anthropic.com";
export const DEFAULT_ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_MAX_ITEMS = 50;

export function normalizeAnthropicBaseUrl(baseUrl?: string): string {
  const raw = (baseUrl ?? "").trim();
  if (!raw) return DEFAULT_ANTHROPIC_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export function buildAnthropicPath(baseUrl: string, resource: "messages" | "models"): string {
  const normalized = normalizeAnthropicBaseUrl(baseUrl);
  if (/\/v1$/i.test(normalized)) {
    return `${normalized}/${resource}`;
  }
  return `${normalized}/v1/${resource}`;
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

export async function probeAnthropicCompatEndpoint(options: {
  readonly baseUrl?: string;
  readonly apiKey: string;
  readonly anthropicVersion?: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}): Promise<HttpProbeResult> {
  const url = buildAnthropicPath(options.baseUrl ?? DEFAULT_ANTHROPIC_BASE_URL, "models");
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
          "x-api-key": options.apiKey,
          "anthropic-version": options.anthropicVersion ?? DEFAULT_ANTHROPIC_VERSION,
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
    const parsed = JSON.parse(bodyText) as { data?: Array<{ id?: unknown; display_name?: unknown }> };
    const models: RemoteModelSummary[] = (Array.isArray(parsed.data) ? parsed.data : [])
      .filter((entry): entry is { id: string; display_name?: unknown } => typeof entry?.id === "string" && entry.id.length > 0)
      .slice(0, 100)
      .map((entry) => ({
        modelId: entry.id,
        displayName: typeof entry.display_name === "string" && entry.display_name.trim() ? entry.display_name : entry.id,
        reasoningLevels: [],
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

export interface AnthropicCompatProvider extends InferenceProvider {
  testConnection(): Promise<HttpProbeResult>;
  fetchModels(): Promise<HttpProbeResult>;
  inferScBatch(
    input: AiBatchInput | ScMultilingualBatchInput,
    call: { readonly batchId: string; readonly modelId: string },
  ): Promise<unknown>;
}

export function createAnthropicCompatInferenceProvider(options: AnthropicCompatProviderOptions): AnthropicCompatProvider {
  const baseUrl = normalizeAnthropicBaseUrl(options.baseUrl);
  const anthropicVersion = options.anthropicVersion ?? DEFAULT_ANTHROPIC_VERSION;
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const activeControllers = new Map<string, AbortController>();
  let cachedModels: readonly InferenceModelCapability[] | undefined = options.models;

  async function callMessages(batchId: string, modelId: string, prompt: string): Promise<unknown> {
    if (activeControllers.has(batchId)) {
      throw new Error("DUPLICATE_BATCH_ID");
    }
    const controller = new AbortController();
    activeControllers.set(batchId, controller);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    try {
      const response = await safeOutboundFetch(
        buildAnthropicPath(baseUrl, "messages"),
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            "x-api-key": options.apiKey,
            "anthropic-version": anthropicVersion,
          },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            temperature: 0,
            messages: [{ role: "user", content: prompt }],
          }),
          signal: controller.signal,
        },
        { fetchImpl: options.fetchImpl },
      );
      const latencyMs = Math.max(0, Date.now() - started);
      const rawText = await response.text();
      if (!response.ok) {
        options.onUsage?.({
          provider: "anthropic-compat",
          modelId,
          batchId,
          latencyMs,
          inputTokens: null,
          outputTokens: null,
          statusCode: response.status,
        });
        throw new Error(`ANTHROPIC_HTTP_${response.status}`);
      }
      const data = JSON.parse(rawText) as {
        content?: Array<{ type?: string; text?: unknown }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      options.onUsage?.({
        provider: "anthropic-compat",
        modelId,
        batchId,
        latencyMs,
        inputTokens: typeof data.usage?.input_tokens === "number" ? data.usage.input_tokens : null,
        outputTokens: typeof data.usage?.output_tokens === "number" ? data.usage.output_tokens : null,
        statusCode: response.status,
      });
      const textBlock = (Array.isArray(data.content) ? data.content : [])
        .filter((b): b is { type: "text"; text: string } => b?.type === "text" && typeof b.text === "string")
        .map((b) => b.text)
        .join("\n");
      if (!textBlock.trim()) {
        throw new Error("ANTHROPIC_EMPTY_CONTENT");
      }
      return parseModelJsonObject(textBlock, "ANTHROPIC_OUTPUT_NOT_JSON");
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
        providerName: "anthropic-compat",
        supportsCancel: true,
        ...(cachedModels !== undefined ? { models: cachedModels } : {}),
      };
    },

    async testConnection(): Promise<HttpProbeResult> {
      const res = await probeAnthropicCompatEndpoint({
        baseUrl,
        apiKey: options.apiKey,
        anthropicVersion,
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
        throw new Error("ANTHROPIC_BATCH_SIZE_INVALID");
      }
      const modelId = request.selection?.modelId ?? options.model;
      if (!modelId) throw new Error("ANTHROPIC_MODEL_NOT_SELECTED");
      const batchInput: AiBatchInput = {
        items: request.items.map((item, idx) => ({
          itemId: `i${idx}`,
          text: item.text,
        })),
      };
      const rawOutput = await callMessages(request.batchId, modelId, buildModerationPrompt(batchInput));
      const outcome = options.validateOutput
        ? await options.validateOutput(rawOutput, batchInput)
        : defaultValidateModeration(rawOutput, batchInput);
      if (!outcome.ok) {
        throw new Error(`ANTHROPIC_OUTPUT_INVALID:${outcome.errors[0]?.code ?? "UNKNOWN"}`);
      }
      const byItemId = new Map(outcome.items.map((item) => [item.itemId, item]));
      const resultItems: InferenceResultItem[] = request.items.map((reqItem, idx) => {
        const matched = byItemId.get(`i${idx}`);
        if (matched === undefined) throw new Error("ANTHROPIC_ITEM_MISSING");
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
      return callMessages(call.batchId, call.modelId, buildScTranslationPrompt(input));
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
