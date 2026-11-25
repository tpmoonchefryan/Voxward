import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { probeAnthropicCompatEndpoint } from "./anthropic-compat/provider.js";
import { describeKiroCli } from "./kiro-cli/capabilities.js";
import { sweepOrphanRunDirectories } from "./kiro-cli/orphan-sweep.js";
import { probeOpenAiCompatEndpoint, type RemoteModelSummary } from "./openai-compat/provider.js";

const execFileAsync = promisify(execFile);

export type AdapterActionStatusCode =
  | "ACTION_EXECUTED"
  | "ACTION_FAILED"
  | "CONNECTION_OK"
  | "CONNECTION_FAILED"
  | "CLI_OK"
  | "CLI_FAILED"
  | "ORPHANS_CLEANED"
  | "OBS_OVERLAY_READY"
  | "NATIVE_OUTPUT_READY"
  | "MODELS_FETCHED";

export interface AdapterActionRequest {
  readonly channelId: string;
  readonly adapterId: string;
  readonly category: "LIVE_PLATFORM" | "AI_PROVIDER" | "OUTPUT_TARGET";
  readonly driverId:
    | "youtube-live-v3"
    | "kiro-cli"
    | "openai-compat"
    | "anthropic-compat"
    | "obs-overlay-source"
    | "native-readonly-protocol";
  readonly displayName: string;
  readonly action: string;
  readonly config: Readonly<Record<string, string | number | boolean | null>>;
  /** Decrypted secrets resolved in-memory by the composition root from CredentialVault. Never logged. */
  readonly resolvedSecrets: Readonly<Record<string, string>>;
}

export interface AdapterActionResult {
  readonly ok: boolean;
  readonly httpStatus: number;
  readonly upstreamStatusCode: number;
  readonly latencyMs: number;
  readonly method: "GET" | "POST";
  readonly url: string;
  readonly summary: string;
  readonly statusCode: AdapterActionStatusCode;
  readonly statusParams: Readonly<Record<string, string | number>>;
  readonly fetchedModels?: readonly RemoteModelSummary[];
  readonly requestHeaders: Readonly<Record<string, string>>;
  readonly responseHeaders: Readonly<Record<string, string>>;
  readonly rawRequestBody: string | null;
  readonly rawResponseBody: string | null;
}

export interface YouTubeBanSyncRequest {
  readonly channelId: string;
  readonly subjectRef: string;
  readonly reason: string;
  readonly liveChatId?: string;
  readonly accessToken?: string;
}

export interface YouTubeBanSyncResult {
  readonly synced: boolean;
  readonly banId: string | null;
  readonly errorCode?: string;
  readonly httpStatus?: number;
}

export interface AdapterActionExecutor {
  execute(input: AdapterActionRequest): Promise<AdapterActionResult>;
  syncYouTubeBan(input: YouTubeBanSyncRequest): Promise<YouTubeBanSyncResult>;
}

export interface RealAdapterActionExecutorOptions {
  readonly fetchImpl?: typeof fetch;
  readonly kiroCommand?: string;
  readonly kiroRuntimeRoot?: string;
  readonly runCliVersion?: (command: string) => Promise<{ ok: boolean; version?: string; errorCode?: string }>;
}

async function defaultRunCliVersion(command: string): Promise<{ ok: boolean; version?: string; errorCode?: string }> {
  try {
    const { stdout } = await execFileAsync(command, ["--version"], { timeout: 10_000 });
    return { ok: true, version: stdout.trim() };
  } catch (err) {
    const code = (err as { code?: unknown }).code;
    return { ok: false, errorCode: typeof code === "string" ? code : "CLI_EXEC_FAILED" };
  }
}

