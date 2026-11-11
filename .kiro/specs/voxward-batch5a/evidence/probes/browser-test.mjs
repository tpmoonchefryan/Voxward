// Real-browser interaction test over the Chrome DevTools Protocol. Chrome for Testing headless shell, loopback only.
// Usage: node browser-test.mjs <work> <chromeBinary>
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const [W, CHROME] = process.argv.slice(2);
const seed = JSON.parse(readFileSync(join(W, "harness-seed.json"), "utf8"));
const BASE = "http://127.0.0.1:5173";
const CONTROL = "http://127.0.0.1:3901";
const SHOTS = join(W, "shots");
mkdirSync(SHOTS, { recursive: true });
let checks = 0;
let failures = 0;
function expectEq(label, actual, expected) {
  checks += 1;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- minimal CDP client ----------
const profile = join(W, "chrome-profile");
rmSync(profile, { recursive: true, force: true });
const chrome = spawn(CHROME, ["--headless", "--no-sandbox", "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--window-size=1280,900", "--lang=zh-CN", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
const wsUrl = await new Promise((resolve, reject) => {
  let buffer = "";
  chrome.stderr.on("data", (chunk) => {
    buffer += chunk.toString();
    const match = /DevTools listening on (ws:\/\/\S+)/.exec(buffer);
    if (match) resolve(match[1]);
  });
  setTimeout(() => reject(new Error(`chrome did not start: ${buffer.slice(0, 400)}`)), 15000);
});
const ws = new WebSocket(wsUrl);
await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
let nextId = 0;
const pending = new Map();
const listeners = [];
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id !== undefined && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  } else if (message.method) {
    for (const listener of listeners) listener(message);
  }
});
function send(method, params = {}, sessionId) {
  const id = ++nextId;
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function newPage() {
  const { browserContextId } = await send("Target.createBrowserContext");
  const { targetId } = await send("Target.createTarget", { url: "about:blank", browserContextId });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  for (const domain of ["Page.enable", "Runtime.enable", "Network.enable"]) await send(domain, {}, sessionId);
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  const page = {
    sessionId,
    async goto(url) {
      const loaded = new Promise((resolve) => {
        const listener = (message) => {
          if (message.sessionId === sessionId && message.method === "Page.loadEventFired") {
            listeners.splice(listeners.indexOf(listener), 1);
            resolve();
          }
        };
        listeners.push(listener);
      });
      await send("Page.navigate", { url }, sessionId);
      await loaded;
    },
    async eval(expression) {
      const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId);
      if (result.exceptionDetails) throw new Error(`eval failed: ${JSON.stringify(result.exceptionDetails).slice(0, 300)}`);
      return result.result.value;
    },
    async waitFor(expression, timeoutMs = 8000) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (await page.eval(`Boolean(${expression})`)) return true;
        await sleep(50);
      }
      return false;
    },
    /** A real mouse click at the centre of the element the expression returns. */
    async click(elementExpression) {
      const box = await page.eval(`(() => { const el = ${elementExpression}; if (!el) return null; el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (box === null) throw new Error(`no element for ${elementExpression}`);
      for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
        await send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 }, sessionId);
      }
      await sleep(80);
    },
    async type(elementExpression, text) {
      await page.click(elementExpression);
      await send("Input.insertText", { text }, sessionId);
      await sleep(50);
    },
    async shot(name) {
      const { data } = await send("Page.captureScreenshot", { format: "png" }, sessionId);
      const file = join(SHOTS, `${name}.png`);
      writeFileSync(file, Buffer.from(data, "base64"));
      return file;
    },
    async login(name) {
      await page.goto(`${BASE}/`);
      return page.eval(`fetch("/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ loginName: ${JSON.stringify(name)}, password: ${JSON.stringify(seed.password)} }) }).then(async (r) => ({ status: r.status, session: (await fetch("/auth/session")).status }))`);
    },
  };
  return page;
}
const byText = (selector, text) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((el) => el.textContent.includes(${JSON.stringify(text)}))`;
const currentText = `(document.querySelector('section[aria-label="关联链"] ol button[aria-current="true"]')?.textContent ?? "")`;

// ---------- S017 as the owner ----------
console.log("\n## S017 log viewer in a real browser (owner)");
const owner = await newPage();
expectEq("login through the Vite proxy sets the session cookie", await owner.login("owner"), { status: 200, session: 200 });
await owner.goto(`${BASE}/logs/channel-1`);
expectEq("Technical Log entry loads its first page", await owner.waitFor(`document.querySelectorAll("main ul > li").length === 50`), true);
const firstRowBefore = await owner.eval(`document.querySelector("main ul > li").textContent`);
await owner.click(byText("button", "加载更多"));
expectEq("load more appends the next page", [await owner.waitFor(`document.querySelectorAll("main ul > li").length === 100`), await owner.eval(`document.querySelector("main ul > li").textContent`) === firstRowBefore], [true, true]);
// Which row of the page is a mid-chain entry of corr-long: read the same list order the page shows.
const order = await owner.eval(`(async () => { const a = await (await fetch("/internal/channels/channel-1/logs/technical?limit=100")).json(); return a.items.map((i) => [i.id, i.correlationId, i.sequence]); })()`);
const pick = order.findIndex(([, corr, seq], index) => index >= 55 && corr === "corr-long" && seq > 40 && seq < 120);
const [, , pickedSeq] = order[pick];
await owner.click(`document.querySelectorAll("main ul > li button")[${pick}]`);
expectEq("clicking a mid-chain row opens the whole chain across pages", await owner.waitFor(`document.querySelectorAll('section[aria-label="关联链"] ol > li').length === 130`), true);
expectEq("the clicked entry stays selected", (await owner.eval(currentText)).startsWith(`#${pickedSeq} `), true);
await owner.click(byText("button", "下一条"));
const afterNext = await owner.eval(currentText);
await owner.click(byText("button", "上一条"));
await owner.click(byText("button", "上一条"));
const afterPrev = await owner.eval(currentText);
expectEq("next and previous move one entry through the chain", [afterNext.startsWith(`#${pickedSeq + 1} `), afterPrev.startsWith(`#${pickedSeq - 1} `)], [true, true]);
await owner.click(`document.querySelectorAll('section[aria-label="关联链"] ol > li button')[0]`);
expectEq("direct selection of the first entry disables previous", [(await owner.eval(currentText)).startsWith("#0 "), await owner.eval(`${byText("button", "上一条")}.disabled`)], [true, true]);
await owner.click(`document.querySelectorAll('section[aria-label="关联链"] ol > li button')[129]`);
expectEq("direct selection of the last entry disables next", [(await owner.eval(currentText)).startsWith("#129 "), await owner.eval(`${byText("button", "下一条")}.disabled`)], [true, true]);
await owner.click(`document.querySelectorAll('section[aria-label="关联链"] ol > li button')[4]`);
await owner.waitFor(`document.querySelector('section[aria-label="日志详情"] details') !== null`);
const panel = await owner.eval(`(() => { const s = document.querySelector('section[aria-label="日志详情"]'); const dl = [...s.querySelectorAll(":scope > dl > dt")].map((dt) => [dt.textContent, dt.nextElementSibling.textContent]); const details = [...s.querySelectorAll("details")].map((d) => [d.querySelector("summary").textContent, d.open]); return { dl, details }; })()`);
expectEq("JSON panel names task, model and contract version", panel.dl.filter(([k]) => ["任务", "模型", "契约版本", "规则模板版本"].includes(k)), [["任务", "task-1"], ["模型", "model-synthetic-x"], ["契约版本", "1"], ["规则模板版本", "rules-synthetic-3"]]);
expectEq("content sections are collapsed by default", panel.details, [["校验后 JSON", false], ["临时编号映射", false], ["译文", false]]);
await owner.click(`${byText('section[aria-label="日志详情"] details summary', "校验后 JSON")}`);
const json = await owner.eval(`(() => { const d = ${byText('section[aria-label="日志详情"] details', "校验后 JSON")}; return { open: d.open, text: d.querySelector("pre").textContent }; })()`);
expectEq("expanding shows the validated JSON pretty-printed", { open: json.open, multiline: json.text.split("\n").length > 5, indented: json.text.includes('\n  "items"'), verdict: json.text.includes('"verdict": "BLOCK"') }, { open: true, multiline: true, indented: true, verdict: true });
const jsonShot = await owner.shot("s017-json-panel");
await owner.click(`document.querySelectorAll('section[aria-label="关联链"] ol > li button')[0]`);
await owner.waitFor(`${byText('section[aria-label="日志详情"] details summary', "消息原文")} !== undefined`);
await owner.click(`${byText('section[aria-label="日志详情"] details summary', "消息原文")}`);
const bidi = await owner.eval(`(() => { const d = ${byText('section[aria-label="日志详情"] details', "消息原文")}; const bdi = d.querySelector("pre bdi"); return { inBdi: bdi !== null, keepsRlo: bdi?.textContent.includes("\\u202E") ?? false, keepsZwsp: bdi?.textContent.includes("\\u200B") ?? false, isolate: bdi === null ? null : getComputedStyle(bdi).unicodeBidi }; })()`);
expectEq("untrusted text is kept and isolated in <bdi> (Q15)", bidi, { inBdi: true, keepsRlo: true, keepsZwsp: true, isolate: "isolate" });
const bidiShot = await owner.shot("s017-bidi-isolation");
await owner.click(byText("button", "返回列表"));
expectEq("back to the list", await owner.waitFor(`document.querySelectorAll("main ul > li").length === 50`), true);
await owner.click(byText("nav button", "Change Log"));
await owner.waitFor(`document.querySelectorAll("main ul > li").length > 0`);
const changeRow = await owner.eval(`(() => { const li = [...document.querySelectorAll("main ul > li")].find((el) => el.textContent.includes("mirrored") && el.querySelector("button")); const bdis = [...li.querySelectorAll("bdi")]; return { bdi: bdis.some((b) => b.textContent.includes("\\u202E")), isolate: getComputedStyle(bdis[0]).unicodeBidi }; })()`);
expectEq("Change Log row text is isolated as well", changeRow, { bdi: true, isolate: "isolate" });
await owner.click(`[...document.querySelectorAll("main ul > li")].find((el) => el.textContent.includes("mirrored") && el.querySelector("button")).querySelector("button")`);
expectEq("a Change Log row opens its chain at the first entry", [await owner.waitFor(`document.querySelectorAll('section[aria-label="关联链"] ol > li').length === 130`), (await owner.eval(currentText)).startsWith("#0 ")], [true, true]);
await owner.goto(`${BASE}/logs/channel-2`);
expectEq("another channel's viewer is refused", await owner.waitFor(`document.querySelector('[role="alert"]')?.textContent === "没有查看该频道日志的权限。"`), true);

