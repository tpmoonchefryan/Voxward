// Batch m6 round 2 (m6r1) acceptance probe for STORY-010 (Q40 Super Chat comment, G10 member text, Q23, SC pipeline,
// model settings, selection reaching the run). Copied from probe-m6-s010.mts: §A–§C and §E1–§E3 unchanged; §D, §E4 and §F
// follow the B1 rework (the gate reads the running port's report, the selection travels with the request), and §F is
// expected to pass. Synthetic data only; the S008 adapter runs only the fake CLI; no network.
// Usage: tsx probe-m6r1-s010.mts <checkout> <label> [all|parse]
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
// m6r1: the gate reads the report of the port that runs the review (the S008 adapter when translation is off). The real
// adapter's describe() lists no model (G1), so D gives the same adapter a report that lists models without reasoning.
const chatArgv = (log: string) => cli.readCalls(log).filter((c: any) => c.kind === "chat").map((c: any) => c.argv);
const modelFlagOf = (argv: readonly string[] | undefined) => (argv && argv.indexOf("--model") >= 0 ? argv[argv.indexOf("--model") + 1] : null);
async function settle<T>(p: Promise<T>): Promise<{ value?: T; error?: any }> {
  try {
    return { value: await p };
  } catch (error) {
    return { error };
  }
}
{
  const log = join(scratch, "d.log");
  const scModel = sfx.standInScModel((input: any) => sfx.scOutput(input));
  const safety = sfx.reportingAdapter(adapterWith(log), sfx.REPORT_MODELS_NO_REASONING);
  const out: any = await pipe.runScBatch(sfx.requestOf("sc-off-1", batchOff), { translationEnabled: false, selection: sfx.SAFETY_SELECTION }, sfx.depsWith({ safety, scModel }));
  const chats = chatArgv(log);
  check("D1 translation off: the CLI ran once, BLOCK reported, no cue, the SC model was not called", out.ok === true && chats.length === 1 && out.items[1].classification === "BLOCK" && out.items.every((i: any) => i.cue === null && i.withheld !== null) && scModel.sent.length === 0, out.ok ? out.items.map((i: any) => [i.correlationId, i.classification, i.withheld]) : out);
  const stdin = cli.readCalls(log).find((c: any) => c.kind === "chat")?.stdin ?? "";
  check("D2 what the CLI received names no correlation id and carries no translation field", !/"p1"|"p2"/.test(stdin) && !/translatedText|slangNote|replyCue/.test(stdin), stdin.slice(0, 160));
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
  const refused: any = await pipe.runScBatch(sfx.requestOf("sc-real", batchOff), { translationEnabled: false, selection: sfx.SAFETY_SELECTION }, sfx.depsWith({ safety: adapter, scModel }));
  check("E4 composed with the adapter's own describe(), an SC run is refused before any process starts", refused.ok === false && refused.reason === "SELECTION_REFUSED" && refused.issues.every((i: any) => i.code === "CAPABILITY_NOT_REPORTED") && cli.readCalls(log).length === 0 && scModel.sent.length === 0, refused);
}

