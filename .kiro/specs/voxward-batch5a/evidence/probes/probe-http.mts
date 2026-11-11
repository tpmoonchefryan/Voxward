// HTTP probe against the harness (127.0.0.1:3000) and the Vite dev proxy (127.0.0.1:5173). Usage: tsx probe-http.mts <work>
import { readFileSync } from "node:fs";
import { join } from "node:path";

const [W] = process.argv.slice(2);
const seed = JSON.parse(readFileSync(join(W!, "harness-seed.json"), "utf8"));
const VITE = "http://127.0.0.1:5173";
const APP = "http://127.0.0.1:3000";
const CONTROL = "http://127.0.0.1:3901";
let checks = 0;
let failures = 0;
function expectEq(label: string, actual: unknown, expected: unknown): void {
  checks += 1;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
}
interface Session {
  cookie: string;
  csrf: string;
}
async function login(name: string, base = VITE): Promise<Session> {
  const response = await fetch(`${base}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ loginName: name, password: seed.password }) });
  const body = (await response.json()) as { csrfToken: string };
  const cookie = (response.headers.getSetCookie()[0] ?? "").split(";")[0] ?? "";
  if (response.status !== 200) throw new Error(`login ${name} ${response.status}`);
  return { cookie, csrf: body.csrfToken };
}
async function get(path: string, session?: Session | { bearer: string }, base = VITE) {
  const headers: Record<string, string> = { accept: "application/json" };
  if (session && "cookie" in session) headers.cookie = session.cookie;
  if (session && "bearer" in session) headers.authorization = `Bearer ${session.bearer}`;
  const response = await fetch(`${base}${path}`, { headers });
  const text = await response.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {
    // not JSON
  }
  return { status: response.status, body, cache: response.headers.get("cache-control") };
}
async function post(path: string, session: Session | undefined, payload: unknown, csrf = true, base = VITE) {
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  if (session) {
    headers.cookie = session.cookie;
    if (csrf) headers["x-csrf-token"] = session.csrf;
  }
  const response = await fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(payload) });
  const text = await response.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {
    // not JSON
  }
  return { status: response.status, body };
}
const L = "/internal/channels/channel-1/logs";
const L2 = "/internal/channels/channel-2/logs";
const ids = seed.ids;
const viewerRoutes = [`${L}/change`, `${L}/technical`, `${L}/technical/${ids.long[0]}`, `${L}/chains/corr-long`];

const owner = await login("owner");
const mod = await login("mod");
const modlog = await login("modlog");
const dadmin = await login("dadmin");
const dadminlog = await login("dadminlog");
const owner2 = await login("owner2");
const outsider = await login("outsider");
const downstream = { bearer: seed.downstreamToken as string };

console.log("\n## E70 cross-package: the three new Vite proxies and both route families");
{
  const viaVite = [await get("/healthz"), await get("/auth/session", owner), await get(`${L}/technical?limit=1`, owner), await get("/channels/channel-1/data/capabilities", dadmin)].map((r) => r.status);
  const direct = [await get("/healthz", undefined, APP), await get("/auth/session", owner, APP), await get(`${L}/technical?limit=1`, owner, APP), await get("/channels/channel-1/data/capabilities", dadmin, APP)].map((r) => r.status);
  expectEq("healthz, /auth, /internal, /channels through Vite", viaVite, [200, 200, 200, 200]);
  expectEq("the same four directly on the server", direct, [200, 200, 200, 200]);
  const viewerBad = await get(`${L}/technical?limit=abc`, owner);
  const dataBad = await post("/channels/channel-1/data/requests", dadmin, { subjectRef: "subject-1", kind: "DELETE" });
  const unknown = await get("/internal/channels/channel-1/nothing", owner, APP);
  expectEq("each plugin keeps its own error handler, unknown routes use the fixed 404", [viewerBad.status, viewerBad.body, dataBad.status, dataBad.body, unknown.status, unknown.body], [400, { error: "INVALID_REQUEST" }, 400, { error: "INVALID_REQUEST" }, 404, { error: "NOT_FOUND" }]);
}

console.log("\n## S017 negative cases");
{
  const none = await Promise.all(viewerRoutes.map((path) => get(path)));
  expectEq("no session: 401 on every viewer route", none.map((r) => [r.status, r.body.error]), viewerRoutes.map(() => [401, "UNAUTHENTICATED"]));
  for (const [label, who] of [["downstream output token", downstream], ["moderator without logs.view", mod], ["account with no membership", outsider], ["owner of another channel", owner2]] as const) {
    const results = await Promise.all(viewerRoutes.map((path) => get(path, who)));
    expectEq(`${label}: 403 on every viewer route`, results.map((r) => [r.status, r.body.error]), viewerRoutes.map(() => [403, "FORBIDDEN"]));
  }
  const crossDetail = await get(`${L}/technical/${ids.ch2[0]}`, owner);
  const crossChain = await get(`${L}/chains/corr-ch2`, owner);
  const crossList = await get(`${L2}/technical`, owner);
  const crossChanges = await get(`${L}/change?correlationId=corr-ch2`, owner);
  expectEq("channel-2 entry through channel-1 path, channel-2 chain, channel-2 list, channel-2 change", [crossDetail.status, crossDetail.body, crossChain.status, crossChain.body, crossList.status, crossChanges.body.items.length], [404, { error: "NOT_FOUND" }, 200, { items: [], nextCursor: null }, 403, 0]);
  const bad = [await get(`${L}/technical?cursor=bogus`, owner), await get(`${L}/technical?limit=101`, owner), await get(`${L}/technical?format=csv`, owner), await get(`${L}/chains/corr-long?cursor=-1`, owner), await get(`${L}/technical?batchId=batch-mb`, owner)];
  expectEq("malformed cursor, page size 101, unknown fields: 400 fixed code", bad.map((r) => [r.status, r.body.error]), bad.map(() => [400, "INVALID_REQUEST"]));
  const routes = ["/api/logs", "/logs", "/internal/logs", "/internal/channels/channel-1/logs", `${L}/export`, `${L}/download`, `${L}/technical/export`, `${L}/technical.ndjson`, "/channels/channel-1/logs", `${L}/batches/batch-mb`, "/internal/channels/channel-1/logs/raw"];
  const found = await Promise.all(routes.map((path) => get(path, owner, APP)));
  expectEq("no public, downstream, bulk or batch log route", found.map((r) => r.status), routes.map(() => 404));
  const writes = await Promise.all([post(`${L}/technical`, owner, {}), post(`${L}/chains/corr-long`, owner, {})]);
  expectEq("viewer routes take no writes", writes.map((r) => r.status), [404, 404]);
}

console.log("\n## S017 lists, chain across pages, permissions per field");
async function walk(path: string, session: Session, limit: number | null) {
  const items: any[] = [];
  const pages: number[] = [];
  let cursor: string | null = null;
  let cache: string | null = null;
  do {
    const params = new URLSearchParams();
    if (cursor !== null) params.set("cursor", cursor);
    if (limit !== null) params.set("limit", String(limit));
    const r = await get(`${path}${params.size > 0 ? `?${params}` : ""}`, session);
    if (r.status !== 200) throw new Error(`${path} ${r.status}`);
    cache = r.cache;
    items.push(...r.body.items);
    pages.push(r.body.items.length);
    cursor = r.body.nextCursor;
  } while (cursor !== null);
  return { items, pages, cache };
}
{
  const first = await get(`${L}/technical`, owner);
  expectEq("first technical page: 50 rows, metadata only, no-store", { n: first.body.items.length, next: first.body.nextCursor !== null, content: first.body.items.some((item: object) => "data" in item || "evidence" in item), cache: first.cache }, { n: 50, next: true, content: false, cache: "no-store" });
  const all = await walk(`${L}/technical`, owner, 100);
  const allIds = all.items.map((item) => item.id);
  expectEq("all technical rows of channel 1, metadata-expired row hidden", { n: all.items.length, unique: new Set(allIds).size, channel: all.items.every((item) => item.channelId === "channel-1"), metaexp: allIds.includes(ids.metaexp[0]), evexp: allIds.includes(ids.evexp[0]) }, { n: 137, unique: 137, channel: true, metaexp: false, evexp: true });
  const chainDefault = await walk(`${L}/chains/corr-long`, owner, null);
  const chain100 = await walk(`${L}/chains/corr-long`, owner, 100);
  const chain7 = await walk(`${L}/chains/corr-long`, owner, 7);
  const seqs = chain100.items.map((item) => item.sequence);
  expectEq("chain corr-long across pages", { pagesDefault: chainDefault.pages, pages100: chain100.pages, pages7: chain7.pages.length, ascending: seqs.every((s, i) => i === 0 || s > seqs[i - 1]), sameSet: JSON.stringify(chain7.items.map((i) => i.id)) === JSON.stringify(chain100.items.map((i) => i.id)), matchesSeed: JSON.stringify(chain100.items.map((i) => i.id)) === JSON.stringify(ids.long), retries: [...new Set(chain100.items.filter((i) => i.attempt !== null).map((i) => i.attempt))].sort(), batch: [...new Set(chain100.items.map((i) => i.batchId))].sort() }, { pagesDefault: [50, 50, 30], pages100: [100, 30], pages7: 19, ascending: true, sameSet: true, matchesSeed: true, retries: [1, 2], batch: ["batch-7", null] });
  const validate = ids.long[4];
  const ingest = ids.long[0];
  const kinds = async (session: Session, logId: string) => {
    const r = await get(`${L}/technical/${logId}`, session);
    return r.status === 200 ? r.body.evidence.map((e: any) => `${e.kind}:${e.state}`).sort() : r.status;
  };
  expectEq("owner sees every content kind", [await kinds(owner, validate), await kinds(owner, ingest)], [["ITEM_ID_MAP:AVAILABLE", "TRANSLATION:AVAILABLE", "VALIDATED_JSON:AVAILABLE"], ["MESSAGE_TEXT:AVAILABLE"]]);
  expectEq("moderator with log access: text and translation only", [await kinds(modlog, validate), await kinds(modlog, ingest)], [["TRANSLATION:AVAILABLE"], ["MESSAGE_TEXT:AVAILABLE"]]);
  expectEq("data admin with log access: id map and validated JSON only", [await kinds(dadminlog, validate), await kinds(dadminlog, ingest)], [["ITEM_ID_MAP:AVAILABLE", "VALIDATED_JSON:AVAILABLE"], []]);
  expectEq("data admin without log access: refused", (await get(`${L}/technical/${validate}`, dadmin)).status, 403);
  const detail = await get(`${L}/technical/${validate}`, owner);
  expectEq("detail carries task, model, contract and rule versions", { taskId: detail.body.taskId, modelRef: detail.body.modelRef, contractVersion: detail.body.contractVersion, rule: detail.body.ruleTemplateVersion, batch: detail.body.batchId, data: detail.body.data, cache: detail.cache }, { taskId: "task-1", modelRef: "model-synthetic-x", contractVersion: "1", rule: "rules-synthetic-3", batch: "batch-7", data: { validation: "PASSED" }, cache: "no-store" });
  const bidi = await get(`${L}/technical/${ingest}`, owner);
  expectEq("untrusted text kept as stored (isolation is the page's job)", bidi.body.evidence[0].payload.includes("\u202E") && bidi.body.evidence[0].payload.includes("\u200B"), true);
}

console.log("\n## S017 micro-batch, expiry and deletion");
{
  const mb1 = await Promise.all(ids.mb1.map((id: string) => get(`${L}/technical/${id}`, owner)));
  const text = JSON.stringify(mb1.map((r) => r.body));
  expectEq("micro-batch member one shows only its own content", { batch: mb1.map((r) => r.body.batchId), own: text.includes("batch member one"), other: text.includes("batch member two secret") }, { batch: [null, "batch-mb", "batch-mb"], own: true, other: false });
  const chain = await get(`${L}/chains/corr-mb-1`, owner);
  expectEq("chain of member one holds its three entries only", chain.body.items.map((i: any) => i.correlationId), ["corr-mb-1", "corr-mb-1", "corr-mb-1"]);
  const evexp = await get(`${L}/technical/${ids.evexp[0]}`, owner);
  const metaexp = await get(`${L}/technical/${ids.metaexp[0]}`, owner);
  const metaChain = await get(`${L}/chains/corr-metaexp`, owner);
  expectEq("content past 7 days shows EXPIRED with no payload; metadata past 30 days is gone", { ev: evexp.body.evidence, meta: metaexp.status, chain: metaChain.body.items.length }, { ev: [{ kind: "MESSAGE_TEXT", state: "EXPIRED", payload: null }], meta: 404, chain: 0 });
  const target = ids.mb2[2];
  const warmed = await get(`${L}/technical/${target}`, owner);
  const removal = await (await fetch(`${CONTROL}/remove?subject=subject-2`, { method: "POST" })).json();
  const after = await get(`${L}/technical/${target}`, owner);
  const chain2 = await get(`${L}/chains/corr-mb-2`, owner);
  const list = await walk(`${L}/technical`, owner, 100);
  const changes = await get(`${L}/change?correlationId=corr-mb-2`, owner);
  const mb1After = await get(`${L}/technical/${ids.mb1[2]}`, owner);
  expectEq("deletion of subject-2 through S016 removeSubject", { warmed: warmed.status, removed: removal.logIds.length, detail: after.status, chain: chain2.body.items.length, inList: list.items.some((i) => ids.mb2.includes(i.id)), change: changes.body.items.map((c: any) => c.summary), sibling: mb1After.status }, { warmed: 200, removed: 3, detail: 404, chain: 0, inList: false, change: ["DATA_REQUEST_CERTIFICATE"], sibling: 200 });
}

console.log("\n## S018 permissions");
{
  const cap = async (s?: Session | { bearer: string }) => {
    const r = await get("/channels/channel-1/data/capabilities", s);
    return r.status === 200 ? r.body : [r.status, r.body.error];
  };
  expectEq("capabilities", [await cap(dadmin), await cap(owner), await cap(mod), await cap(modlog), await cap(outsider), await cap(), await cap(downstream)], [{ dataHandle: true }, { dataHandle: false }, { dataHandle: false }, { dataHandle: false }, [403, "FORBIDDEN"], [401, "UNAUTHENTICATED"], [403, "FORBIDDEN"]]);
  const paths = ["/channels/channel-1/data/subjects/subject-1", "/channels/channel-1/data/requests?subjectRef=subject-1"];
  for (const [label, who] of [["owner without DATA_ADMIN", owner], ["moderator", mod], ["moderator with log access", modlog], ["outsider", outsider], ["owner of another channel", owner2], ["downstream token", downstream]] as const) {
    const reads = await Promise.all(paths.map((p) => get(p, who)));
    const write = "bearer" in who ? await get("/channels/channel-1/data/subjects/subject-1", who) : await post("/channels/channel-1/data/requests", who, { subjectRef: "subject-1", kind: "DELETE", mode: "DELETE_DATA_ONLY", requestSource: "VIEWER_REQUEST" });
    expectEq(`${label}: refused on reads and on registration`, [...reads.map((r) => r.status), write.status], [403, 403, 403]);
  }
  expectEq("no session: 401", (await get(paths[0]!)).status, 401);
  expectEq("data admin: other channel's subject is not found, other channel's path is refused", [(await get("/channels/channel-1/data/subjects/subject-3", dadmin)).status, (await get("/channels/channel-2/data/subjects/subject-3", dadmin)).status], [404, 403]);
  expectEq("no nickname or platform-identity lookup route", [(await get("/channels/channel-1/data/subjects?nickname=x", dadmin, APP)).status, (await get("/channels/channel-1/data/lookup?nickname=x", dadmin, APP)).status], [404, 404]);
}

console.log("\n## S018 panel, two deletion entries, verification, external scope");
{
  const s1 = await get("/channels/channel-1/data/subjects/subject-1", dadmin);
  const s2 = await get("/channels/channel-1/data/subjects/subject-2", dadmin);
  const body = JSON.stringify(s1.body);
  expectEq("panel for subject-1", { score: s1.body.currentScore, identity: s1.body.identity?.kind, list: s1.body.list, exception: s1.body.exception?.active, ledger: s1.body.ledgerEntryCount, retention: s1.body.retention.map((r: any) => [r.category, r.retentionDays]), notices: s1.body.notices, cache: s1.cache, noNickname: !body.includes("a".repeat(64)) && !body.includes("synthetic-key") }, { score: 12, identity: "PAID_MEMBER", list: null, exception: true, ledger: 1, retention: [["TECHNICAL_LOG", 30], ["EVIDENCE", 7], ["CHANGE_LOG", 30]], notices: ["PROVIDER_COPY_NOT_CONTROLLED"], cache: "no-store", noNickname: true });
  expectEq("subject-2 shares the nickname digest but is a different subject", { ref: s2.body.subjectRef, score: s2.body.currentScore, list: s2.body.list, exception: s2.body.exception }, { ref: "subject-2", score: -4, list: "BLACKLIST", exception: null });
  const before1 = await (await fetch(`${CONTROL}/facts?subject=subject-1`)).json();
  const noCsrf = await post("/channels/channel-1/data/requests", dadmin, { subjectRef: "subject-1", kind: "DELETE", mode: "DELETE_DATA_ONLY", requestSource: "VIEWER_REQUEST" }, false);
  expectEq("registration without CSRF token is refused", [noCsrf.status, noCsrf.body.error], [403, "CSRF_INVALID"]);
  const reg1 = await post("/channels/channel-1/data/requests", dadmin, { subjectRef: "subject-1", kind: "DELETE", mode: "DELETE_DATA_ONLY", requestSource: "VIEWER_REQUEST" });
  const reg2 = await post("/channels/channel-1/data/requests", dadmin, { subjectRef: "subject-2", kind: "DELETE", mode: "DELETE_AND_EXCEPT", requestSource: "VIEWER_REQUEST" });
  expectEq("both deletion entries only register", [reg1.status, reg1.body.stage, reg1.body.execution, reg2.status, reg2.body.stage, reg2.body.mode], [201, "AWAITING_VERIFICATION", "PENDING", 201, "AWAITING_VERIFICATION", "DELETE_AND_EXCEPT"]);
  const bad = [
    await post(`/channels/channel-1/data/requests/${reg1.body.requestId}/verification`, dadmin, { verdict: "VERIFIED" }),
    await post(`/channels/channel-1/data/requests/${reg1.body.requestId}/verification`, dadmin, { verdict: "VERIFIED", method: "NICKNAME" }),
    await post(`/channels/channel-1/data/requests/${reg1.body.requestId}/verification`, dadmin, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP", nickname: "Alice" }),
    await post("/channels/channel-1/data/requests", dadmin, { subjectRef: "subject-1", kind: "DELETE", requestSource: "VIEWER_REQUEST" }),
    await post("/channels/channel-1/data/requests", dadmin, { subjectRef: "subject-1", kind: "ACCESS", mode: "DELETE_DATA_ONLY", requestSource: "VIEWER_REQUEST" }),
  ];
  expectEq("verification needs a non-nickname method; a deletion needs a mode", bad.map((r) => r.status), [400, 400, 400, 400, 400]);
  const verified = await post(`/channels/channel-1/data/requests/${reg1.body.requestId}/verification`, dadmin, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });
  const again = await post(`/channels/channel-1/data/requests/${reg1.body.requestId}/verification`, dadmin, { verdict: "REJECTED" });
  expectEq("verified once, never twice", [verified.status, verified.body.stage, verified.body.verification.method, again.status, again.body.error], [200, "AWAITING_EXECUTION", "ACCOUNT_OWNERSHIP", 409, "ALREADY_DECIDED"]);
  const rejected = await post(`/channels/channel-1/data/requests/${reg2.body.requestId}/verification`, dadmin, { verdict: "REJECTED" });
  expectEq("rejected request is cancelled", [rejected.body.stage, rejected.body.execution], ["REJECTED", "CANCELLED"]);
  const access = await post("/channels/channel-1/data/requests", dadmin, { subjectRef: "subject-1", kind: "ACCESS", requestSource: "OPERATOR_INITIATED" });
  const accessVerified = await post(`/channels/channel-1/data/requests/${access.body.requestId}/verification`, dadmin, { verdict: "VERIFIED", method: "REQUEST_AUTHORIZATION" });
  expectEq("access request is registered but not executed here", [access.status, accessVerified.body.stage], [201, "NOT_EXECUTED_HERE"]);
  const after1 = await (await fetch(`${CONTROL}/facts?subject=subject-1`)).json();
  const after2 = await (await fetch(`${CONTROL}/facts?subject=subject-2`)).json();
  expectEq("plain deletion keeps the existing exception; nothing about the subjects changes", { exc1: [before1.exceptions, after1.exceptions], score1: after1.score, gen1: after1.generation, ledger1: after1.ledger, exc2: after2.exceptions, list2: after2.lists, gen2: after2.generation }, { exc1: [[{ id: "exception-1", removed_at: null }], [{ id: "exception-1", removed_at: null }]], score1: [{ current_score: 12 }], gen1: [{ processing_generation: 0 }], ledger1: [{ n: 1 }], exc2: [], list2: [{ id: "list-1", list_kind: "BLACKLIST", removed_at: null }], gen2: [{ processing_generation: 0 }] });
  await fetch(`${CONTROL}/partial?request=${reg1.body.requestId}`, { method: "POST" });
  const partial = await get(`/channels/channel-1/data/requests/${reg1.body.requestId}`, dadmin);
  expectEq("partial failure is shown with targets and counts", { stage: partial.body.stage, counts: partial.body.counts, failed: partial.body.targets.filter((t: any) => t.state === "FAILED") }, { stage: "PARTIAL_FAILED", counts: { done: 1, failed: 1, pending: 1 }, failed: [{ targetKind: "SCORE_LEDGER", state: "FAILED", errorCode: "LEDGER_LOCKED" }] });
  const material = [await get(`/channels/channel-1/data/requests/${reg1.body.requestId}/material`, dadmin, APP), await get("/channels/channel-1/data/export", dadmin, APP)];
  expectEq("no material or export route", material.map((r) => r.status), [404, 404]);
  const facts = await (await fetch(`${CONTROL}/facts?subject=subject-1`)).json();
  const summaries = facts.changeLogs.map((c: any) => c.summary);
  expectEq("data-request change rows use fixed templates", summaries.every((s: string) => /^DATA_REQUEST (registered kind=[A-Z_]+ mode=[A-Z_]+ source=[A-Z_]+|verification=[A-Z]+ method=[A-Z_]+) request=[0-9a-f-]+$/.test(s)), true);
  console.log(`   change rows: ${summaries.length}`);
}
console.log(`\nchecks ${checks}, failures ${failures}`);
process.exit(failures === 0 ? 0 : 1);