console.log("\n## S017 other roles");
const modlog = await newPage();
await modlog.login("modlog");
await modlog.goto(`${BASE}/logs/channel-1`);
await modlog.waitFor(`document.querySelectorAll("main ul > li").length === 50`);
const modOrder = await modlog.eval(`(async () => { const a = await (await fetch("/internal/channels/channel-1/logs/technical?limit=50")).json(); return a.items.map((i) => i.correlationId); })()`);
await modlog.click(`document.querySelectorAll("main ul > li button")[${modOrder.indexOf("corr-long")}]`);
await modlog.waitFor(`document.querySelectorAll('section[aria-label="关联链"] ol > li').length === 130`);
await modlog.click(`document.querySelectorAll('section[aria-label="关联链"] ol > li button')[4]`);
await modlog.waitFor(`document.querySelector('section[aria-label="日志详情"]') !== null`);
const modSections = await modlog.eval(`[...document.querySelectorAll('section[aria-label="日志详情"] details summary')].map((s) => s.textContent)`);
await modlog.click(`document.querySelectorAll('section[aria-label="关联链"] ol > li button')[0]`);
await modlog.waitFor(`${byText('section[aria-label="日志详情"] details summary', "消息原文")} !== undefined`);
const modSections0 = await modlog.eval(`[...document.querySelectorAll('section[aria-label="日志详情"] details summary')].map((s) => s.textContent)`);
expectEq("moderator with log access: no validated JSON or id map section, message text shown", [modSections, modSections0], [["译文"], ["消息原文"]]);
const mod = await newPage();
await mod.login("mod");
await mod.goto(`${BASE}/logs/channel-1`);
expectEq("moderator without log access sees the refusal and no rows", [await mod.waitFor(`document.querySelector('[role="alert"]')?.textContent === "没有查看该频道日志的权限。"`), await mod.eval(`document.querySelectorAll("main ul > li").length`)], [true, 0]);

