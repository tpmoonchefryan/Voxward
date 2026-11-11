// The two rows of S006 design 4.11's example table that E22 does not cover. Usage: tsx probe-s006-design-rows.mts <checkout>
import { CONTRACT_VERSION } from "@voxward/contracts";
const [C] = process.argv.slice(2);
const mod = await import(`${C}/apps/server/src/modules/moderation-engine/index.ts`);
const norm = await import(`${C}/apps/server/src/modules/moderation-engine/rules/normalize.ts`);
let n = 0;
for (const [rule, body, want] of [["badword", "ba\uFF9Edword", "[0,8)"], ["カ", "\uFF9Eｶ", "[1,2)"]] as const) {
  const checker = mod.createModerationChecker({ ruleSet: { version: "v1", groups: [{ id: "g", action: { kind: "BLOCK" }, rules: [{ id: "r", kind: "normalized", text: rule }] }] }, nicknames: { displayNicknameOf: () => Promise.resolve("Viewer") }, now: () => 0 });
  n += 1;
  const v = await checker.check({ contractVersion: CONTRACT_VERSION, platform: "s", channelId: "c", platformMessageId: `m${n}`, platformOrder: n, receivedAt: "2026-01-01T00:00:00.000Z", correlationId: `x${n}`, body, sender: { contractVersion: CONTRACT_VERSION, senderRef: "s" } });
  const spans = v.hits.map((h: any) => h.spans.map((s: any) => `[${s.start},${s.end})`).join("+"));
  console.log(JSON.stringify({ rule, body: [...body].map((c) => c.codePointAt(0)!.toString(16)), copy: norm.normalizeText(body), route: v.route, spans, want, ok: v.route === "BLOCK" && spans.join() === want }));
}
