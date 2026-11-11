import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LogViewerTechnicalDetail } from "@voxward/contracts";
import { JsonPanelView, formatValidatedJson } from "../JsonPanel";

/*
 * VW-SUB032-AC001 (detail): the validated JSON is folded by default and names its task, model and contract versions.
 * A content kind the reader may not see is not rendered at all.
 */

const JSON_PAYLOAD = JSON.stringify({ itemId: "item-1", classification: "ALLOW" });

function detailWith(evidence: LogViewerTechnicalDetail["evidence"]): LogViewerTechnicalDetail {
  return {
    id: "log-1",
    channelId: "channel-1",
    correlationId: "corr-1",
    sequence: 1,
    occurredAt: "2026-11-10T10:00:00.000Z",
    contractVersion: "1",
    stage: "JSON_VALIDATE",
    status: "OK",
    level: "INFO",
    subjectRef: "subject-1",
    batchId: "batch-1",
    taskId: "task-1",
    attempt: null,
    errorCode: null,
    providerRef: "provider-synthetic",
    modelRef: "model-synthetic",
    ruleTemplateVersion: "rules-synthetic-1",
    latencyMs: 9,
    data: { validation: "PASSED", latencyMs: 9 },
    evidence,
  };
}

describe("validated JSON panel", () => {
  it("folds the JSON by default and shows its task, model and contract versions", () => {
    const html = renderToStaticMarkup(
      <JsonPanelView detail={detailWith([{ kind: "VALIDATED_JSON", state: "AVAILABLE", payload: JSON_PAYLOAD }])} />,
    );

    expect(html).toContain("task-1");
    expect(html).toContain("model-synthetic");
    expect(html).toContain("契约版本");
    expect(html).toContain("rules-synthetic-1");
    expect(html).toMatch(/<details><summary>校验后 JSON<\/summary>/);
    expect(html).not.toMatch(/<details[^>]*\sopen/);
  });

  it("pretty-prints the validated JSON and names a payload that does not parse", () => {
    expect(formatValidatedJson(JSON_PAYLOAD)).toEqual({
      text: JSON.stringify({ itemId: "item-1", classification: "ALLOW" }, null, 2),
      parsed: true,
    });
    expect(formatValidatedJson("{not json")).toEqual({ text: "{not json", parsed: false });

    const html = renderToStaticMarkup(
      <JsonPanelView detail={detailWith([{ kind: "VALIDATED_JSON", state: "AVAILABLE", payload: "{not json" }])} />,
    );
    expect(html).toContain("未通过 JSON 解析");
  });

  it("shows expired content as expired, with no payload", () => {
    const html = renderToStaticMarkup(
      <JsonPanelView detail={detailWith([{ kind: "VALIDATED_JSON", state: "EXPIRED", payload: null }])} />,
    );

    expect(html).toContain("内容已到期");
    expect(html).not.toContain("item-1");
  });

  it("renders no content section for a kind the reader may not see", () => {
    const html = renderToStaticMarkup(<JsonPanelView detail={detailWith([])} />);

    expect(html).not.toContain("校验后 JSON");
    expect(html).not.toContain("消息原文");
    expect(html).toContain("task-1");
  });

  it("does not show a content section for a kind the reader may not see, next to one they may", () => {
    const html = renderToStaticMarkup(
      <JsonPanelView detail={detailWith([{ kind: "VALIDATED_JSON", state: "AVAILABLE", payload: JSON_PAYLOAD }])} />,
    );

    expect(html).toContain("校验后 JSON");
    expect(html).not.toContain("消息原文");
    expect(html).not.toContain("译文");
  });
});
