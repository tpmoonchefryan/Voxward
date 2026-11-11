import { CONTRACT_VERSION } from "@voxward/contracts";
const [C, W] = process.argv.slice(2);
const MOD = "apps/server/src/modules/moderation-engine";
const mods = { f4808fb: await import(`${W}/old/f4808fb/${MOD}/index.ts`), candidate: await import(`${C}/${MOD}/index.ts`) };
let n = 0;
for (const [label, mod] of Object.entries(mods)) {
  const checker = (mod as any).createModerationChecker({ ruleSet: { version: "v1", groups: [{ id: "g", action: { kind: "DEDUCT", deduction: 5 }, rules: [{ id: "r", kind: "normalized", text: "カス" }] }] }, nicknames: { displayNicknameOf: () => Promise.resolve("Viewer") }, now: () => 0 });
  const out = [];
  for (const body of ["ガス代が高い", "ｶﾞｽ代が高い", "カスタード"]) {
    const v = await checker.check({ contractVersion: CONTRACT_VERSION, platform: "s", channelId: "c", platformMessageId: `m${++n}`, platformOrder: n, receivedAt: "2026-01-01T00:00:00.000Z", correlationId: `x${n}`, body, sender: { contractVersion: CONTRACT_VERSION, senderRef: "s" } });
    out.push(`${body}=${v.route}/${v.appliedDeduction?.value ?? 0}`);
  }
  console.log(label, out.join("  "));
}