console.log("\n## S017 deletion while the page is open");
const corrOrder = await owner.eval(`(async () => { const a = await (await fetch("/internal/channels/channel-1/logs/technical?limit=100")).json(); const b = await (await fetch("/internal/channels/channel-1/logs/technical?limit=100&cursor=" + encodeURIComponent(a.nextCursor))).json(); return [...a.items, ...b.items].map((i) => i.correlationId); })()`);
await owner.goto(`${BASE}/logs/channel-1`);
await owner.waitFor(`document.querySelectorAll("main ul > li").length === 50`);
await owner.click(byText("button", "加载更多"));
await owner.waitFor(`document.querySelectorAll("main ul > li").length === 100`);
await owner.click(byText("button", "加载更多"));
expectEq("every row is reachable from the list, with no load-more button left", [await owner.waitFor(`document.querySelectorAll("main ul > li").length === ${corrOrder.length}`), await owner.eval(`${byText("button", "加载更多")} === undefined`)], [true, true]);
await owner.click(`document.querySelectorAll("main ul > li button")[${corrOrder.indexOf("corr-mb-2")}]`);
await owner.waitFor(`document.querySelectorAll('section[aria-label="关联链"] ol > li').length === 3`);
await owner.click(`document.querySelectorAll('section[aria-label="关联链"] ol > li button')[2]`);
const shownBefore = await owner.waitFor(`${byText('section[aria-label="日志详情"] details summary', "校验后 JSON")} !== undefined`);
await fetch(`${CONTROL}/remove?subject=subject-2`, { method: "POST" });
await owner.click(`document.querySelectorAll('section[aria-label="关联链"] ol > li button')[1]`);
await owner.click(`document.querySelectorAll('section[aria-label="关联链"] ol > li button')[2]`);
const goneMessage = await owner.waitFor(`document.querySelector('section[aria-label="关联链"] [role="alert"]')?.textContent === "这条日志不存在，或已经到期。"`);
await owner.click(byText("button", "返回列表"));
await owner.waitFor(`document.querySelectorAll("main ul > li").length === 50`);
const rowsAfter = await owner.eval(`(async () => { const a = await (await fetch("/internal/channels/channel-1/logs/technical?limit=100")).json(); const b = await (await fetch("/internal/channels/channel-1/logs/technical?limit=100&cursor=" + encodeURIComponent(a.nextCursor))).json(); return [...a.items, ...b.items].filter((i) => i.correlationId === "corr-mb-2").length; })()`);
const listText = await owner.eval(`document.querySelector("main ul").textContent.includes("corr-mb-2")`);
expectEq("a deleted entry stops showing at once, also when it was on screen", { shownBefore, goneMessage, rowsAfter, listText }, { shownBefore: true, goneMessage: true, rowsAfter: 0, listText: false });

