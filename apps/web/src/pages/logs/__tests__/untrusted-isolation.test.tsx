import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IsolatedText } from "../IsolatedText";
import { JsonPanelView } from "../JsonPanel";

/*
 * Q15: bidi and zero-width characters stay in the text, and each piece of untrusted text is wrapped in <bdi>. Markup in
 * the text stays text. The control characters that S003 already removes stay removed.
 */

const RLO = "\u202E";
const ZWSP = "\u200B";
const LRI = "\u2067";
const PDI = "\u2069";

describe("untrusted text in the log viewer", () => {
  it("wraps the text in <bdi> and keeps its bidi and zero-width characters", () => {
    const text = `invoice${RLO}gpj.exe${ZWSP}done${LRI}x${PDI}`;

    const html = renderToStaticMarkup(<IsolatedText text={text} />);

    expect(html.startsWith("<bdi>")).toBe(true);
    expect(html).toContain(RLO);
    expect(html).toContain(ZWSP);
    expect(html).toContain(LRI);
    expect(html).toContain(PDI);
  });

  it("drops the C0 control characters that S003 removes, and keeps the visible text", () => {
    const html = renderToStaticMarkup(<IsolatedText text={"a\u0000b\u0007c"} />);

    expect(html).toContain("abc");
    expect(html).not.toContain("\u0000");
    expect(html).not.toContain("\u0007");
  });

  it("shows markup in a log summary as text", () => {
    const html = renderToStaticMarkup(<IsolatedText text={"<img src=x onerror=alert(1)>"} />);

    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("keeps the bidi characters of a validated JSON payload in the panel", () => {
    const payload = JSON.stringify({ reason: `ok${RLO}` });
    const html = renderToStaticMarkup(
      <JsonPanelView
        detail={{
          id: "log-1",
          channelId: "channel-1",
          correlationId: "corr-1",
          sequence: 0,
          occurredAt: "2026-11-10T10:00:00.000Z",
          contractVersion: "1",
          stage: "JSON_VALIDATE",
          status: "OK",
          level: "INFO",
          subjectRef: null,
          batchId: null,
          taskId: null,
          attempt: null,
          errorCode: null,
          providerRef: null,
          modelRef: null,
          ruleTemplateVersion: null,
          latencyMs: null,
          data: null,
          evidence: [{ kind: "VALIDATED_JSON", state: "AVAILABLE", payload }],
        }}
      />,
    );

    expect(html).toContain(RLO);
    expect(html).toContain("<pre><bdi>");
  });
});
