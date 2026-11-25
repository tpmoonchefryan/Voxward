import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DELETE_ACTIONS_COPY, REQUEST_STATUS_COPY, VOXWARD_SUPPORTED_LOCALES } from "../../../i18n";
import { ApiFailure, messageFor } from "../api";
import type { RequestView, SubjectPanel } from "../api";
import { DataPanelView, type DataPanelViewProps } from "../DataPanel";
import { DeleteActions, MODE_COPY } from "../DeleteActions";
import { IDLE_FLOW, type DeleteFlow } from "../flow";
import { STAGE_TEXT } from "../RequestStatus";

function requestView(overrides: Partial<RequestView> & Pick<RequestView, "requestId" | "stage">): RequestView {
  return {
    subjectRef: "subject-1",
    kind: "DELETE",
    mode: "DELETE_DATA_ONLY",
    requestSource: "OPERATOR_INITIATED",
    verification: { state: "PENDING", method: null, decidedAt: null },
    execution: "PENDING",
    targets: [],
    counts: { done: 0, failed: 0, pending: 0 },
    createdAt: "2026-11-10T10:00:00.000Z",
    updatedAt: "2026-11-10T10:00:00.000Z",
    ...overrides,
  };
}

const SUBJECT: SubjectPanel = {
  subjectRef: "subject-1",
  currentScore: 12,
  identity: { kind: "MODERATOR", effectiveFrom: "2026-11-10T10:00:00.000Z" },
  list: null,
  exception: { active: true, createdAt: "2026-11-10T10:00:00.000Z" },
  ledgerEntryCount: 1,
  retention: [{ category: "TECHNICAL_LOG", count: 1, retentionDays: 30 }],
  requests: [requestView({ requestId: "req-1", stage: "AWAITING_VERIFICATION" })],
  notices: ["PROVIDER_COPY_NOT_CONTROLLED"],
};

it("uses French notation in the deletion action and request labels", () => {
  expect(DELETE_ACTIONS_COPY.fr.modes.DELETE_AND_EXCEPT.label).toBe("Effacer et exclure de la notation");
  expect(JSON.stringify(REQUEST_STATUS_COPY.fr)).not.toMatch(/\bscoring\b/iu);
});

it.each([
  ["fr", "Identifiant du spectateur", "Cette action n’est pas disponible sur cette page."],
  ["ko", "시청자 고유 식별자", "이 페이지에서는 이 작업을 사용할 수 없습니다."],
] as const)("renders the data lookup and unavailable route notice in %s", (locale, label, notice) => {
  const html = panel({ locale, message: messageFor(new ApiFailure(404, "NOT_FOUND"), locale) });
  expect(html).toContain(label);
  expect(html).toContain(notice);
  expect(html).not.toContain("Subject Ref");
});

function panel(overrides: Partial<DataPanelViewProps> = {}): string {
  const props: DataPanelViewProps = {
    channelId: "channel-1",
    dataHandle: true,
    query: "subject-1",
    subject: SUBJECT,
    flow: IDLE_FLOW,
    message: null,
    onQueryChange: () => undefined,
    onLookup: () => undefined,
    onChoose: () => undefined,
    onConfirm: () => undefined,
    onCancel: () => undefined,
    onVerify: () => undefined,
    ...overrides,
  };
  return renderToStaticMarkup(<DataPanelView {...props} />);
}

describe("data panel without data.handle (VW-SUB034-AC001: no operations for a user without the permission)", () => {
  it("shows the refusal and no lookup, subject, deletion or verification action", () => {
    const html = panel({ dataHandle: false, subject: SUBJECT, flow: IDLE_FLOW });
    expect(html).toContain("Current account lacks data compliance permission");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("Subject Profile");
    expect(html).not.toContain("Erase stored data only");
    expect(html).not.toContain("Verify: Account Ownership");
  });

  it("shows nothing about a subject while the capability is still being read", () => {
    const html = panel({ dataHandle: null, subject: SUBJECT });
    expect(html).toContain("Checking permission");
    expect(html).not.toContain("Erase stored data only");
  });
});

describe("data panel with data.handle", () => {
  it("switches retention categories and grouping to the selected French locale", () => {
    const subject = { ...SUBJECT, ledgerEntryCount: 12345, retention: [{ category: "TECHNICAL_LOG", count: 12345, retentionDays: 30 }] };
    const french = panel({ locale: "fr", subject });
    const english = panel({ locale: "en", subject });
    expect(french).toContain("Journaux techniques");
    expect(french).toContain(new Intl.NumberFormat("fr").format(12345));
    expect(french).not.toContain("TECHNICAL_LOG");
    expect(english).toContain("Technical logs");
    expect(english).toContain("12,345");
  });

  it("shows both deletion entries, what each does, and the minimal preference note", () => {
    const html = panel();
    expect(html).toContain("Erase stored data only");
    expect(html).toContain("Erase data &amp; add score exception");
    expect(html).toContain(MODE_COPY.DELETE_DATA_ONLY.effect);
    expect(html).toContain(MODE_COPY.DELETE_AND_EXCEPT.effect);
    expect(html).toContain("minimal preference record");
    expect(html).toContain("Registration itself removes no data");
  });

  it("states that registration does not delete data, and that the external copy is not controlled", () => {
    const html = panel();
    expect(html).toContain("YouTube original messages and platform copies are outside this instance");
    expect(html).not.toContain("已删除");
  });

  it("offers verification only for a request that awaits it, and never sends a nickname", () => {
    const html = panel({
      subject: {
        ...SUBJECT,
        requests: [
          requestView({ requestId: "req-1", stage: "AWAITING_VERIFICATION" }),
          requestView({
            requestId: "req-2",
            stage: "AWAITING_EXECUTION",
            verification: { state: "VERIFIED", method: "ACCOUNT_OWNERSHIP", decidedAt: "2026-11-10T10:00:00.000Z" },
          }),
        ],
      },
    });
    expect(html.match(/<button[^>]*>[\s\S]*?Verify: Account Ownership/g)?.length).toBe(1);
    expect(html).toContain(STAGE_TEXT.AWAITING_EXECUTION);
    expect(html).not.toMatch(/nickname/i);
  });

  it("renders identifiers as untrusted text inside bdi, with markup escaped", () => {
    const hostile = "<img src=x onerror=alert(1)>";
    const html = panel({
      subject: { ...SUBJECT, requests: [requestView({ requestId: hostile, stage: "AWAITING_VERIFICATION" })] },
    });
    expect(html).toContain("<bdi>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("shows the chosen option and a refusal reason in fixed text", () => {
    const flow: DeleteFlow = { phase: "confirming", mode: "DELETE_AND_EXCEPT", errorCode: "FORBIDDEN" };
    const html = panel({ flow });
    expect(html).toContain("Register request: Erase data &amp; add score exception");
    expect(html).toContain("Current account has no data compliance permission for this operation.");
  });

  it("shows the registered state as pending verification, not as deleted", () => {
    const html = renderToStaticMarkup(
      <DeleteActions
        flow={{ phase: "registered", mode: "DELETE_DATA_ONLY", requestId: "req-1" }}
        onChoose={() => undefined}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(html).toContain("Request registered; status: Pending Verification. No data has been removed yet.");
    expect(html).not.toContain("Erase stored data only");
  });

  it("no stage text across any locale claims that a deletion has finished", () => {
    for (const loc of VOXWARD_SUPPORTED_LOCALES) {
      for (const text of Object.values(REQUEST_STATUS_COPY[loc].stages)) {
        expect(text).not.toMatch(/已删除|删除完成|All data deleted/i);
      }
    }
  });
});
