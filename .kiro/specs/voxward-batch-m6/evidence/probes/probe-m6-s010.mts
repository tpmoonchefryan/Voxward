// Batch m6 acceptance probe for STORY-010 (Q40 Super Chat comment, G10 member text, Q23, SC pipeline, model settings,
// selection reaching the run). Synthetic data only; the S008 adapter runs only the fake CLI; no network.
// Usage: tsx probe-m6-s010.mts <checkout> <label> [all|parse]
// "parse" runs only the parts that exist on the 40223e2 control copy (stream parsing, validateScBatch).
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const [C, LABEL = "candidate", PART = "all"] = process.argv.slice(2);
if (!C) throw new Error("usage: probe-m6-s010.mts <checkout> <label> [all|parse]");
const S = `${C}/apps/server`;
const contracts = await import(`${S}/node_modules/@voxward/contracts/src/index.ts`);
const stream = await import(`${S}/src/modules/platform-source/youtube/stream-list.ts`);
const toEvent = await import(`${S}/src/modules/platform-source/youtube/to-business-event.ts`);
const identity = await import(`${S}/src/modules/platform-source/youtube/identity.ts`);
const batch = await import(`${S}/src/modules/inference-provider/validation/batch-contract.ts`);
const rulePort = await import(`${S}/test/inference-provider/validation/rule-engine-port.ts`);

