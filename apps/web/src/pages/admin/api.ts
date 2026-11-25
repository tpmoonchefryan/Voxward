import type { InferenceCapabilities, ListKind, ScLanguagePolicy, TermMatchKind } from "@voxward/contracts";
import type { FaultBanner } from "../dock/api";

export interface ChannelSummary {
  readonly channelId: string;
  readonly displayName: string;
  readonly platform: string;
  readonly role: string;
  readonly logAccess: boolean;
  readonly dataAdmin: boolean;
  readonly capabilities: readonly string[];
}

export interface ChannelContextView extends ChannelSummary {
  readonly faults: {
    readonly platformFault: FaultBanner | null;
    readonly modelFault: FaultBanner | null;
  };
}

export interface RuleIssueView {
  readonly code: string;
  readonly ref: string;
  readonly hint?: string;
}

export interface SettingsIssueView {
  readonly code: string;
  readonly path: string;
}

export interface RulesStateView {
  readonly version: number;
  readonly ruleSet: unknown;
  readonly terms: readonly {
    readonly id: string;
    readonly term: string;
    readonly matchKind: string;
    readonly language: string;
    readonly groupCode: string;
  }[];
  readonly entries: readonly {
    readonly id: string;
    readonly subjectId: string;
    readonly subjectKey: string;
    readonly listKind: string;
  }[];
}

export interface CandidateCardView {
  readonly id: string;
  readonly term: string;
  readonly note: string | null;
  readonly sourceCorrelationId: string;
  readonly status: "PENDING_CONFIRMATION" | "CONFIRMED" | "REJECTED";
  readonly ruleVersion: number | null;
}

export interface MemberView {
  readonly channelId: string;
  readonly accountId: string;
  readonly role: "CHANNEL_OWNER" | "MODERATOR" | "DATA_ADMIN";
  readonly logAccess: boolean;
  readonly dataAdmin: boolean;
  readonly grantedAt: string;
}

export interface ModelSelectionView {
  readonly modelId: string;
  readonly reasoning: string | null;
}

export interface ModelSettingsView {
  readonly realtimeModeration: ModelSelectionView | null;
  readonly scTranslation: ModelSelectionView | null;
  readonly review: ModelSelectionView | null;
  readonly scTranslationEnabled: boolean;
  readonly scLanguages?: ScLanguagePolicy;
}

export interface AdapterExtendedModelCapability {
  readonly modelId: string;
  readonly displayName?: string;
  readonly reasoningLevels: readonly string[];
}

export interface ModelSettingsResponseView {
  readonly settings: ModelSettingsView;
  readonly issues: readonly SettingsIssueView[];
  readonly capabilities: InferenceCapabilities & {
    readonly models?: readonly AdapterExtendedModelCapability[];
  };
  readonly modelFault: FaultBanner | null;
}

export interface AdminSettingsView {
  readonly scoring: {
    readonly initialScore: number;
    readonly minScore: number;
    readonly maxScore: number;
    readonly rewardDelta: number;
    readonly penaltyDelta: number;
  };
  readonly queue: {
    readonly realtimeConcurrency: number;
    readonly scConcurrency: number;
    readonly reviewBatchSize: number;
    readonly taskDeadlineMs: number;
  };
  readonly retention: {
    readonly changeLogDays: number;
    readonly technicalLogDays: number;
    readonly evidenceDays: number;
  };
}

export interface OutputsSummaryView {
  readonly grants: readonly {
    readonly grantId: string;
    readonly outputKind: string;
    readonly scope: string;
    readonly createdAt: string;
  }[];
  readonly tokens: readonly { readonly tokenId: string; readonly createdAt: string }[];
}

export interface TermCategoryView {
  readonly code: string;
  readonly label: string;
  readonly listKind: "BLACKLIST" | "WHITELIST";
  readonly description: string;
  readonly createdAt: string;
}

export interface ExtendedTermEntryView {
  readonly id: string;
  readonly listKind: "BLACKLIST" | "WHITELIST";
  readonly term: string;
  readonly categoryCode: string;
  readonly matchKind: "EXACT" | "CONTAINS" | "REGEX" | "NORMALIZED";
  readonly enabled: boolean;
  readonly language?: string;
  readonly action?: "BLOCK" | "REVIEW";
}

export interface WordlistVersionView {
  readonly version: number;
  readonly createdAt: string;
  readonly createdByRef: string;
}

export interface WordlistPreviewView {
  readonly hits: readonly string[];
  readonly whitelistMatches: readonly string[];
  readonly language: string;
  readonly action: "BLOCK" | "REVIEW" | null;
}

export interface CsvImportResultView {
  readonly imported: number;
  readonly errors: readonly { readonly line: number; readonly message: string }[];
  readonly entries: readonly ExtendedTermEntryView[];
  readonly version?: number;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class AdminApiFailure extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues?: readonly RuleIssueView[];
  readonly settingsIssues?: readonly SettingsIssueView[];

  constructor(
    status: number,
    code: string,
    issues?: readonly RuleIssueView[],
    settingsIssues?: readonly SettingsIssueView[],
  ) {
    super(code);
    this.name = "AdminApiFailure";
    this.status = status;
    this.code = code;
    this.issues = issues;
    this.settingsIssues = settingsIssues;
  }
}

