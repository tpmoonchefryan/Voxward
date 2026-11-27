import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NATIVE_OUTPUT_PROTOCOL, NATIVE_OUTPUT_VERSION } from "@voxward/contracts";
import { StageView } from "../Stage";
import {
  buildOverlaySubprotocols,
  buildOverlayWsUrl,
  closeMessageFor,
  createInitialStageState,
  parseOverlayCredential,
  pruneExpiredStageItems,
  reduceStageFrame,
  SAFE_ANONYMOUS_ALIAS,
  safeAnonymousAliasFor,
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
    expect(html).toContain('<span class="vw-sc-card__amount"><span class="untrusted-text" data-untrusted="true" style="white-space:pre-wrap"><bdi>$100</bdi></span></span>');
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

  it("renders unknown currency structured payment in neutral vw-sc-tier--unknown without falling back to Tier 3", () => {
    const unknownState = reduceStageFrame(
      createInitialStageState("connected"),
      {
        type: "DELIVER",
        version: NATIVE_OUTPUT_VERSION,
        deliveryId: "del-unk",
        deliverySequence: 1,
        platformOrder: 1,
        validUntil: new Date(Date.now() + 60_000).toISOString(),
        display: {
          label: "Guest",
          text: "Greetings!",
          translation: null,
          payment: { amountMicros: 15_000_000, currency: "XYZ", amountDisplay: "15 XYZ", tier: null },
        },
      },
      1_000,
    );
    const html = renderToStaticMarkup(<StageView state={unknownState} />);
    expect(html).toContain("vw-sc-tier--unknown");
    expect(html).not.toContain("vw-sc-tier--t3");
    expect(html).toContain("15 XYZ");
  });

  it("supports all 5 locales for credential errors, close messages, and anonymous alias", () => {
    expect(safeAnonymousAliasFor("en")).toBe("Viewer");
    expect(safeAnonymousAliasFor("zh-CN")).toBe("匿名观众");
    expect(safeAnonymousAliasFor("ja")).toBe("匿名視聴者");
    expect(safeAnonymousAliasFor("ko")).toBe("익명 시청자");
    expect(safeAnonymousAliasFor("fr")).toBe("Spectateur");

    const frMissing = parseOverlayCredential(
      { pathname: "/overlay/ch_1", search: "", hash: "" },
      "fr",
    );
    expect(frMissing.ok).toBe(false);
    if (!frMissing.ok) {
      expect(frMissing.message).toContain("#vwo_...");
    }

    expect(closeMessageFor(4403, "ja")).toContain("4403");
    expect(closeMessageFor(4400, "ko")).toContain("4400");
    expect(closeMessageFor(4408, "en")).toContain("4408");
  });

  it("STORY-061 & STORY-063: expires/evicts bounded dedup cache and prioritizes Intl.NumberFormat with <bdi> isolation", () => {
    let state = createInitialStageState("connected");
    for (let i = 0; i < 4; i++) {
      state = reduceStageFrame(
        state,
        {
          type: "DELIVER",
          version: NATIVE_OUTPUT_VERSION,
          deliveryId: `del-cap-${i}`,
          deliverySequence: i + 1,
          platformOrder: i + 1,
          validUntil: new Date(10_000 + i * 1_000).toISOString(),
          display: { label: "Viewer", text: `msg-${i}`, translation: null },
        },
        1_000,
        "en",
        { maxSeenDeliveries: 2 },
      );
    }
    expect(state.seenDeliveryIds.size).toBe(2);
    expect([...state.seenDeliveryIds]).toEqual(["del-cap-2", "del-cap-3"]);

    const expired = pruneExpiredStageItems(state, 20_000);
    expect(expired.seenDeliveryIds.size).toBe(0);

    const scState = reduceStageFrame(
      createInitialStageState("connected"),
      {
        type: "DELIVER",
        version: NATIVE_OUTPUT_VERSION,
        deliveryId: "del-sc-bidi",
        deliverySequence: 1,
        platformOrder: 1,
        validUntil: new Date(Date.now() + 60_000).toISOString(),
        display: {
          label: "Viewer",
          text: "Super chat!",
          translation: null,
          payment: { amountMicros: 50_000_000, currency: "USD", amountDisplay: "\u202EFake999", tier: null },
        },
      },
      1_000,
    );
    const html = renderToStaticMarkup(<StageView state={scState} />);
    expect(html).not.toContain("Fake999");
    expect(html).not.toContain("\u202E");
    expect(html).toContain("<bdi>");
  });
});