let checks = 0;
let failures = 0;
function check(name: string, ok: boolean, detail: unknown = ""): void {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail === "" ? "" : ` :: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`);
}
function note(name: string, detail: unknown): void {
  console.log(`NOTE ${name} :: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}
function section(title: string): void {
  console.log(`\n## [${LABEL}] ${title}`);
}

// Items in the shape of the official liveChatMessage resource (snippet.type selects the details object).
const NOW = new Date().toISOString();
const author = { channelId: "UC-synthetic-viewer", displayName: "synthetic", isChatOwner: false, isChatSponsor: true, isChatModerator: false, isVerified: false };
function item(id: string, snippet: Record<string, unknown>) {
  return { kind: "youtube#liveChatMessage", etag: "e", id, snippet: { publishedAt: NOW, hasDisplayContent: true, liveChatId: "lc", authorChannelId: author.channelId, ...snippet }, authorDetails: author };
}
const text = item("t1", { type: "textMessageEvent", displayMessage: "hello", textMessageDetails: { messageText: "hello" } });
const scWith = item("sc1", { type: "superChatEvent", displayMessage: "¥2,000 from x: ありがとう", superChatDetails: { amountMicros: "2000000", currency: "JPY", amountDisplayString: "¥2,000", userComment: "ありがとう", tier: 2 } });
const scWithout = item("sc2", { type: "superChatEvent", displayMessage: "¥500 from x", superChatDetails: { amountMicros: "500000", currency: "JPY", amountDisplayString: "¥500", tier: 1 } });
const milestone = item("mm1", { type: "memberMilestoneChatEvent", displayMessage: "x has been a member for 3 months: synthetic member text", memberMilestoneChatDetails: { userComment: "synthetic member text", memberMonth: 3, memberLevelName: "synthetic level" } });
const sticker = item("st1", { type: "superStickerEvent", displayMessage: "sticker", superStickerDetails: { amountMicros: "1000000", currency: "JPY", amountDisplayString: "¥1,000", tier: 1, superStickerMetadata: { stickerId: "s", altText: "synthetic sticker", language: "en" } } });

section("A stream items to ChannelEvent body (Q40; G10 member milestone text)");
const tracker = identity.createIdentityTracker({ capacity: 10 });
let ids = 0;
const deps = { channelId: "ch-1", senderRefOf: (v: string) => `ref-${v.length}`, newId: () => `corr-${++ids}`, identities: tracker };
function bodyOf(raw: unknown): { text: string | null | undefined; body: string | undefined } {
  const parsed = stream.parseStreamItem(raw);
  if (parsed === null) return { text: undefined, body: undefined };
  const out = toEvent.toBusinessEvent({ message: parsed, order: 1, receivedAtMs: Date.now() }, deps);
  return { text: parsed.text, body: out.message.event.body };
}
const bText = bodyOf(text);
const bScWith = bodyOf(scWith);
const bScWithout = bodyOf(scWithout);
const bMilestone = bodyOf(milestone);
const bSticker = bodyOf(sticker);
check("A1 textMessageEvent body is messageText", bText.body === "hello", bText);
check("A2 superChatEvent with a comment: body is superChatDetails.userComment (Q40)", bScWith.body === "ありがとう", bScWith);
check("A3 superChatEvent without a comment: body is empty, no text invented", bScWithout.body === "", bScWithout);
check("A4 memberMilestoneChatEvent with userComment: the viewer's text reaches the body (G10; proposal §4.2 step 3, §1.2)", bMilestone.body === "synthetic member text", bMilestone);
note("A5 superStickerEvent body", bSticker);

section("B generated-text rule hits in an SC batch (Q23)");
{
  const checker = rulePort.ruleEngineTextChecker(rulePort.EXPLICIT_RULES);
  const input = { items: [{ itemId: "i1", text: "blocked paid text" }, { itemId: "i2", text: "fine paid text" }, { itemId: "i3", text: "another fine paid text" }] };
  const output = {
    items: [
      { itemId: "i1", verdict: "BLOCK", reasonCodes: ["HARASSMENT"], translatedText: "a badword translation", slangNote: "", replyCue: "" },
      { itemId: "i2", verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"], translatedText: "has badword inside", slangNote: "note", replyCue: "cue" },
      { itemId: "i3", verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"], translatedText: "clean translation", slangNote: "note", replyCue: "cue" },
    ],
  };
  const v = await batch.validateScBatch(output, input, { maxItems: 10, generatedText: checker });
  note("B0 validateScBatch result", v.ok ? { ok: true, rejected: v.rejectedGeneratedText } : { ok: false, errors: v.errors.map((e: any) => `${e.code}${e.path}`) });
  check("B1 a BLOCK item's translation is not checked, a rule hit on i2 is listed for i2 only, the batch stays ok", v.ok === true && JSON.stringify(v.rejectedGeneratedText) === JSON.stringify([{ itemId: "i2", field: "translatedText" }]), v.ok ? v.rejectedGeneratedText : v.errors);
  const unverified = await batch.validateScBatch(output, input, { maxItems: 10 });
  note("B2 without a rule-engine port", unverified.ok ? "ok" : unverified.errors.map((e: any) => e.code));
}

if (PART === "parse") {
  console.log(`\n[${LABEL}] checks ${checks}, failures ${failures}`);
  process.exit(0);
}

const pipe = await import(`${S}/src/modules/inference-provider/sc-translation/pipeline.ts`);
const settings = await import(`${S}/src/modules/inference-provider/model-settings/settings.ts`);
const routes = await import(`${S}/src/modules/inference-provider/model-settings/routes.ts`);
const caps = await import(`${S}/src/adapters/kiro-cli/capabilities.ts`);
const provider = await import(`${S}/src/adapters/kiro-cli/provider.ts`);
const cli = await import(`${S}/test/adapters/kiro-cli/helpers.ts`);
const mfx = await import(`${S}/test/inference-provider/model-settings/fixtures.ts`);
const sfx = await import(`${S}/test/inference-provider/sc-translation/fixtures.ts`);

section("C translation on: cross-language samples, BLOCK and rule hits withheld per item, origin tags, local address");
{
  const addressCalls: string[] = [];
  const scModel = sfx.standInScModel((input: any) => sfx.scOutput(input, (t: string) => (t.includes("hit") ? { translatedText: "contains badword" } : {})));
  const req = sfx.requestOf("sc-on-1", [
    { correlationId: "zh", text: "谢谢大家的支持" },
    { correlationId: "ja", text: "ありがとうございます" },
    { correlationId: "en", text: "thanks a lot" },
    { correlationId: "mix", text: "今日は良い日ですね" },
    { correlationId: "blk", text: "this has badword in it" },
    { correlationId: "hit", text: "paid text whose translation hits a rule" },
  ]);
  const out: any = await pipe.runScBatch(req, { translationEnabled: true, selection: sfx.SC_SELECTION }, sfx.depsWith({ scModel, addressFor: async (cid: string) => (addressCalls.push(cid), { display: "synthetic-address", reading: null }) }));
  const byId = Object.fromEntries(out.items.map((i: any) => [i.correlationId, i]));
  check("C1 the batch is ok; zh, ja, en and mixed items get a cue", out.ok === true && ["zh", "ja", "en", "mix"].every((k) => byId[k].cue !== null), out.items.map((i: any) => [i.correlationId, i.withheld, i.cue?.generated.translatedText ?? null]));
  check("C2 BLOCK is withheld (VERDICT_BLOCK) and a rule-hit translation only withholds its own item (GENERATED_TEXT_REJECTED)", byId.blk.withheld === "VERDICT_BLOCK" && byId.blk.cue === null && byId.hit.withheld === "GENERATED_TEXT_REJECTED" && byId.hit.cue === null);
  check("C3 original and generated text are tagged VIEWER_ORIGINAL and AI_GENERATED", byId.zh.cue.original.origin === "VIEWER_ORIGINAL" && byId.zh.cue.original.text === "谢谢大家的支持" && byId.zh.cue.generated.origin === "AI_GENERATED");
  const sent = JSON.stringify(scModel.sent);
  check("C4 the model saw only itemId and text; no correlation id, no address", scModel.sent[0].items.every((i: any) => Object.keys(i).sort().join() === "itemId,text") && !sent.includes("synthetic-address") && !/"zh"|"ja"|"mix"|"blk"/.test(sent));
  check("C5 the local address is asked only for items that may show a cue", JSON.stringify(addressCalls.sort()) === JSON.stringify(["en", "ja", "mix", "zh"]), addressCalls);
  const noChecker: any = await pipe.runScBatch(req, { translationEnabled: true, selection: sfx.SC_SELECTION }, sfx.depsWith({ scModel, generatedText: undefined }));
  check("C6 without the rule-engine port every generated text is unverified and no item gets a cue (whole batch rejected)", noChecker.ok === false && noChecker.reason === "BATCH_REJECTED", noChecker.ok ? "ok" : noChecker.errorCodes.slice(0, 3));
}

section("D translation off: the safety review still runs through the real S008 adapter and the fake CLI");
const scratch = cli.createScratch("m6-s010-");
const runtimeRoot = join(scratch, "runtime");
mkdirSync(runtimeRoot, { recursive: true });
cli.makeFakeExecutable();
const adapterWith = (logPath: string, model?: string) =>
  provider.createKiroCliInferenceProvider({ command: cli.FAKE_CLI, env: cli.fakeEnvironment(logPath, "ok"), runtimeRoot, maxItems: 10, validateOutput: cli.moderationValidator, timeoutMs: 20_000, ...(model === undefined ? {} : { model }) });
const batchOff = [{ correlationId: "p1", text: "thank you for the stream" }, { correlationId: "p2", text: "this has badword in it" }];
{
  const log = join(scratch, "d.log");
  const scModel = sfx.standInScModel((input: any) => sfx.scOutput(input));
  const out: any = await pipe.runScBatch(sfx.requestOf("sc-off-1", batchOff), { translationEnabled: false, selection: sfx.SC_SELECTION }, sfx.depsWith({ safety: adapterWith(log), scModel, capabilities: () => mfx.REPORT_WITH_MODELS }));
  const chats = cli.readCalls(log).filter((c: any) => c.kind === "chat");
  check("D1 translation off: the CLI ran once, BLOCK reported, no cue, the SC model was not called", out.ok === true && chats.length === 1 && out.items[1].classification === "BLOCK" && out.items.every((i: any) => i.cue === null) && scModel.sent.length === 0, out.items.map((i: any) => [i.correlationId, i.classification, i.withheld]));
}

section("E model and reasoning settings against the reported capabilities");
{
  const store = settings.createInMemoryModelSettingsStore();
  const okWrite = await routes.writeModelSettings({ store, describe: () => mfx.REPORT_WITH_MODELS }, mfx.VALID_BODY);
  const badModel = await routes.writeModelSettings({ store, describe: () => mfx.REPORT_WITH_MODELS }, { ...mfx.VALID_BODY, scTranslation: { modelId: "synthetic-model-z", reasoning: null } });
  const badReason = await routes.writeModelSettings({ store, describe: () => mfx.REPORT_WITH_MODELS }, { ...mfx.VALID_BODY, realtimeModeration: { modelId: "synthetic-model-a", reasoning: "max" } });
  const needReason = await routes.writeModelSettings({ store, describe: () => mfx.REPORT_WITH_MODELS }, { ...mfx.VALID_BODY, realtimeModeration: { modelId: "synthetic-model-a", reasoning: null } });
  const reasonOnPlain = await routes.writeModelSettings({ store, describe: () => mfx.REPORT_WITH_MODELS }, { ...mfx.VALID_BODY, scTranslation: { modelId: "synthetic-model-b", reasoning: "low" } });
  const saved = await store.read();
  check("E1 unsupported model and reasoning are refused with 422 and named codes; the saved settings stay as written first", okWrite.status === 200 && badModel.status === 422 && badReason.status === 422 && needReason.status === 422 && reasonOnPlain.status === 422 && JSON.stringify(saved) === JSON.stringify(mfx.VALID_BODY), { badModel: badModel.body, badReason: badReason.body, needReason: needReason.body, reasonOnPlain: reasonOnPlain.body });
  const afterChange = await routes.readModelSettings({ store, describe: () => mfx.REPORT_AFTER_CHANGE });
  check("E2 after the adapter drops a model, reading the settings shows the problem and keeps the stored choice", JSON.stringify(afterChange.body.issues) === JSON.stringify([{ code: "MODEL_NOT_SUPPORTED", path: "/realtimeModeration/modelId" }]) && afterChange.body.settings.realtimeModeration.modelId === "synthetic-model-a", afterChange.body);
  const real = caps.describeKiroCli();
  const realWrite = await routes.writeModelSettings({ store, describe: () => real }, mfx.VALID_BODY);
  note("E3 the real Kiro CLI adapter's describe()", real);
  check("E3 with the real adapter's report every choice is refused as CAPABILITY_NOT_REPORTED", realWrite.status === 422 && realWrite.body.issues.every((i: any) => i.code === "CAPABILITY_NOT_REPORTED"), realWrite.body);
  const log = join(scratch, "e.log");
  const scModel = sfx.standInScModel((input: any) => sfx.scOutput(input));
  const adapter = adapterWith(log);
  const refused: any = await pipe.runScBatch(sfx.requestOf("sc-real", batchOff), { translationEnabled: false, selection: sfx.SC_SELECTION }, sfx.depsWith({ safety: adapter, scModel, capabilities: () => adapter.describe() }));
  check("E4 composed with the adapter's own describe(), an SC run is refused before any process starts", refused.ok === false && refused.reason === "SELECTION_REFUSED" && cli.readCalls(log).length === 0 && scModel.sent.length === 0, refused);
}

section("F the chosen SC model reaches the safety review (无静默更换服务)");
{
  for (const [label, configured] of [["adapter built with synthetic-model-b", "synthetic-model-b"], ["adapter built without a model", undefined]] as const) {
    const log = join(scratch, `f-${configured ?? "none"}.log`);
    const out: any = await pipe.runScBatch(sfx.requestOf(`sc-f-${configured ?? "none"}`, batchOff), { translationEnabled: false, selection: { modelId: "synthetic-model-a", reasoning: "high" } }, sfx.depsWith({ safety: adapterWith(log, configured), capabilities: () => mfx.REPORT_WITH_MODELS }));
    const argv = cli.readCalls(log).filter((c: any) => c.kind === "chat").at(-1)?.argv ?? [];
    const modelFlag = argv.indexOf("--model") >= 0 ? argv[argv.indexOf("--model") + 1] : null;
    check(`F ${label}: selection synthetic-model-a/high either runs on synthetic-model-a or is refused`, (out.ok === true && modelFlag === "synthetic-model-a") || out.ok === false, { outcome: out.ok ? "ok" : out.reason, cliModelFlag: modelFlag, argv });
  }
}
rmSync(scratch, { recursive: true, force: true });

console.log(`\n[${LABEL}] checks ${checks}, failures ${failures}`);
