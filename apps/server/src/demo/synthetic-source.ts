import { readLegacyScPayment, type IdentityKind, type ScPayment } from "@voxward/contracts";

export const SANDBOX_CHANNEL_ID = "sandbox-ch-01";
export const SANDBOX_BANNER = "SYNTHETIC SANDBOX · 合成演示环境（非真实平台数据）";

export type ScenarioId =
  | "normal-scoring"
  | "spam-toxicity-block"
  | "superchat-translation"
  | "manual-review"
  | "privacy-delete"
  | "privacy-delete-and-except";

export interface SyntheticChatEvent {
  readonly messageId: string;
  readonly channelId: string;
  readonly subjectKey: string;
  readonly displayName: string;
  readonly identityKind: IdentityKind;
  readonly text: string;
  readonly isPaid: boolean;
  readonly amountDisplay: string | null;
  readonly scPayment?: ScPayment;
  readonly language?: string;
  readonly translationText: string | null;
  readonly receivedAt: string;
  readonly scenarioTag: ScenarioId | "custom";
}

export interface SyntheticSubjectSeed {
  readonly id: string;
  readonly subjectKey: string;
  readonly displayName: string;
  readonly initialScore: number;
  readonly identityKind: IdentityKind;
}

export const SANDBOX_SUBJECT_SEEDS: readonly SyntheticSubjectSeed[] = [
  {
    id: "sbx-sub-alice",
    subjectKey: "demo-viewer-alice",
    displayName: "Alice (Demo)",
    initialScore: 10,
    identityKind: "VERIFIED_ACCOUNT",
  },
  {
    id: "sbx-sub-bob",
    subjectKey: "demo-viewer-bob",
    displayName: "Bob (Demo)",
    initialScore: 5,
    identityKind: "UNKNOWN",
  },
  {
    id: "sbx-sub-hana",
    subjectKey: "demo-viewer-hana",
    displayName: "Hana (Demo)",
    initialScore: 25,
    identityKind: "PAID_MEMBER",
  },
  {
    id: "sbx-sub-charlie",
    subjectKey: "demo-viewer-charlie",
    displayName: "Charlie (Demo)",
    initialScore: 5,
    identityKind: "VERIFIED_ACCOUNT",
  },
];

export function buildScenarioEvent(
  scenario: Exclude<ScenarioId, "privacy-delete" | "privacy-delete-and-except">,
  seq: number,
  nowIso: string,
): SyntheticChatEvent {
  switch (scenario) {
    case "normal-scoring":
      return {
        messageId: `sbx-msg-normal-${seq}`,
        channelId: SANDBOX_CHANNEL_ID,
        subjectKey: "demo-viewer-alice",
        displayName: "Alice (Demo)",
        identityKind: "VERIFIED_ACCOUNT",
        text: "Hello streamer! Great stream today, keep it up!",
        isPaid: false,
        amountDisplay: null,
        translationText: null,
        receivedAt: nowIso,
        scenarioTag: "normal-scoring",
      };
    case "spam-toxicity-block":
      return {
        messageId: `sbx-msg-spam-${seq}`,
        channelId: SANDBOX_CHANNEL_ID,
        subjectKey: "demo-viewer-bob",
        displayName: "Bob (Demo)",
        identityKind: "UNKNOWN",
        text: "Click free crypto spam-link-xyz toxic-abuse now!",
        isPaid: false,
        amountDisplay: null,
        translationText: null,
        receivedAt: nowIso,
        scenarioTag: "spam-toxicity-block",
      };
    case "superchat-translation":
      return {
        messageId: `sbx-msg-sc-${seq}`,
        channelId: SANDBOX_CHANNEL_ID,
        subjectKey: "demo-viewer-hana",
        displayName: "Hana (Demo)",
        identityKind: "PAID_MEMBER",
        text: "神回ありがとう！これからも応援しています",
        isPaid: true,
        amountDisplay: "$10.00",
        scPayment: { amountMicros: 10_000_000, currency: "USD", tier: 4 },
        translationText: "Thanks for the awesome stream! Supporting you always!",
        receivedAt: nowIso,
        scenarioTag: "superchat-translation",
      };
    case "manual-review":
      return {
        messageId: `sbx-msg-review-${seq}`,
        channelId: SANDBOX_CHANNEL_ID,
        subjectKey: "demo-viewer-charlie",
        displayName: "Charlie (Demo)",
        identityKind: "VERIFIED_ACCOUNT",
        text: "Wait check this link maybe for fanart?",
        isPaid: false,
        amountDisplay: null,
        translationText: null,
        receivedAt: nowIso,
        scenarioTag: "manual-review",
      };
  }
}

export function buildCustomSyntheticEvent(
  input: {
    readonly subjectKey: string;
    readonly text: string;
    readonly isPaid?: boolean;
    readonly amountDisplay?: string | null;
    readonly translationText?: string | null;
    readonly language?: string;
  },
  seq: number,
  nowIso: string,
): SyntheticChatEvent {
  const isPaid = input.isPaid ?? false;
  const amountDisplay = input.amountDisplay !== undefined ? input.amountDisplay : isPaid ? "$5.00" : null;
  const scPayment = isPaid && amountDisplay !== null ? readLegacyScPayment(amountDisplay) : null;
  return {
    messageId: `sbx-msg-custom-${seq}`,
    channelId: SANDBOX_CHANNEL_ID,
    subjectKey: input.subjectKey,
    displayName: input.subjectKey,
    identityKind: "UNKNOWN",
    text: input.text,
    isPaid,
    amountDisplay,
    ...(scPayment === null ? {} : { scPayment }),
    translationText: input.translationText ?? null,
    ...(input.language === undefined ? {} : { language: input.language }),
    receivedAt: nowIso,
    scenarioTag: "custom",
  };
}