export interface AdminApi {
  listChannels(): Promise<readonly ChannelSummary[]>;
  getContext(channelId: string): Promise<ChannelContextView>;
  getRules(channelId: string): Promise<RulesStateView>;
  publishRules(channelId: string, ruleSet: unknown): Promise<{ readonly version: number; readonly ruleSet: unknown }>;
  editSubjectList(channelId: string, subjectKey: string, listKind: ListKind | null): Promise<{ readonly status: string }>;
  editTerm(
    channelId: string,
    input: { readonly action: "ADD" | "RETIRE"; readonly term: string; readonly matchKind: TermMatchKind; readonly language: string; readonly groupCode: string },
  ): Promise<{ readonly status: string }>;
  listTermCategories(channelId: string): Promise<readonly TermCategoryView[]>;
  createTermCategory(
    channelId: string,
    input: { readonly code: string; readonly label: string; readonly listKind: "BLACKLIST" | "WHITELIST"; readonly description?: string },
  ): Promise<readonly TermCategoryView[]>;
  listTermEntries(channelId: string): Promise<readonly ExtendedTermEntryView[]>;
  listTermListVersions(channelId: string): Promise<readonly WordlistVersionView[]>;
  previewTermList(channelId: string, text: string, language?: string): Promise<WordlistPreviewView>;
  restoreTermList(channelId: string, version: number): Promise<{ readonly version: number; readonly createdAt: string; readonly entries: readonly ExtendedTermEntryView[] }>;
  saveTermEntries(channelId: string, entries: readonly ExtendedTermEntryView[]): Promise<readonly ExtendedTermEntryView[]>;
  importTermEntriesCsv(channelId: string, listKind: "BLACKLIST" | "WHITELIST", csvText: string): Promise<CsvImportResultView>;
  listCandidates(channelId: string): Promise<readonly CandidateCardView[]>;
  confirmCandidate(channelId: string, cardId: string): Promise<{ readonly card: CandidateCardView }>;
  rejectCandidate(channelId: string, cardId: string): Promise<{ readonly card: CandidateCardView }>;
  listMembers(channelId: string): Promise<readonly MemberView[]>;
  grantMember(
    channelId: string,
    input: { readonly accountId: string; readonly role: "CHANNEL_OWNER" | "MODERATOR" | "DATA_ADMIN"; readonly logAccess: boolean; readonly dataAdmin: boolean },
  ): Promise<MemberView>;
  revokeMember(channelId: string, accountId: string): Promise<void>;
  getModelSettings(channelId: string): Promise<ModelSettingsResponseView>;
  saveModelSettings(channelId: string, settings: ModelSettingsView): Promise<ModelSettingsResponseView>;
  getAdminSettings(channelId: string): Promise<AdminSettingsView>;
  saveAdminSettings(channelId: string, settings: AdminSettingsView): Promise<AdminSettingsView>;
  getOutputs(channelId: string): Promise<OutputsSummaryView>;
  issueOutputGrant(channelId: string): Promise<{ readonly grantId?: string; readonly credential?: string }>;
  revokeOutputGrant(channelId: string, grantId: string): Promise<void>;
  issueOutputToken(channelId: string): Promise<{ readonly id?: string; readonly token?: string }>;
  revokeOutputToken(channelId: string, tokenId: string): Promise<void>;
}

