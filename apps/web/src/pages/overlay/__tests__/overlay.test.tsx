import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NATIVE_OUTPUT_PROTOCOL, NATIVE_OUTPUT_VERSION, readLegacyScPayment } from "@voxward/contracts";
import { StageView } from "../Stage";
import {
  buildOverlaySubprotocols,
  buildOverlayWsUrl,
  closeMessageFor,
  createInitialStageState,
  parseOverlayCredential,
  reduceStageFrame,
  SAFE_ANONYMOUS_ALIAS,
  safeAnonymousAliasFor,
} from "../api";

describe("overlay pure protocol and StageView rendering (VW-Draft-01)", () => {
  it("preserves an ambiguous fullwidth yen/yuan price and keeps the body visible", () => {
    const amountDisplay = "￥100.50";
    expect(readLegacyScPayment(amountDisplay)).toBeNull();
    const state = reduceStageFrame(createInitialStageState("connected"), {
      type: "DELIVER",
      version: NATIVE_OUTPUT_VERSION,
      deliveryId: "ambiguous-currency-sc",
      deliverySequence: 1,
      platformOrder: 1,
      validUntil: new Date(Date.now() + 60_000).toISOString(),
      display: { label: null, amountDisplay, text: "Keep the original price and message", translation: null },
    });
    const html = renderToStaticMarkup(<StageView state={state} />);
    expect(html).toContain('<span class="vw-sc-card__amount">￥100.50</span>');
    expect(html).toContain("Keep the original price and message");
    expect(html).not.toContain('data-sc-tier="t1"');
  });

  it.each(["¥1,400", "¥1400"])("shows the body and the same tier for legacy OBS amount %s", (amount) => {
    const state = reduceStageFrame(createInitialStageState("connected"), {
      type: "DELIVER",
      version: NATIVE_OUTPUT_VERSION,
      deliveryId: "yen-sc",
      deliverySequence: 1,
      platformOrder: 1,
      validUntil: new Date(Date.now() + 60_000).toISOString(),
      display: { label: `SC ${amount}`, text: "Keep this message visible", translation: null },
    });
    const html = renderToStaticMarkup(<StageView state={state} />);
    expect(html).toContain('data-sc-tier="t4"');
    expect(html).toContain("Keep this message visible");
  });

  it("uses structured payment over the legacy label in OBS", () => {
    const state = reduceStageFrame(createInitialStageState("connected"), {
      type: "DELIVER",
      version: NATIVE_OUTPUT_VERSION,
      deliveryId: "structured-yen-sc",
      deliverySequence: 1,
      platformOrder: 1,
      validUntil: new Date(Date.now() + 60_000).toISOString(),
      display: { label: "SC ¥1", text: "Structured amount wins", translation: null,
        payment: { amountMicros: 1_400_000_000, currency: "JPY" } },
    });
    const html = renderToStaticMarkup(<StageView state={state} />);
    expect(html).toContain('data-sc-tier="t4"');
    expect(html).toContain("Structured amount wins");
  });

  it("renders the live sandbox payment label as a Super Chat amount", () => {
    const state = reduceStageFrame(createInitialStageState("connected"), {
      type: "DELIVER",
      version: NATIVE_OUTPUT_VERSION,
      deliveryId: "sandbox-sc",
      deliverySequence: 1,
      platformOrder: 1,
      validUntil: new Date(Date.now() + 60_000).toISOString(),
      display: { label: null, amountDisplay: "€25.00", text: "Merci !", translation: null },
    }, Date.now());
    const html = renderToStaticMarkup(<StageView state={state} />);
    expect(html).toContain('data-stream-kind="sc"');
    expect(html).toContain('<span class="vw-sc-card__amount">€25.00</span>');
  });

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
});
