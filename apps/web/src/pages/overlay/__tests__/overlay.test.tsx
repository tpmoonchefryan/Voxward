import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NATIVE_OUTPUT_PROTOCOL, NATIVE_OUTPUT_VERSION } from "@voxward/contracts";
import { StageView } from "../Stage";
import {
  buildOverlaySubprotocols,
  buildOverlayWsUrl,
  createInitialStageState,
  parseOverlayCredential,
  reduceStageFrame,
  SAFE_ANONYMOUS_ALIAS,
} from "../api";

describe("overlay pure protocol and StageView rendering (VW-Draft-01)", () => {
  it("parses hash credential cleanly and rejects query credential", () => {
    const queryResult = parseOverlayCredential({
      pathname: "/overlay/ch_1",
      search: "?token=secret",
      hash: "",
    });
    expect(queryResult.ok).toBe(false);
    if (!queryResult.ok) expect(queryResult.errorCode).toBe("QUERY_CREDENTIAL_REJECTED");

    const hashResult = parseOverlayCredential({
      pathname: "/overlay/ch_1",
      search: "",
      hash: "#cred=vwo_tok_abc12345",
    });
    expect(hashResult).toEqual({
      ok: true,
      credential: "vwo_tok_abc12345",
      cleanedUrl: "/overlay/ch_1",
    });

    expect(buildOverlayWsUrl({ protocol: "https:", host: "live.example.com" })).toBe(
      "wss://live.example.com/output/v1/room",
    );
    expect(buildOverlaySubprotocols("vwo_tok_abc12345")).toEqual([
      NATIVE_OUTPUT_PROTOCOL,
      "vw-cred.vwo_tok_abc12345",
    ]);
  });

  it("renders untrusted text in <bdi>, tiers SC cards (header-only <$2), uses safe alias, and retracts silently on WARD_BLOCKED", () => {
    let state = createInitialStageState("connected");
    state = reduceStageFrame(
      state,
      {
        type: "HELLO",
        version: NATIVE_OUTPUT_VERSION,
        protocol: NATIVE_OUTPUT_PROTOCOL,
        heartbeatMs: 15_000,
      },
      1_000,
    );
    state = reduceStageFrame(
      state,
      {
        type: "DELIVER",
        version: NATIVE_OUTPUT_VERSION,
        deliveryId: "del-chat-1",
        deliverySequence: 1,
        platformOrder: 10,
        validUntil: new Date(Date.now() + 60_000).toISOString(),
        display: {
          label: null,
          text: "<script>alert(1)</script>Happy Halloween!",
          translation: "万圣节快乐！",
        },
      },
      1_000,
    );
    state = reduceStageFrame(
      state,
      {
        type: "DELIVER",
        version: NATIVE_OUTPUT_VERSION,
        deliveryId: "del-sc-20",
        deliverySequence: 2,
        platformOrder: 11,
        validUntil: new Date(Date.now() + 60_000).toISOString(),
        display: {
          label: "SC $20",
          text: "Keep up the stream!",
          translation: "直播加油！",
        },
      },
      1_000,
    );
    state = reduceStageFrame(
      state,
      {
        type: "DELIVER",
        version: NATIVE_OUTPUT_VERSION,
        deliveryId: "del-sc-t1",
        deliverySequence: 3,
        platformOrder: 12,
        validUntil: new Date(Date.now() + 60_000).toISOString(),
        display: {
          label: "SC $1.50",
          text: "Should be hidden in t1 tier",
          translation: null,
        },
      },
      1_000,
    );

    state = reduceStageFrame(
      state,
      {
        type: "DELIVER",
        version: NATIVE_OUTPUT_VERSION,
        deliveryId: "del-sc-author-100",
        deliverySequence: 4,
        platformOrder: 13,
        validUntil: new Date(Date.now() + 60_000).toISOString(),
        display: {
          label: "Kaito_Tokyo · $100",
          text: "Amazing acoustic set!",
          translation: "超赞的不插电专场！",
        },
      },
      1_000,
    );

    const html = renderToStaticMarkup(<StageView state={state} />);
    expect(html).toContain(SAFE_ANONYMOUS_ALIAS);
    expect(html).toContain("<bdi>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;Happy Halloween!");
    expect(html).toContain("万圣节快乐！");
    expect(html).toContain("vw-obs-stream-item");
    expect(html).toContain("vw-sc-tier--t5");
    expect(html).toContain("vw-sc-tier--t7");
    expect(html).toContain("vw-sc-tier--t1");
    expect(html).toContain("<bdi>Kaito_Tokyo</bdi>");
    expect(html).toContain('<span class="vw-sc-card__amount">$100</span>');
    expect(html).not.toContain("<bdi>Kaito_Tokyo · $100</bdi>");
    expect(html.indexOf("Happy Halloween!")).toBeLessThan(html.indexOf("Keep up the stream!"));
    expect(html).not.toContain("Super Chat 展示列表");
    expect(html).not.toContain("Should be hidden in t1 tier");
    expect(html).not.toContain("WardBarrier");
    expect(html).not.toContain("静音");

    const retracted = reduceStageFrame(
      state,
      {
        type: "WARD_BLOCKED",
        version: NATIVE_OUTPUT_VERSION,
        deliveryId: "del-ward-1",
        deliverySequence: 4,
        platformOrder: 10,
        validUntil: new Date(Date.now() + 60_000).toISOString(),
      },
      2_000,
    );
    const retractedHtml = renderToStaticMarkup(<StageView state={retracted} />);
    expect(retractedHtml).not.toContain("Happy Halloween!");
    expect(retractedHtml).toContain("直播加油！");
    expect(retractedHtml).not.toContain("拦截提示");
    expect(retractedHtml).not.toContain("静音");
  });
});