export function createAdminApi(fetcher: FetchLike = (input, init) => fetch(input, init)): AdminApi {
  let csrfToken: string | undefined;

  async function readBody(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  async function getJson<T>(url: string): Promise<T> {
    const response = await fetcher(url, { method: "GET", credentials: "same-origin", headers: { accept: "application/json" } });
    const body = await readBody(response);
    if (!response.ok) {
      const code = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "INTERNAL_ERROR";
      throw new AdminApiFailure(response.status, code);
    }
    return body as T;
  }

  async function currentCsrf(): Promise<string> {
    if (csrfToken === undefined) {
      const session = await getJson<{ csrfToken: string }>("/auth/session");
      csrfToken = session.csrfToken;
    }
    return csrfToken;
  }

  async function mutateJson<T>(method: "POST" | "PUT" | "DELETE", url: string, body?: unknown): Promise<T> {
    const response = await fetcher(url, {
      method,
      credentials: "same-origin",
      headers: {
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        accept: "application/json",
        "x-csrf-token": await currentCsrf(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const parsed = response.status === 204 ? undefined : await readBody(response);
    if (!response.ok) {
      const obj = typeof parsed === "object" && parsed !== null ? (parsed as { error?: unknown; issues?: unknown }) : undefined;
      const code = typeof obj?.error === "string" ? obj.error : "INTERNAL_ERROR";
      if (code === "CSRF_INVALID") csrfToken = undefined;
      const rawIssues = Array.isArray(obj?.issues) ? obj.issues : undefined;
      const ruleIssues = rawIssues?.filter(
        (item): item is RuleIssueView => typeof item === "object" && item !== null && "ref" in item,
      );
      const settingsIssues = rawIssues?.filter(
        (item): item is SettingsIssueView => typeof item === "object" && item !== null && "path" in item,
      );
      throw new AdminApiFailure(
        response.status,
        code,
        ruleIssues !== undefined && ruleIssues.length > 0 ? ruleIssues : undefined,
        settingsIssues !== undefined && settingsIssues.length > 0 ? settingsIssues : undefined,
      );
    }
    return parsed as T;
  }

  return {
    listChannels: async () => (await getJson<{ channels: ChannelSummary[] }>("/auth/channels")).channels,
    getContext: (channelId) => getJson(`/channels/${encodeURIComponent(channelId)}/context`),
    getRules: (channelId) => getJson(`/channels/${encodeURIComponent(channelId)}/rules`),
    publishRules: (channelId, ruleSet) => mutateJson("PUT", `/channels/${encodeURIComponent(channelId)}/rules`, ruleSet),
    editSubjectList: (channelId, subjectKey, listKind) =>
      mutateJson("POST", `/channels/${encodeURIComponent(channelId)}/lists/subjects`, { subjectKey, listKind }),
    editTerm: (channelId, input) => mutateJson("POST", `/channels/${encodeURIComponent(channelId)}/lists/terms`, input),
    listTermCategories: async (channelId) =>
      (await getJson<{ categories: TermCategoryView[] }>(`/channels/${encodeURIComponent(channelId)}/term-categories`)).categories,
    createTermCategory: async (channelId, input) =>
      (await mutateJson<{ categories: TermCategoryView[] }>("POST", `/channels/${encodeURIComponent(channelId)}/term-categories`, input)).categories,
    listTermEntries: async (channelId) =>
      (await getJson<{ entries: ExtendedTermEntryView[] }>(`/channels/${encodeURIComponent(channelId)}/term-entries`)).entries,
    listTermListVersions: async (channelId) =>
      (await getJson<{ versions: WordlistVersionView[] }>(`/channels/${encodeURIComponent(channelId)}/term-entries/versions`)).versions,
    previewTermList: (channelId, text, language) =>
      mutateJson("POST", `/channels/${encodeURIComponent(channelId)}/term-entries/preview`, { text, ...(language ? { language } : {}) }),
    restoreTermList: (channelId, version) =>
      mutateJson("POST", `/channels/${encodeURIComponent(channelId)}/term-entries/rollback`, { version }),
    saveTermEntries: async (channelId, entries) =>
      (await mutateJson<{ entries: ExtendedTermEntryView[] }>("PUT", `/channels/${encodeURIComponent(channelId)}/term-entries`, { entries })).entries,
    importTermEntriesCsv: (channelId, listKind, csvText) =>
      mutateJson("POST", `/channels/${encodeURIComponent(channelId)}/term-entries/import-csv`, { listKind, csvText }),
    listCandidates: async (channelId) =>
      (await getJson<{ cards: CandidateCardView[] }>(`/channels/${encodeURIComponent(channelId)}/candidates`)).cards,
    confirmCandidate: (channelId, cardId) =>
      mutateJson("POST", `/channels/${encodeURIComponent(channelId)}/candidates/${encodeURIComponent(cardId)}/confirm`),
    rejectCandidate: (channelId, cardId) =>
      mutateJson("POST", `/channels/${encodeURIComponent(channelId)}/candidates/${encodeURIComponent(cardId)}/reject`),
    listMembers: (channelId) => getJson(`/channels/${encodeURIComponent(channelId)}/members`),
    grantMember: (channelId, input) => mutateJson("POST", `/channels/${encodeURIComponent(channelId)}/members`, input),
    revokeMember: (channelId, accountId) =>
      mutateJson("DELETE", `/channels/${encodeURIComponent(channelId)}/members/${encodeURIComponent(accountId)}`),
    getModelSettings: (channelId) => getJson(`/channels/${encodeURIComponent(channelId)}/model-settings`),
    saveModelSettings: (channelId, settings) =>
      mutateJson("PUT", `/channels/${encodeURIComponent(channelId)}/model-settings`, settings),
    getAdminSettings: (channelId) => getJson(`/channels/${encodeURIComponent(channelId)}/admin-settings`),
    saveAdminSettings: (channelId, settings) =>
      mutateJson("PUT", `/channels/${encodeURIComponent(channelId)}/admin-settings`, settings),
    getOutputs: (channelId) => getJson(`/channels/${encodeURIComponent(channelId)}/outputs`),
    issueOutputGrant: (channelId) => mutateJson("POST", `/channels/${encodeURIComponent(channelId)}/output-grants`),
    revokeOutputGrant: (channelId, grantId) =>
      mutateJson("DELETE", `/channels/${encodeURIComponent(channelId)}/output-grants/${encodeURIComponent(grantId)}`),
    issueOutputToken: (channelId) => mutateJson("POST", `/channels/${encodeURIComponent(channelId)}/output-tokens`),
    revokeOutputToken: (channelId, tokenId) =>
      mutateJson("DELETE", `/channels/${encodeURIComponent(channelId)}/output-tokens/${encodeURIComponent(tokenId)}`),
  };
}
