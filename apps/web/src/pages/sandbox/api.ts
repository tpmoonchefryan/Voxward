export type DemoRole =
  | "DEMO_STREAMER"
  | "DEMO_MODERATOR"
  | "DEMO_PRIVACY_AUDITOR"
  | "DEMO_STAGE_VIEWER";

export type ScenarioId =
  | "normal-scoring"
  | "spam-toxicity-block"
  | "superchat-translation"
  | "manual-review"
  | "privacy-delete"
  | "privacy-delete-and-except";

export interface SandboxSubjectView {
  readonly subjectId: string;
  readonly subjectKey: string;
  readonly currentScore: number;
  readonly processingGeneration: number;
  readonly hasException: boolean;
}

export interface SandboxReviewItem {
  readonly taskId: string;
  readonly eventId: string;
  readonly correlationId: string;
  readonly subjectRef: string;
  readonly kind: string;
  readonly status: string;
  readonly originalText: string | null;
}

export interface SandboxBlockedItem {
  readonly eventId: string;
  readonly correlationId: string;
  readonly subjectRef: string;
  readonly classification: string;
  readonly originalText: string | null;
}

export interface SandboxApprovedStageItem {
  readonly eventId: string;
  readonly correlationId: string;
  readonly subjectKey: string;
  readonly text: string;
  readonly translation: string | null;
  readonly decidedAt: string;
}

export interface SandboxLogEntry {
  readonly id: string;
  readonly summary?: string;
  readonly changeKind?: string;
  readonly stage?: string;
  readonly status?: string;
  readonly correlationId: string | null;
}

export interface SandboxDataRequestEntry {
  readonly id: string;
  readonly subjectId: string;
  readonly kind: string;
  readonly mode: string | null;
  readonly executionState: string;
}

export interface SandboxSnapshot {
  readonly banner: string;
  readonly syntheticOnly: true;
  readonly channelId: string;
  readonly subjects: readonly SandboxSubjectView[];
  readonly reviewQueue: readonly SandboxReviewItem[];
  readonly blockedItems: readonly SandboxBlockedItem[];
  readonly approvedStage: readonly SandboxApprovedStageItem[];
  readonly changeLogs: readonly SandboxLogEntry[];
  readonly technicalLogs: readonly SandboxLogEntry[];
  readonly dataRequests: readonly SandboxDataRequestEntry[];
  readonly cacheEntryCount: number;
}

export interface SandboxStateResponse {
  readonly role: DemoRole;
  readonly capabilities: readonly string[];
  readonly snapshot: SandboxSnapshot;
}

export interface SandboxApi {
  getState(role: DemoRole): Promise<SandboxStateResponse>;
  runScenario(role: DemoRole, scenario: ScenarioId, subjectKey?: string): Promise<SandboxSnapshot>;
  decideReview(role: DemoRole, taskId: string, classification: "ALLOW" | "BLOCK"): Promise<SandboxSnapshot>;
  reset(role: DemoRole): Promise<SandboxSnapshot>;
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP_${res.status}`);
  }
  return (await res.json()) as T;
}

export function createSandboxApi(baseUrl = "", fetchImpl: typeof fetch = fetch): SandboxApi {
  return {
    async getState(role) {
      const res = await fetchImpl(`${baseUrl}/sandbox-api/state`, {
        headers: { "x-demo-role": role },
      });
      return readJson<SandboxStateResponse>(res);
    },
    async runScenario(role, scenario, subjectKey) {
      const res = await fetchImpl(`${baseUrl}/sandbox-api/scenarios`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-role": role },
        body: JSON.stringify(subjectKey ? { scenario, subjectKey } : { scenario }),
      });
      const data = await readJson<{ snapshot: SandboxSnapshot }>(res);
      return data.snapshot;
    },
    async decideReview(role, taskId, classification) {
      const res = await fetchImpl(`${baseUrl}/sandbox-api/review/${encodeURIComponent(taskId)}/decide`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-role": role },
        body: JSON.stringify({ classification }),
      });
      const data = await readJson<{ snapshot: SandboxSnapshot }>(res);
      return data.snapshot;
    },
    async reset(role) {
      const res = await fetchImpl(`${baseUrl}/sandbox-api/reset`, {
        method: "POST",
        headers: { "x-demo-role": role },
      });
      const data = await readJson<{ snapshot: SandboxSnapshot }>(res);
      return data.snapshot;
    },
  };
}