// ---------- S018 data panel ----------
console.log("\n## S018 data panel in a real browser");
const admin = await newPage();
await admin.login("dadmin");
await admin.goto(`${BASE}/data/channel-1`);
await admin.waitFor(`document.querySelector("main form input") !== null`);
await admin.type(`document.querySelector("main form input")`, "subject-1");
await admin.click(byText("main form button", "查询"));
await admin.waitFor(`document.querySelector('section[aria-label="主体概况"]') !== null`);
const summary = await admin.eval(`[...document.querySelectorAll('section[aria-label="主体概况"] p, section[aria-label="主体概况"] li')].map((p) => p.textContent)`);
const panelJson = await admin.eval(`fetch("/channels/channel-1/data/subjects/subject-1").then((r) => r.json())`);
const label = { TECHNICAL_LOG: "技术日志", EVIDENCE: "证据正文", CHANGE_LOG: "变更日志" };
const retentionLines = panelJson.retention.map((r) => `${label[r.category]}：${r.count} 条，保留 ${r.retentionDays} 天（自创建起算，到期后删除）`);
console.log(`   retention from the API: ${JSON.stringify(panelJson.retention)}`);
expectEq("panel shows score, identity, list, exception, ledger and retention", summary.filter((t) => /当前评分|身份来源|名单|记分例外|评分记录|技术日志|证据正文|变更日志/.test(t)), ["当前评分：12", "身份来源：付费会员", "名单：无", "记分例外：有效", "评分记录：1 条", ...retentionLines]);
const deleteCopy = await admin.eval(`document.querySelector('section[aria-label="删除请求"]').innerText`);
const notice = await admin.eval(`document.querySelector("main").innerText.includes("YouTube 原始内容与平台侧副本不由本实例删除，外部处理状态本实例无法查询。")`);
expectEq("both deletion entries, their effects, the minimal marker and the review note", { only: deleteCopy.includes("仅删除数据"), except: deleteCopy.includes("删除并加入记分例外名单"), noRevoke: deleteCopy.includes("不新增、也不撤销记分例外"), marker: deleteCopy.includes("需要保留一条最小偏好记录"), stillReviewed: deleteCopy.includes("之后的发言仍会进入审核"), everyMessage: deleteCopy.includes("每条新消息进入审核"), registrationOnly: deleteCopy.includes("登记本身不删除任何数据"), notice }, { only: true, except: true, noRevoke: true, marker: true, stillReviewed: true, everyMessage: true, registrationOnly: true, notice: true });
await admin.shot("s018-panel");
await admin.click(byText('section[aria-label="删除请求"] button', "仅删除数据"));
expectEq("choosing an entry asks for confirmation first", await admin.waitFor(`document.querySelector('[aria-label="确认登记"]')?.textContent.includes("将登记：仅删除数据")`), true);
await admin.click(byText('[aria-label="确认登记"] button', "确认登记"));
const registered = await admin.waitFor(`document.querySelector('section[aria-label="删除请求"] [role="status"]')?.textContent === "已登记请求，状态：待核验。尚未删除任何数据。"`);
await admin.waitFor(`document.querySelector('section[aria-label="请求状态"]') !== null`);
const status1 = await admin.eval(`document.querySelector('section[aria-label="请求状态"]').innerText`);
const facts1 = await (await fetch(`${CONTROL}/facts?subject=subject-1`)).json();
expectEq("registration only, and the existing exception stays", { registered, kind: status1.includes("删除请求：仅删除数据"), stage: status1.includes("待核验，尚未执行。"), exception: facts1.exceptions, execution: facts1.requests.map((r) => r.execution_state) }, { registered: true, kind: true, stage: true, exception: [{ id: "exception-1", removed_at: null }], execution: ["PENDING"] });
await admin.click(byText('[aria-label="核验"] button', "核验通过：确认账号归属"));
expectEq("verification moves the request to awaiting execution", await admin.waitFor(`document.querySelector('section[aria-label="请求状态"]').innerText.includes("已核验，等待执行。本页面不执行删除。")`), true);
await fetch(`${CONTROL}/partial?request=${facts1.requests[0].id}`, { method: "POST" });
await admin.click(byText("main form button", "查询"));
await admin.waitFor(`document.querySelector('section[aria-label="请求状态"]')?.innerText.includes("部分失败")`);
const status2 = await admin.eval(`document.querySelector('section[aria-label="请求状态"]').innerText`);
expectEq("a partial failure from the execution path is shown as it is", { stage: status2.includes("部分失败，见下列条目。"), scope: status2.includes("范围：完成 1，失败 1，待处理 1"), failed: status2.includes("失败条目：SCORE_LEDGER（LEDGER_LOCKED）"), noCompleted: !status2.includes("执行完成") }, { stage: true, scope: true, failed: true, noCompleted: true });
await admin.shot("s018-partial");
await admin.eval(`(() => { const input = document.querySelector("main form input"); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; setter.call(input, ""); input.dispatchEvent(new Event("input", { bubbles: true })); })()`);
await admin.type(`document.querySelector("main form input")`, "subject-2");
await admin.click(byText("main form button", "查询"));
await admin.waitFor(`document.querySelector('section[aria-label="主体概况"]')?.innerText.includes("subject-2")`);
const twin = await admin.eval(`document.querySelector('section[aria-label="主体概况"]').innerText`);
await admin.click(byText('section[aria-label="删除请求"] button', "删除并加入记分例外名单"));
await admin.click(byText('[aria-label="确认登记"] button', "确认登记"));
const registered2 = await admin.waitFor(`document.querySelector('section[aria-label="删除请求"] [role="status"]')?.textContent === "已登记请求，状态：待核验。尚未删除任何数据。"`);
const facts2 = await (await fetch(`${CONTROL}/facts?subject=subject-2`)).json();
expectEq("same nickname, other subject; the combined entry only registers", { score: twin.includes("当前评分：-4"), list: twin.includes("名单：黑名单"), exceptionShown: twin.includes("记分例外：无"), registered2, exceptionRows: facts2.exceptions, mode: facts2.requests.map((r) => r.mode) }, { score: true, list: true, exceptionShown: true, registered2: true, exceptionRows: [], mode: ["DELETE_AND_EXCEPT"] });
for (const [name, expectedAlert] of [["owner", "当前账号没有数据管理权限，无法查看或操作本频道的数据请求。"], ["mod", "当前账号没有数据管理权限，无法查看或操作本频道的数据请求。"], ["outsider", "当前账号没有数据管理权限，无法查看或操作本频道的数据请求。"]]) {
  const page = await newPage();
  await page.login(name);
  await page.goto(`${BASE}/data/channel-1`);
  const refused = await page.waitFor(`document.querySelector('[role="alert"]')?.textContent === ${JSON.stringify(expectedAlert)}`);
  const controls = await page.eval(`({ inputs: document.querySelectorAll("main input").length, buttons: document.querySelectorAll("main button").length })`);
  expectEq(`${name}: no data actions on the page`, { refused, controls }, { refused: true, controls: { inputs: 0, buttons: 0 } });
}
console.log(`\nscreenshots: ${jsonShot} ${bidiShot}`);
console.log(`\nchecks ${checks}, failures ${failures}`);
ws.close();
chrome.kill("SIGKILL");
process.exit(failures === 0 ? 0 : 1);