section("F the chosen SC model reaches the run, or the run is refused (无静默更换服务) — B1 recheck, expected to pass");
{
  const report = sfx.REPORT_MODELS_NO_REASONING;
  // F1, F2: the B1 reproduction of 5482e5d (adapter built with B, or with no model; selection A).
  for (const [label, configured] of [["F1 adapter built with synthetic-model-b", "synthetic-model-b"], ["F2 adapter built without a model", undefined]] as const) {
    const log = join(scratch, `f-${configured ?? "none"}.log`);
    const out: any = await pipe.runScBatch(sfx.requestOf(`sc-f-${configured ?? "none"}`, batchOff), { translationEnabled: false, selection: { modelId: "synthetic-model-a", reasoning: null } }, sfx.depsWith({ safety: sfx.reportingAdapter(adapterWith(log, configured), report) }));
    const argv = chatArgv(log).at(-1);
    check(`${label}: selection synthetic-model-a runs on synthetic-model-a`, out.ok === true && modelFlagOf(argv) === "synthetic-model-a", { outcome: out.ok ? "ok" : out.reason, cliModelFlag: modelFlagOf(argv), argv });
  }
  // F3: the B1 trigger. The settings change from B to A while the adapter is not rebuilt; the next run uses A.
  {
    const log = join(scratch, "f-switch.log");
    const safety = sfx.reportingAdapter(adapterWith(log, "synthetic-model-b"), report);
    const first: any = await pipe.runScBatch(sfx.requestOf("sc-f-switch-1", batchOff), { translationEnabled: false, selection: { modelId: "synthetic-model-b", reasoning: null } }, sfx.depsWith({ safety }));
    const second: any = await pipe.runScBatch(sfx.requestOf("sc-f-switch-2", batchOff), { translationEnabled: false, selection: { modelId: "synthetic-model-a", reasoning: null } }, sfx.depsWith({ safety }));
    const flags = chatArgv(log).map(modelFlagOf);
    check("F3 the SC choice changes from B to A without rebuilding the adapter: the runs use B, then A", first.ok === true && second.ok === true && JSON.stringify(flags) === JSON.stringify(["synthetic-model-b", "synthetic-model-a"]), flags);
  }
  // F4: a reasoning level the adapter cannot apply (the report claims it) is refused before any process starts.
  {
    const log = join(scratch, "f-high.log");
    const scModel = sfx.standInScModel((input: any) => sfx.scOutput(input));
    const r = await settle(pipe.runScBatch(sfx.requestOf("sc-f-high", batchOff), { translationEnabled: false, selection: { modelId: "synthetic-model-a", reasoning: "high" } }, sfx.depsWith({ safety: sfx.reportingAdapter(adapterWith(log, "synthetic-model-b"), sfx.REPORT_CLAIMING_HIGH), scModel })));
    const failed = r.error !== undefined || (r.value as any)?.ok === false;
    check("F4 selection a/high where the adapter cannot apply reasoning: an explicit failure, no CLI process, no result, no SC model call", failed && cli.readCalls(log).length === 0 && scModel.sent.length === 0, r.error ? { thrown: r.error.name, code: r.error.code, message: String(r.error.message).slice(0, 80) } : r.value);
  }
  // F5, F6: the gate reads the report of the port that runs the review.
  {
    const log = join(scratch, "f-gate.log");
    const notListed: any = await pipe.runScBatch(sfx.requestOf("sc-f-gate-1", batchOff), { translationEnabled: false, selection: { modelId: "synthetic-model-a", reasoning: null } }, sfx.depsWith({ safety: sfx.reportingAdapter(adapterWith(log), mfx.REPORT_AFTER_CHANGE) }));
    const noLevel: any = await pipe.runScBatch(sfx.requestOf("sc-f-gate-2", batchOff), { translationEnabled: false, selection: { modelId: "synthetic-model-a", reasoning: "high" } }, sfx.depsWith({ safety: sfx.reportingAdapter(adapterWith(log), report) }));
    check("F5 translation off, the running adapter's report lacks the chosen model: refused MODEL_NOT_SUPPORTED, no process", notListed.ok === false && notListed.reason === "SELECTION_REFUSED" && notListed.issues.some((i: any) => i.code === "MODEL_NOT_SUPPORTED") && cli.readCalls(log).length === 0, notListed);
    check("F6 translation off, the report lists the model without reasoning levels and a level is chosen: refused REASONING_NOT_SUPPORTED, no process", noLevel.ok === false && noLevel.issues?.some((i: any) => i.code === "REASONING_NOT_SUPPORTED") && cli.readCalls(log).length === 0, noLevel);
  }
  // F7, F8: translation on. The selection is handed to the SC model port as chosen, and its own report is the gate.
  {
    const scModel = sfx.standInScModel((input: any) => sfx.scOutput(input));
    const on: any = await pipe.runScBatch(sfx.requestOf("sc-f-on", batchOff), { translationEnabled: true, selection: sfx.SC_SELECTION }, sfx.depsWith({ scModel }));
    check("F7 translation on: the SC model port receives the chosen model and reasoning unchanged, the safety port is not used", on.ok === true && scModel.received.length === 1 && JSON.stringify(scModel.received[0].selection) === JSON.stringify(sfx.SC_SELECTION), scModel.received);
    const strict = sfx.standInScModel((input: any) => sfx.scOutput(input), mfx.REPORT_AFTER_CHANGE);
    const refusedOn: any = await pipe.runScBatch(sfx.requestOf("sc-f-on-2", batchOff), { translationEnabled: true, selection: sfx.SC_SELECTION }, sfx.depsWith({ scModel: strict }));
    check("F8 translation on, the SC model port's report lacks the model: refused before the model is called", refusedOn.ok === false && refusedOn.reason === "SELECTION_REFUSED" && strict.sent.length === 0, refusedOn);
  }
  // F9: a request without a selection (the realtime path of S008) keeps the model the adapter was built with.
  {
    const log = join(scratch, "f-realtime.log");
    const adapter = adapterWith(log, "synthetic-model-b");
    const res: any = await adapter.infer(sfx.requestOf("rt-1", batchOff));
    const flags = chatArgv(log).map(modelFlagOf);
    check("F9 a request without selection keeps the built-in model (realtime path unchanged)", res.items.length === 2 && JSON.stringify(flags) === JSON.stringify(["synthetic-model-b"]), flags);
  }
}
rmSync(scratch, { recursive: true, force: true });

console.log(`\n[${LABEL}] checks ${checks}, failures ${failures}`);