export function createRealAdapterActionExecutor(
  options: RealAdapterActionExecutorOptions = {},
): AdapterActionExecutor {
  const fetchImpl = options.fetchImpl ?? fetch;
  const runCliVersion = options.runCliVersion ?? defaultRunCliVersion;

  return {
    async execute(input: AdapterActionRequest): Promise<AdapterActionResult> {
      const started = Date.now();
      const elapsed = () => Math.max(0, Date.now() - started);

      if (input.category === "OUTPUT_TARGET") {
        const isObs = input.driverId === "obs-overlay-source";
        const url = isObs ? `/overlay/${input.channelId}` : "/output/v1/room";
        const summary = isObs ? "OBS 透明投屏通道就绪" : "blivechat / 原生只读输出通道就绪";
        const statusCode: AdapterActionStatusCode = isObs ? "OBS_OVERLAY_READY" : "NATIVE_OUTPUT_READY";
        return {
          ok: true,
          httpStatus: 200,
          upstreamStatusCode: 200,
          latencyMs: elapsed(),
          method: "GET",
          url,
          summary,
          statusCode,
          statusParams: {},
          requestHeaders: { accept: "application/json", "x-voxward-action": input.action },
          responseHeaders: { "content-type": "application/json; charset=utf-8" },
          rawRequestBody: null,
          rawResponseBody: JSON.stringify({ ok: true, target: input.driverId }),
        };
      }

      if (input.driverId === "openai-compat") {
        const apiKey = input.resolvedSecrets.apiKey ?? "";
        const baseEndpoint = typeof input.config.baseEndpoint === "string" ? input.config.baseEndpoint : undefined;
        if (!apiKey) {
          return {
            ok: false,
            httpStatus: 400,
            upstreamStatusCode: 0,
            latencyMs: elapsed(),
            method: "GET",
            url: `${(baseEndpoint || "https://api.openai.com/v1").replace(/\/+$/, "")}/models`,
            summary: "缺少已托管 API Key，无法执行远端探测",
            statusCode: "CONNECTION_FAILED",
            statusParams: { error: "API_KEY_MISSING" },
            requestHeaders: { accept: "application/json", "x-voxward-action": input.action },
            responseHeaders: {},
            rawRequestBody: null,
            rawResponseBody: JSON.stringify({ ok: false, error: "API_KEY_MISSING" }),
          };
        }
        const probe = await probeOpenAiCompatEndpoint({
          baseUrl: baseEndpoint,
          apiKey,
          fetchImpl,
        });
        const models = probe.models ?? [];
        const isFetchModels = input.action === "fetch-models";
        return {
          ok: probe.ok,
          httpStatus: probe.ok ? 200 : 502,
          upstreamStatusCode: probe.statusCode,
          latencyMs: probe.latencyMs,
          method: "GET",
          url: probe.url,
          summary: probe.ok
            ? isFetchModels
              ? `已从远端拉取 ${models.length} 个可用模型`
              : `端点连通正常（HTTP ${probe.statusCode}）`
            : `端点探测失败（${probe.errorCode ?? `HTTP_${probe.statusCode}`}）`,
          statusCode: probe.ok ? (isFetchModels ? "MODELS_FETCHED" : "CONNECTION_OK") : "CONNECTION_FAILED",
          statusParams: probe.ok
            ? isFetchModels
              ? { count: models.length }
              : { statusCode: probe.statusCode }
            : { error: probe.errorCode ?? "PROBE_FAILED" },
          ...(probe.ok && isFetchModels ? { fetchedModels: models } : {}),
          requestHeaders: {
            accept: "application/json",
            authorization: "[REDACTED]",
            "x-voxward-action": input.action,
          },
          responseHeaders: { "content-type": "application/json; charset=utf-8" },
          rawRequestBody: null,
          rawResponseBody: probe.rawBodyPreview ?? JSON.stringify({ ok: probe.ok, error: probe.errorCode ?? null }),
        };
      }

      if (input.driverId === "anthropic-compat") {
        const apiKey = input.resolvedSecrets.apiKey ?? "";
        const baseEndpoint = typeof input.config.baseEndpoint === "string" ? input.config.baseEndpoint : undefined;
        const anthropicVersion =
          typeof input.config.anthropicVersion === "string" && input.config.anthropicVersion
            ? input.config.anthropicVersion
            : undefined;
        if (!apiKey) {
          return {
            ok: false,
            httpStatus: 400,
            upstreamStatusCode: 0,
            latencyMs: elapsed(),
            method: "GET",
            url: `${(baseEndpoint || "https://api.anthropic.com").replace(/\/+$/, "")}/v1/models`,
            summary: "缺少已托管 API Key，无法执行远端探测",
            statusCode: "CONNECTION_FAILED",
            statusParams: { error: "API_KEY_MISSING" },
            requestHeaders: { accept: "application/json", "x-voxward-action": input.action },
            responseHeaders: {},
            rawRequestBody: null,
            rawResponseBody: JSON.stringify({ ok: false, error: "API_KEY_MISSING" }),
          };
        }
        const probe = await probeAnthropicCompatEndpoint({
          baseUrl: baseEndpoint,
          apiKey,
          anthropicVersion,
          fetchImpl,
        });
        const models = probe.models ?? [];
        const isFetchModels = input.action === "fetch-models";
        return {
          ok: probe.ok,
          httpStatus: probe.ok ? 200 : 502,
          upstreamStatusCode: probe.statusCode,
          latencyMs: probe.latencyMs,
          method: "GET",
          url: probe.url,
          summary: probe.ok
            ? isFetchModels
              ? `已从远端拉取 ${models.length} 个可用模型`
              : `端点连通正常（HTTP ${probe.statusCode}）`
            : `端点探测失败（${probe.errorCode ?? `HTTP_${probe.statusCode}`}）`,
          statusCode: probe.ok ? (isFetchModels ? "MODELS_FETCHED" : "CONNECTION_OK") : "CONNECTION_FAILED",
          statusParams: probe.ok
            ? isFetchModels
              ? { count: models.length }
              : { statusCode: probe.statusCode }
            : { error: probe.errorCode ?? "PROBE_FAILED" },
          ...(probe.ok && isFetchModels ? { fetchedModels: models } : {}),
          requestHeaders: {
            accept: "application/json",
            "x-api-key": "[REDACTED]",
            "x-voxward-action": input.action,
          },
          responseHeaders: { "content-type": "application/json; charset=utf-8" },
          rawRequestBody: null,
          rawResponseBody: probe.rawBodyPreview ?? JSON.stringify({ ok: probe.ok, error: probe.errorCode ?? null }),
        };
      }

      if (input.driverId === "kiro-cli") {
        const command =
          (typeof input.config.command === "string" && input.config.command.trim()) ||
          options.kiroCommand ||
          "kiro-cli";
        const runtimeRoot =
          (typeof input.config.runtimeRoot === "string" && input.config.runtimeRoot.trim()) ||
          options.kiroRuntimeRoot;

        if (input.action === "cleanup-orphans") {
          if (!runtimeRoot) {
            return {
              ok: false,
              httpStatus: 400,
              upstreamStatusCode: 0,
              latencyMs: elapsed(),
              method: "POST",
              url: "kiro-cli://runtime/cleanup-orphans",
              summary: "未配置 KIRO_RUNTIME_ROOT，无法清理孤儿目录",
              statusCode: "ACTION_FAILED",
              statusParams: { error: "RUNTIME_ROOT_MISSING" },
              requestHeaders: { "x-voxward-action": input.action },
              responseHeaders: {},
              rawRequestBody: JSON.stringify({ action: input.action }),
              rawResponseBody: JSON.stringify({ ok: false, error: "RUNTIME_ROOT_MISSING" }),
            };
          }
          const report = await sweepOrphanRunDirectories({
            runtimeRoot,
            now: new Date(),
            kiroCli: {
              command,
              env: {
                PATH: process.env.PATH ?? "",
                HOME:
                  (typeof input.config.runtimeHome === "string" && input.config.runtimeHome) || process.env.HOME || "",
                ...(input.resolvedSecrets.kiroApiKey ? { KIRO_API_KEY: input.resolvedSecrets.kiroApiKey } : {}),
              },
            },
          });
          return {
            ok: true,
            httpStatus: 200,
            upstreamStatusCode: 200,
            latencyMs: elapsed(),
            method: "POST",
            url: "kiro-cli://runtime/cleanup-orphans",
            summary: `已清理 ${report.removed} 个孤儿目录`,
            statusCode: "ORPHANS_CLEANED",
            statusParams: { removed: report.removed, manualAction: report.manualAction },
            requestHeaders: { "x-voxward-action": input.action },
            responseHeaders: { "content-type": "application/json; charset=utf-8" },
            rawRequestBody: JSON.stringify({ action: input.action }),
            rawResponseBody: JSON.stringify({
              ok: true,
              removed: report.removed,
              manualAction: report.manualAction,
            }),
          };
        }

        const cliCheck = await runCliVersion(command);
        if (input.action === "fetch-models") {
          const caps = describeKiroCli();
          const models: RemoteModelSummary[] = (caps.models ?? []).map((m) => ({
            modelId: m.modelId,
            displayName: m.modelId,
            reasoningLevels: m.reasoningLevels,
            source: "remote" as const,
          }));
          return {
            ok: cliCheck.ok,
            httpStatus: cliCheck.ok ? 200 : 502,
            upstreamStatusCode: cliCheck.ok ? 200 : 0,
            latencyMs: elapsed(),
            method: "GET",
            url: "kiro-cli://runtime/models",
            summary: cliCheck.ok
              ? `CLI 就绪（${cliCheck.version ?? "ok"}），返回 ${models.length} 个声明模型`
              : `CLI 不可用（${cliCheck.errorCode ?? "CLI_EXEC_FAILED"}）`,
            statusCode: cliCheck.ok ? "MODELS_FETCHED" : "CLI_FAILED",
            statusParams: cliCheck.ok ? { count: models.length } : { error: cliCheck.errorCode ?? "CLI_EXEC_FAILED" },
            ...(cliCheck.ok ? { fetchedModels: models } : {}),
            requestHeaders: { "x-voxward-action": input.action },
            responseHeaders: { "content-type": "application/json; charset=utf-8" },
            rawRequestBody: null,
            rawResponseBody: JSON.stringify({
              ok: cliCheck.ok,
              version: cliCheck.version ?? null,
              modelCount: models.length,
              error: cliCheck.errorCode ?? null,
            }),
          };
        }

        return {
          ok: cliCheck.ok,
          httpStatus: cliCheck.ok ? 200 : 502,
          upstreamStatusCode: cliCheck.ok ? 200 : 0,
          latencyMs: elapsed(),
          method: "POST",
          url: "kiro-cli://runtime/self-check",
          summary: cliCheck.ok
            ? `Kiro CLI 自检通过（${cliCheck.version ?? "ok"}）`
            : `Kiro CLI 自检失败（${cliCheck.errorCode ?? "CLI_EXEC_FAILED"}）`,
          statusCode: cliCheck.ok ? "CLI_OK" : "CLI_FAILED",
          statusParams: cliCheck.ok
            ? { version: cliCheck.version ?? "ok" }
            : { error: cliCheck.errorCode ?? "CLI_EXEC_FAILED" },
          requestHeaders: { "x-voxward-action": input.action },
          responseHeaders: { "content-type": "application/json; charset=utf-8" },
          rawRequestBody: JSON.stringify({ action: input.action }),
          rawResponseBody: JSON.stringify({
            ok: cliCheck.ok,
            version: cliCheck.version ?? null,
            error: cliCheck.errorCode ?? null,
          }),
        };
      }

      // youtube-live-v3
      const url = "https://www.googleapis.com/youtube/v3/liveBroadcasts?part=id,status&mine=true";
      const accessToken = input.resolvedSecrets.refreshToken || input.resolvedSecrets.accessToken || "";
      if (!accessToken) {
        return {
          ok: false,
          httpStatus: 400,
          upstreamStatusCode: 0,
          latencyMs: elapsed(),
          method: "GET",
          url,
          summary: "YouTube 凭据尚未完成 OAuth 授权",
          statusCode: "CONNECTION_FAILED",
          statusParams: { error: "YOUTUBE_NOT_AUTHORIZED" },
          requestHeaders: { accept: "application/json", "x-voxward-action": input.action },
          responseHeaders: {},
          rawRequestBody: null,
          rawResponseBody: JSON.stringify({ ok: false, error: "YOUTUBE_NOT_AUTHORIZED" }),
        };
      }
      try {
        const res = await fetchImpl(url, {
          method: "GET",
          headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
        });
        const bodyText = await res.text();
        return {
          ok: res.ok,
          httpStatus: res.ok ? 200 : 502,
          upstreamStatusCode: res.status,
          latencyMs: elapsed(),
          method: "GET",
          url,
          summary: res.ok ? `YouTube API 连接正常（HTTP ${res.status}）` : `YouTube API 拒绝（HTTP ${res.status}）`,
          statusCode: res.ok ? "CONNECTION_OK" : "CONNECTION_FAILED",
          statusParams: { statusCode: res.status },
          requestHeaders: { accept: "application/json", authorization: "[REDACTED]", "x-voxward-action": input.action },
          responseHeaders: { "content-type": res.headers.get("content-type") ?? "application/json" },
          rawRequestBody: null,
          rawResponseBody: bodyText.slice(0, 512),
        };
      } catch {
        return {
          ok: false,
          httpStatus: 502,
          upstreamStatusCode: 0,
          latencyMs: elapsed(),
          method: "GET",
          url,
          summary: "YouTube API 网络请求失败",
          statusCode: "CONNECTION_FAILED",
          statusParams: { error: "NETWORK_ERROR" },
          requestHeaders: { accept: "application/json", authorization: "[REDACTED]", "x-voxward-action": input.action },
          responseHeaders: {},
          rawRequestBody: null,
          rawResponseBody: JSON.stringify({ ok: false, error: "NETWORK_ERROR" }),
        };
      }
    },

    async syncYouTubeBan(input: YouTubeBanSyncRequest): Promise<YouTubeBanSyncResult> {
      if (!input.accessToken || !input.liveChatId) {
        return { synced: false, banId: null, errorCode: "YOUTUBE_NOT_CONFIGURED" };
      }
      try {
        const res = await fetchImpl("https://www.googleapis.com/youtube/v3/liveChat/bans?part=snippet", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            authorization: `Bearer ${input.accessToken}`,
          },
          body: JSON.stringify({
            snippet: {
              liveChatId: input.liveChatId,
              type: "permanent",
              bannedUserDetails: { channelId: input.subjectRef },
            },
          }),
        });
        if (!res.ok) {
          return { synced: false, banId: null, errorCode: `HTTP_${res.status}`, httpStatus: res.status };
        }
        const data = (await res.json()) as { id?: unknown };
        return {
          synced: true,
          banId: typeof data.id === "string" && data.id.length > 0 ? data.id : null,
          httpStatus: res.status,
        };
      } catch {
        return { synced: false, banId: null, errorCode: "NETWORK_ERROR" };
      }
    },
  };
}
