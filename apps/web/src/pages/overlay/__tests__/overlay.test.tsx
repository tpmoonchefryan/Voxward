import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  buildOverlaySubprotocols,
  buildOverlayWsUrl,
  closeMessageFor,
  createInitialStageState,
  isTerminalCloseCode,
  parseOverlayCredential,
  pruneExpiredStageItems,
  reconnectDelayMs,
  reduceStageFrame,
  SAFE_ANONYMOUS_ALIAS,
} from "../api";
import { StageView } from "../Stage";

const VALID_CRED = `vwo_${"A".repeat(43)}`;
const NOW = Date.parse("2026-11-14T10:00:00.000Z");
const FUTURE = "2026-11-14T10:05:00.000Z";
const PAST = "2026-11-14T09:55:00.000Z";

describe("overlay Q16 credential parsing", () => {
  it("extracts credential from #vwo_... and #cred=vwo_... and returns cleanedUrl without hash", () => {
    const direct = parseOverlayCredential({
      pathname: "/overlay/ch-1",
      search: "",
      hash: `#${VALID_CRED}`,
    });
    expect(direct).toEqual({
      ok: true,
      credential: VALID_CRED,
      cleanedUrl: "/overlay/ch-1",
    });

    const keyed = parseOverlayCredential({
      pathname: "/overlay/ch-1",
      search: "?theme=halloween",
      hash: `#cred=${VALID_CRED}`,
    });
    expect(keyed).toEqual({
      ok: true,
      credential: VALID_CRED,
      cleanedUrl: "/overlay/ch-1?theme=halloween",
    });
  });

  it("explicitly rejects ?cred=, ?token=, and ?credential= in URL query", () => {
    for (const key of ["cred", "token", "credential"]) {
      const res = parseOverlayCredential({
        pathname: "/overlay/ch-1",
        search: `?${key}=${VALID_CRED}`,
        hash: `#${VALID_CRED}`,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errorCode).toBe("QUERY_CREDENTIAL_REJECTED");
      }
    }
  });

  it("builds vw-output.v1 + vw-cred.<cred> subprotocols and ws/wss room URL", () => {
    expect(buildOverlaySubprotocols(VALID_CRED)).toEqual(["vw-output.v1", `vw-cred.${VALID_CRED}`]);
    expect(buildOverlayWsUrl({ protocol: "https:", host: "voxward.example" })).toBe("wss://voxward.example/output/v1/room");
    expect(buildOverlayWsUrl({ protocol: "http:", host: "127.0.0.1:3000" })).toBe("ws://127.0.0.1:3000/output/v1/room");
  });
});

describe("overlay stage reducer & reconnect policy", () => {
  it("deduplicates by deliveryId, skips expired frames, and retracts DELIVER on matching platformOrder WARD_BLOCKED", () => {
    let state = createInitialStageState("connecting");
    state = reduceStageFrame(
      state,
      { type: "HELLO", version: 1, protocol: "vw-output.v1", heartbeatMs: 15_000 },
      NOW,
    );
    expect(state.connectionStatus).toBe("connected");
    expect(state.heartbeatMs).toBe(15_000);

    // Expired DELIVER is ignored
    state = reduceStageFrame(
      state,
      {
        type: "DELIVER",
        version: 1,
        deliveryId: "del-expired",
        deliverySequence: 1,
        platformOrder: 1,
        validUntil: PAST,
        display: { label: null, text: "old", translation: null },
      },
      NOW,
    );
    expect(state.activeDeliveries).toHaveLength(0);

    // Valid DELIVER is shown once
    const deliverFrame = {
      type: "DELIVER" as const,
      version: 1 as const,
      deliveryId: "del-1",
      deliverySequence: 2,
      platformOrder: 7,
      validUntil: FUTURE,
      display: { label: null, text: "hello", translation: "你好" },
    };
    state = reduceStageFrame(state, deliverFrame, NOW);
    state = reduceStageFrame(state, deliverFrame, NOW);
    expect(state.activeDeliveries).toHaveLength(1);

    // WARD_BLOCKED with same platformOrder retracts active DELIVER and increments trigger count
    state = reduceStageFrame(
      state,
      {
        type: "WARD_BLOCKED",
        version: 1,
        deliveryId: "del-ward-1",
        deliverySequence: 3,
        platformOrder: 7,
        validUntil: FUTURE,
      },
      NOW,
    );
    expect(state.activeDeliveries).toHaveLength(0);
    expect(state.activeWard?.deliveryId).toBe("del-ward-1");
    expect(state.wardTriggerCount).toBe(1);

    // Historical / expired WARD_BLOCKED is ignored on reconnect
    state = reduceStageFrame(
      state,
      {
        type: "WARD_BLOCKED",
        version: 1,
        deliveryId: "del-ward-old",
        deliverySequence: 4,
        platformOrder: 8,
        validUntil: PAST,
      },
      NOW,
    );
    expect(state.wardTriggerCount).toBe(1);

    // Auto-expiry removes items after validUntil
    const afterExpiry = pruneExpiredStageItems(state, Date.parse(FUTURE) + 1);
    expect(afterExpiry.activeWard).toBeNull();
  });

  it("stops reconnecting on 4403 and 4400, and backs off exponentially otherwise", () => {
    expect(isTerminalCloseCode(4403)).toBe(true);
    expect(isTerminalCloseCode(4400)).toBe(true);
    expect(isTerminalCloseCode(4408)).toBe(false);
    expect(closeMessageFor(4403)).toContain("4403");
    expect(reconnectDelayMs(0)).toBe(1_000);
    expect(reconnectDelayMs(1)).toBe(2_000);
    expect(reconnectDelayMs(5)).toBe(30_000);
  });
});

describe("StageView rendering", () => {
  it("renders untrusted text in <bdi>, separates original SC from AI translation, uses safe alias for null label, and leaks nothing in WARD_BLOCKED", () => {
    let state = createInitialStageState("connected", "已连接只读输出通道（vw-output.v1）");
    state = reduceStageFrame(
      state,
      {
        type: "DELIVER",
        version: 1,
        deliveryId: "del-render-1",
        deliverySequence: 1,
        platformOrder: 10,
        validUntil: FUTURE,
        display: {
          label: null,
          text: "<script>alert(1)</script>Happy Halloween!",
          translation: "万圣节快乐！",
        },
      },
      NOW,
    );
    state = reduceStageFrame(
      state,
      {
        type: "WARD_BLOCKED",
        version: 1,
        deliveryId: "del-ward-render",
        deliverySequence: 2,
        platformOrder: 11,
        validUntil: FUTURE,
      },
      NOW,
    );

    const html = renderToStaticMarkup(
      <StageView roomId="ch-1" state={state} muted={false} onToggleMute={() => {}} />,
    );

    expect(html).toContain(SAFE_ANONYMOUS_ALIAS);
    expect(html).toContain("观众原文（原始输入）：");
    expect(html).toContain("AI 精翻（生成内容）：");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;Happy Halloween!");
    expect(html).not.toContain("<script>");
    expect(html).toContain("<bdi>");
    expect(html).toContain("万圣节快乐！");
    expect(html).toContain("结界已触发拦截（#11）");
    expect(html).toContain("无 TTS / 无二次语音裁决");
    expect(html).toContain("自制 CC0");
  });
});
