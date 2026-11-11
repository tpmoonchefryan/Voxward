// Batch m7b, S021 acceptance probe (E60). Real app (buildApp) on 127.0.0.1 with a migrated scratch SQLite, real ws
// clients and hand-made TCP consumers; a controlled harness (same endpoint, registry, ports and pump as app.ts, with a
// settable clock) for the status and resend rules. Synthetic data only. Prints OK/FAIL/NOTE lines and a final count.
// Usage: tsx probe-m7b-s021.mts <checkout>
import http from "node:http";
import type net from "node:net";
import {
  account, addRow, addText, all, attachNativeOutput, check, client, clientFrame, closeAllSockets, closeCodeOf, consumer,
  contracts, createDeliveryPump, createSubscriptionRegistry, databaseContains, decision, decisionStoreOf, FAR_FUTURE, finish, fx, grant,
  issueOutputToken, note, rawConsumer, rawExchange, rowOf, runShortTransaction, section, setStatus, setValidity, sha256,
  sleep, sql, startApp, store, T0, textFramesOf, upgradeRequest, waitUntil, wireFrames,
} from "./lib-m7b.mts";

const QUIET = { heartbeatMs: 60_000, pongTimeoutMs: 60_000, sendTimeoutMs: 2_000, closeGraceMs: 500 };
const types = (frames: any[]) => frames.map((frame) => (frame.type === "HELLO" ? "HELLO" : `${frame.type}:${frame.deliveryId}`));
const keys = (value: unknown) => Object.keys(value as object);
const BARE_401 = "HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n";
const BARE_404 = "HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n";
const headers = (session: { cookie: string; csrf: string }) => ({ cookie: session.cookie, "x-csrf-token": session.csrf });
const credentialsSeen: string[] = [];

// =====================================================================================================================
section("G grant, credential delivery and subscription (Q16, Q18)");
{
  const h = await startApp({ heartbeatMs: 100, pongTimeoutMs: 5_000, sendTimeoutMs: 2_000, closeGraceMs: 500 });
  const owner = await account(h.app, h.db, "owner", "channel-a", "CHANNEL_OWNER");
  const mod = await account(h.app, h.db, "moderator", "channel-a", "MODERATOR");
  const admin = await account(h.app, h.db, "dataadmin", "channel-a", "DATA_ADMIN");
  const ownerB = await account(h.app, h.db, "ownerb", "channel-b", "CHANNEL_OWNER");

  const issued = await h.app.inject({ method: "POST", url: "/channels/channel-a/output-grants", headers: headers(owner) });
  const body = issued.json() as { grantId: string; credential: string };
  credentialsSeen.push(body.credential);
  check("G1", issued.statusCode === 201 && issued.headers["cache-control"] === "no-store" && JSON.stringify(keys(body)) === '["grantId","credential"]' && /^vwo_[A-Za-z0-9_-]{43}$/.test(body.credential),
    "owner issues a grant: 201, cache-control no-store, body {grantId, credential}, credential vwo_ + 43 base64url", { status: issued.statusCode, cache: issued.headers["cache-control"], keys: keys(body) });

  const ref = all(h.db, "SELECT r.purpose, r.secret_ref, r.channel_id, r.revoked_at FROM credential_refs r JOIN output_grants g ON g.credential_ref_id = r.id WHERE g.id = ?", body.grantId)[0];
  const grantRow = all(h.db, "SELECT channel_id, output_kind, scope, revoked_at FROM output_grants WHERE id = ?", body.grantId)[0];
  check("G2", ref?.purpose === "OUTPUT_GRANT" && ref?.secret_ref === `secretref:${sha256(body.credential)}` && ref?.channel_id === "channel-a" && grantRow?.output_kind === "NATIVE_V1" && grantRow?.scope === "ROOM_READ_ONLY" && grantRow?.channel_id === "channel-a" && databaseContains(h.db, body.credential).length === 0,
    "the grant is a credential_refs row (OUTPUT_GRANT, secretref:+SHA-256) and an output_grants row (NATIVE_V1, ROOM_READ_ONLY); the raw credential is in no table", { ref, grantRow, rawCredentialIn: databaseContains(h.db, body.credential) });

  const before = all(h.db, "SELECT count(*) AS n FROM output_grants")[0].n;
  const denied = [
    await h.app.inject({ method: "POST", url: "/channels/channel-a/output-grants", headers: headers(mod) }),
    await h.app.inject({ method: "POST", url: "/channels/channel-a/output-grants", headers: headers(admin) }),
    await h.app.inject({ method: "POST", url: "/channels/channel-a/output-grants", headers: headers(ownerB) }),
    await h.app.inject({ method: "POST", url: "/channels/channel-a/output-grants", headers: { cookie: owner.cookie } }),
    await h.app.inject({ method: "POST", url: "/channels/channel-a/output-grants", headers: { authorization: `Bearer ${body.credential}` } }),
  ].map((response) => response.statusCode);
  const s003 = runShortTransaction(h.db.database, (tx: any) => issueOutputToken(tx, { channelId: "channel-a", createdByAccountId: owner.accountId, now: new Date(T0) })) as { token: string };
  const viaS003 = (await h.app.inject({ method: "POST", url: "/channels/channel-a/output-grants", headers: { authorization: `Bearer ${s003.token}` } })).statusCode;
  check("G3", JSON.stringify(denied) === "[403,403,403,403,401]" && viaS003 === 403 && all(h.db, "SELECT count(*) AS n FROM output_grants")[0].n === before,
    "moderator, data admin, another channel's owner and a request without CSRF get 403; the native credential as Bearer gets 401; an S003 downstream token gets 403; nothing is written", { denied, viaS003 });

  const c1 = consumer(h.port, body.credential);
  const raw = await rawExchange(h.port, upgradeRequest(h.port, { protocol: `vw-output.v1, vw-cred.${body.credential}` }), 600);
  const rawHead = raw.text.split("\r\n\r\n")[0] ?? "";
  await c1.opened;
  await waitUntil(() => c1.frames.length >= 1);
  check("G4", c1.ws.protocol === "vw-output.v1" && /\r\nSec-WebSocket-Protocol: vw-output\.v1\r?$/m.test(rawHead) && !raw.text.includes(body.credential) && JSON.stringify(keys(c1.frames[0])) === JSON.stringify(contracts.NATIVE_FRAME_FIELDS.HELLO) && c1.frames[0]?.type === "HELLO",
    "the subprotocol credential opens the room; the server selects only vw-output.v1, never echoes the credential, and sends HELLO first", { protocol: c1.ws.protocol, selected: rawHead.split("\r\n").filter((line) => /protocol/i.test(line)), hello: c1.frames[0] });

  const unknown = `vwo_${"A".repeat(43)}`;
  const refusals: Record<string, string> = {
    queryOnly: (await rawExchange(h.port, upgradeRequest(h.port, { path: `/output/v1/room?credential=${body.credential}`, protocol: "vw-output.v1" }))).text,
    queryWithSubprotocolNameOnly: (await rawExchange(h.port, upgradeRequest(h.port, { path: `/output/v1/room?vw-cred.${body.credential}`, protocol: "vw-output.v1" }))).text,
    authorizationBearer: (await rawExchange(h.port, upgradeRequest(h.port, { protocol: "vw-output.v1", extra: `Authorization: Bearer ${body.credential}\r\n` }))).text,
    cookie: (await rawExchange(h.port, upgradeRequest(h.port, { protocol: "vw-output.v1", extra: `Cookie: vw_output=${body.credential}\r\n` }))).text,
    otherHeader: (await rawExchange(h.port, upgradeRequest(h.port, { protocol: "vw-output.v1", extra: `X-Output-Credential: ${body.credential}\r\n` }))).text,
    credWithoutProtocolName: (await rawExchange(h.port, upgradeRequest(h.port, { protocol: `vw-cred.${body.credential}` }))).text,
    twoCredentials: (await rawExchange(h.port, upgradeRequest(h.port, { protocol: `vw-output.v1, vw-cred.${body.credential}, vw-cred.${unknown}` }))).text,
    malformed: (await rawExchange(h.port, upgradeRequest(h.port, { protocol: "vw-output.v1, vw-cred.vwo_short" }))).text,
    unknown: (await rawExchange(h.port, upgradeRequest(h.port, { protocol: `vw-output.v1, vw-cred.${unknown}` }))).text,
    s003TokenAsCredential: (await rawExchange(h.port, upgradeRequest(h.port, { protocol: `vw-output.v1, vw-cred.${s003.token}` }))).text,
  };
  const notFound = {
    inPath: (await rawExchange(h.port, upgradeRequest(h.port, { path: `/output/v1/room/${body.credential}`, protocol: `vw-output.v1, vw-cred.${body.credential}` }))).text,
    otherPath: (await rawExchange(h.port, upgradeRequest(h.port, { path: "/output/v1/other", protocol: `vw-output.v1, vw-cred.${body.credential}` }))).text,
  };
  check("G5", Object.values(refusals).every((text) => text === BARE_401) && Object.values(notFound).every((text) => text === BARE_404),
    "credential in the query, an Authorization header, a cookie or another header, without vw-output.v1, twice, malformed, unknown, or an S003 token: bare 401 with no body; credential in the path or another path: bare 404", Object.fromEntries(Object.entries({ ...refusals, ...notFound }).map(([key, text]) => [key, text.split("\r\n")[0]])));

  // Q18: either table alone decides, and the scope rule is enforced on both.
  const variants: Record<string, { mutate: (grantId: string) => void }> = {
    credentialRefRevoked: { mutate: (id) => sql(h.db, "UPDATE credential_refs SET revoked_at = ? WHERE id = (SELECT credential_ref_id FROM output_grants WHERE id = ?)", T0, id) },
    outputGrantRevoked: { mutate: (id) => sql(h.db, "UPDATE output_grants SET revoked_at = ? WHERE id = ?", T0, id) },
    purposeNotOutput: { mutate: (id) => sql(h.db, "UPDATE credential_refs SET purpose = 'MODEL_ACCESS' WHERE id = (SELECT credential_ref_id FROM output_grants WHERE id = ?)", id) },
    channelMismatch: { mutate: (id) => sql(h.db, "UPDATE credential_refs SET channel_id = 'channel-b' WHERE id = (SELECT credential_ref_id FROM output_grants WHERE id = ?)", id) },
    kindNotNative: { mutate: (id) => sql(h.db, "UPDATE output_grants SET output_kind = 'BLIVECHAT_V1' WHERE id = ?", id) },
  };
  const q18: Record<string, unknown> = {};
  let q18ok = true;
  for (const [name, variant] of Object.entries(variants)) {
    const g = grant(h.db);
    credentialsSeen.push(g.credential);
    const live = consumer(h.port, g.credential);
    const wasOpen = await live.opened;
    const started = Date.now();
    variant.mutate(g.grantId);
    const closing = await Promise.race([live.closed, sleep(2_000).then(() => ({ code: -1, reason: "still open after 2 s" }))]);
    const reconnect = (await rawExchange(h.port, upgradeRequest(h.port, { protocol: `vw-output.v1, vw-cred.${g.credential}` }))).text;
    q18[name] = { wasOpen, closing, afterMs: Date.now() - started, reconnect: reconnect.split("\r\n")[0] };
    q18ok &&= wasOpen && closing.code === 4403 && closing.reason === "GRANT_REVOKED" && reconnect === BARE_401;
  }
  check("G6", q18ok, "each of: credential_refs revoked, output_grants revoked, purpose not OUTPUT_GRANT, credential channel differs, kind not NATIVE_V1 closes a live consumer with 4403 within a heartbeat (100 ms here) and refuses a reconnect with 401", q18);

  // The room comes from the grant.
  const gB = grant(h.db, "channel-b");
  credentialsSeen.push(gB.credential);
  addRow(h.db, { channelId: "channel-a", n: 1, verdict: "ALLOW_MEANINGFUL", deliveryId: "a-1", text: "TEXT-A1" });
  addRow(h.db, { channelId: "channel-b", n: 1, verdict: "ALLOW_MEANINGFUL", deliveryId: "b-1", text: "TEXT-B1" });
  setValidity(h.db, { "a-1": FAR_FUTURE, "b-1": FAR_FUTURE });
  const cB = consumer(h.port, gB.credential);
  await cB.opened;
  await waitUntil(() => c1.frames.length >= 2 && cB.frames.length >= 2);
  await sleep(150);
  check("G7", JSON.stringify(types(c1.frames)) === '["HELLO","DELIVER:a-1"]' && JSON.stringify(types(cB.frames)) === '["HELLO","DELIVER:b-1"]',
    "a consumer receives only its grant's channel: channel-a's consumer gets a-1 only, channel-b's gets b-1 only", { a: types(c1.frames), b: types(cB.frames) });

  // Revocation by the route closes every connection of that grant and only those.
  const c2 = consumer(h.port, body.credential);
  const other = grant(h.db);
  credentialsSeen.push(other.credential);
  const c3 = consumer(h.port, other.credential);
  await Promise.all([c2.opened, c3.opened]);
  const c1Closed = c1.closed;
  const c2Closed = c2.closed;
  const crossChannel = (await h.app.inject({ method: "DELETE", url: `/channels/channel-b/output-grants/${body.grantId}`, headers: headers(ownerB) })).statusCode;
  const crossOwner = (await h.app.inject({ method: "DELETE", url: `/channels/channel-a/output-grants/${body.grantId}`, headers: headers(ownerB) })).statusCode;
  const byModerator = (await h.app.inject({ method: "DELETE", url: `/channels/channel-a/output-grants/${body.grantId}`, headers: headers(mod) })).statusCode;
  await sleep(150);
  const stillOpen = c1.ws.readyState === 1 && c2.ws.readyState === 1;
  const revoked = await h.app.inject({ method: "DELETE", url: `/channels/channel-a/output-grants/${body.grantId}`, headers: headers(owner) });
  const [r1, r2] = await Promise.all([c1Closed, c2Closed]);
  await sleep(150);
  const again = (await h.app.inject({ method: "DELETE", url: `/channels/channel-a/output-grants/${body.grantId}`, headers: headers(owner) })).statusCode;
  const reconnect = (await rawExchange(h.port, upgradeRequest(h.port, { protocol: `vw-output.v1, vw-cred.${body.credential}` }))).text;
  check("G8", crossChannel === 404 && crossOwner === 403 && byModerator === 403 && stillOpen && revoked.statusCode === 204 && r1.code === 4403 && r1.reason === "GRANT_REVOKED" && r2.code === 4403 && c3.ws.readyState === 1 && again === 404 && reconnect === BARE_401,
    "owner DELETE: 204, both connections of the grant close 4403 GRANT_REVOKED, another grant's consumer stays open, a second DELETE is 404, reconnect 401; another channel's owner (403/404) and a moderator (403) revoke nothing", { crossChannel, crossOwner, byModerator, stillOpen, revoked: revoked.statusCode, r1, r2, otherOpen: c3.ws.readyState === 1, again, reconnect: reconnect.split("\r\n")[0] });

  // A consumer that ignores the close frame is still cut off.
  const gr = grant(h.db);
  credentialsSeen.push(gr.credential);
  const deaf = await rawConsumer(h.port, gr.credential);
  await sleep(100);
  const t0 = Date.now();
  const rv = await h.app.inject({ method: "DELETE", url: `/channels/channel-a/output-grants/${gr.grantId}`, headers: headers(owner) });
  const droppedAfter = await Promise.race([deaf.ended.then(() => Date.now() - t0), sleep(3_000).then(() => -1)]);
  const bytes = Buffer.concat(deaf.received);
  const afterClose = wireFrames(bytes).slice(wireFrames(bytes).findIndex((frame) => frame.opcode === 0x8) + 1);
  check("G9", rv.statusCode === 204 && closeCodeOf(bytes) === 4403 && droppedAfter >= 0 && droppedAfter < 1_500 && afterClose.length === 0,
    "a consumer that never answers the close frame gets 4403 and the server drops the TCP connection after the close grace (500 ms here); nothing follows the close frame", { droppedAfterMs: droppedAfter, closeCode: closeCodeOf(bytes) });

  // Logs and the native credential as an HTTP credential.
  const asBearer = [
    (await h.app.inject({ method: "GET", url: "/channels/channel-a/members", headers: { authorization: `Bearer ${other.credential}` } })).statusCode,
    (await h.app.inject({ method: "GET", url: "/internal/channels/channel-a/logs/change", headers: { authorization: `Bearer ${other.credential}` } })).statusCode,
  ];
  check("G10", JSON.stringify(asBearer) === "[401,401]", "the native output credential opens no HTTP route (members, Change Log viewer): 401", asBearer);
  const joined = h.logs.join("");
  const leaked = credentialsSeen.filter((credential) => joined.includes(credential) || joined.includes(sha256(credential)));
  const refusalLines = h.logs.filter((line) => line.includes("native output upgrade refused")).map((line) => JSON.parse(line));
  const refusalKeys = [...new Set(refusalLines.map((line) => Object.keys(line).filter((key) => !["level", "time", "pid", "hostname", "msg"].includes(key)).sort().join(",")))];
  check("G11", leaked.length === 0 && refusalLines.length > 0 && JSON.stringify(refusalKeys) === '["reason,status"]',
    "no credential and no credential digest in any log line; an upgrade refusal logs only status and reason", { logLines: h.logs.length, refusalLines: refusalLines.length, refusalKeys, leaked: leaked.length });
  closeAllSockets();
  await h.stop();
}

// =====================================================================================================================
section("Q framework errors and log redaction (Q25)");
{
  const h = await startApp(QUIET);
  const token = `vwo_${"Q".repeat(43)}`;
  const get = (path: string, extra = "") => rawExchange(h.port, `GET ${path} HTTP/1.1\r\nHost: 127.0.0.1:${h.port}\r\n${extra}Connection: close\r\n\r\n`);
  const bodyOf = (text: string) => text.split("\r\n\r\n").slice(1).join("\r\n\r\n");
  const statusOf = (text: string) => text.split("\r\n")[0];
  const longParam = await get(`/channels/${token}${"q".repeat(80)}/members`);
  const badUrl = await get(`/channels/%E0%A4%A/members`);
  const plain = await get(`/x/${token}`);
  const encoded = await get(`/x/vwo%5F${"Q".repeat(43)}`);
  const fullyEncoded = await get(`/x/${Buffer.from(token).toString("hex").replace(/(..)/g, "%$1")}`);
  const doubly = await get(`/x/vwo%255F${"Q".repeat(43)}`);
  const host = await rawExchange(h.port, `GET /healthz HTTP/1.1\r\nHost: ${token}.example\r\nConnection: close\r\n\r\n`);
  const query = await get(`/healthz?credential=${token}`);
  const malformed = await rawExchange(h.port, `GET /x/${token} HTTP/1.1\r\nHost: a\r\nBad Header ${token}\r\n\r\n`);
  await sleep(100);
  check("Q1", statusOf(longParam.text) === "HTTP/1.1 414 URI Too Long" && bodyOf(longParam.text) === '{"error":"URI_TOO_LONG"}',
    "a path parameter over the limit: 414 with the fixed body, the URL is not repeated", { status: statusOf(longParam.text), body: bodyOf(longParam.text) });
  check("Q2", statusOf(badUrl.text) === "HTTP/1.1 400 Bad Request" && bodyOf(badUrl.text) === '{"error":"BAD_REQUEST"}',
    "a malformed percent escape: 400 with the fixed body", { status: statusOf(badUrl.text), body: bodyOf(badUrl.text) });
  check("Q3", [plain, encoded, fullyEncoded, doubly, host, query].every((response) => !response.text.includes(token) && !response.text.includes("%5F")) && !malformed.text.includes(token),
    "no response body or header repeats the token, plain or percent-encoded; a request the HTTP parser rejects gets the parser's fixed reply", { malformed: statusOf(malformed.text), malformedBody: bodyOf(malformed.text) });
  const lines = h.logs.map((line) => JSON.parse(line));
  const urls = lines.filter((line) => line.req !== undefined).map((line) => ({ url: line.req.url, host: line.req.host }));
  const leakedLines = h.logs.filter((line) => line.includes(token));
  check("Q4", leakedLines.length === 0 && urls.some((entry) => entry.url === "/x/[REDACTED]") && urls.some((entry) => entry.host === "[REDACTED].example") && urls.some((entry) => entry.url === "/healthz") && !h.logs.join("").includes("credential="),
    "logs: the plain, %5F-encoded and fully encoded token in the path and the token in Host are [REDACTED]; the query string is not logged", { urls });
  const doubleLogged = urls.find((entry) => typeof entry.url === "string" && entry.url.includes("%5F"));
  note("Q5", "double-encoded token (vwo%255F...) in the path: logged after one decoding step as", doubleLogged?.url ?? "(not logged)");
  closeAllSockets();
  await h.stop();
}

// =====================================================================================================================
section("C heartbeat, client data, backlog and close codes");
{
  const h = await startApp({ heartbeatMs: 80, pongTimeoutMs: 250, sendTimeoutMs: 400, closeGraceMs: 300 });
  const g1 = grant(h.db);
  const live = consumer(h.port, g1.credential);
  let pings = 0;
  live.ws.on("ping", () => (pings += 1));
  await live.opened;
  await waitUntil(() => pings >= 4, 3_000);
  check("C1", live.ws.readyState === 1 && pings >= 4 && h.closed.length === 0, "a consumer that answers every ping stays connected across heartbeats", { pings });

  const textSender = consumer(h.port, grant(h.db).credential);
  await textSender.opened;
  textSender.ws.send(JSON.stringify({ type: "ACK", deliveryId: "x" }));
  const textClose = await textSender.closed;
  const g3 = grant(h.db);
  const binarySender = await rawConsumer(h.port, g3.credential);
  binarySender.socket.write(clientFrame(0x2, Buffer.from([1, 2, 3])));
  await Promise.race([binarySender.ended, sleep(2_000)]);
  const binaryClose = closeCodeOf(Buffer.concat(binarySender.received));
  check("C2", textClose.code === 4400 && textClose.reason === "CLIENT_DATA_NOT_ACCEPTED" && binaryClose === 4400,
    "a text or binary data frame from the consumer closes it with 4400 CLIENT_DATA_NOT_ACCEPTED", { textClose, binaryClose });

  const g4 = grant(h.db);
  const silent = await rawConsumer(h.port, g4.credential);
  const silentEnded = await Promise.race([silent.ended, sleep(3_000).then(() => -1)]);
  const silentBytes = Buffer.concat(silent.received);
  check("C3", wireFrames(silentBytes).some((frame) => frame.opcode === 0x9) && closeCodeOf(silentBytes) === 4408 && silentEnded > 0 && h.closed.some((entry) => entry.grantId === g4.grantId && entry.code === 4408),
    "a consumer that never answers a ping gets 4408 HEARTBEAT_TIMEOUT and is dropped", { endedAfterMs: silentEnded, closeCode: closeCodeOf(silentBytes) });

  closeAllSockets();
  await h.stop();

  // Backlog: heartbeats quiet, so only the send timeout can close the consumer.
  const hb = await startApp({ ...QUIET, sendTimeoutMs: 400, closeGraceMs: 300 });
  const reader = consumer(hb.port, grant(hb.db).credential);
  await reader.opened;
  const g5 = grant(hb.db);
  const stuck = await rawConsumer(hb.port, g5.credential);
  stuck.socket.pause();
  addRow(hb.db, { channelId: "channel-a", n: 50, verdict: "ALLOW_MEANINGFUL", deliveryId: "big", text: "x".repeat(16 * 1024 * 1024) });
  setValidity(hb.db, { big: FAR_FUTURE });
  const backlogged = await waitUntil(() => hb.closed.some((entry) => entry.grantId === g5.grantId && entry.code === 4413), 10_000);
  stuck.socket.resume();
  const stuckEnded = await Promise.race([stuck.ended, sleep(5_000).then(() => -1)]);
  await waitUntil(() => rowOf(hb.db, "big")?.status === "SENT", 5_000);
  check("C4", backlogged && stuckEnded > 0 && hb.closed.filter((entry) => entry.grantId === g5.grantId).every((entry) => entry.code === 4413),
    "a consumer that does not take a frame within the send timeout is closed with 4413 SUBSCRIBER_BACKPRESSURE and dropped", { closed: hb.closed.filter((entry) => entry.grantId === g5.grantId) });
  note("C4b", "row 'big' after the backlogged consumer left: status/attempts; frames the reading consumer got for it", { row: rowOf(hb.db, "big"), copies: reader.frames.filter((frame) => frame.deliveryId === "big").length });
  closeAllSockets();
  await hb.stop();

  const reasons = new Set([textClose.reason]);
  check("C5", [...reasons].every((reason) => ["CLIENT_DATA_NOT_ACCEPTED", "GRANT_REVOKED", "HEARTBEAT_TIMEOUT", "SUBSCRIBER_BACKPRESSURE"].includes(reason)) && JSON.stringify(Object.values(contracts.NATIVE_CLOSE).map((value: any) => value.code)) === "[4400,4403,4408,4413]",
    "close codes are the four application codes, each with its one fixed reason text", contracts.NATIVE_CLOSE);
}

// =====================================================================================================================
section("D frames: one ALLOW/BLOCK output, WARD_BLOCKED without text or identity");
{
  const h = await startApp(QUIET);
  addRow(h.db, { channelId: "channel-a", n: 3, verdict: "ALLOW_MEANINGFUL", deliveryId: "d-allow", text: "ALLOW-TEXT-3", platformOrder: 30 });
  addText(h.db, "channel-a", "event-channel-a-3", "TRANSLATION-3", "TRANSLATION");
  addRow(h.db, { channelId: "channel-a", n: 1, verdict: "BLOCK", deliveryId: "d-block", text: "BLOCKED-ORIGINAL-WORDING", platformOrder: 10 });
  addRow(h.db, { channelId: "channel-a", n: 2, verdict: "ALLOW_NOISE", deliveryId: "d-noise", text: "wwwww", platformOrder: 20 });
  setValidity(h.db, { "d-allow": FAR_FUTURE, "d-block": FAR_FUTURE, "d-noise": FAR_FUTURE });
  const gx = grant(h.db);
  const gy = grant(h.db);
  const x = consumer(h.port, gx.credential);
  const y = consumer(h.port, gy.credential);
  await Promise.all([x.opened, y.opened]);
  await waitUntil(() => x.frames.length >= 4 && y.frames.length >= 4);
  await sleep(150);
  const deliver = x.frames.find((frame) => frame.deliveryId === "d-allow");
  const blocked = x.frames.find((frame) => frame.deliveryId === "d-block");
  const noise = x.frames.find((frame) => frame.deliveryId === "d-noise");
  check("D1", JSON.stringify(keys(deliver)) === JSON.stringify(contracts.NATIVE_FRAME_FIELDS.DELIVER) && JSON.stringify(keys(deliver?.display)) === JSON.stringify(contracts.NATIVE_FRAME_FIELDS.DISPLAY) && deliver?.display.label === null && deliver?.display.text === "ALLOW-TEXT-3" && deliver?.display.translation === "TRANSLATION-3",
    "ALLOW: DELIVER with exactly the listed keys; display {label null, text, translation}", deliver);
  const everything = JSON.stringify([x.frames, y.frames]);
  check("D2", blocked?.type === "WARD_BLOCKED" && JSON.stringify(keys(blocked)) === JSON.stringify(contracts.NATIVE_FRAME_FIELDS.WARD_BLOCKED) && !everything.includes("BLOCKED-ORIGINAL-WORDING"),
    "BLOCK: WARD_BLOCKED with exactly the listed keys; the blocked wording is in no frame", blocked);
  const forbidden = ["UCviewerSTABLEID", "msgrefSECRET", "corr-", "subject-", "verdict-", "task-", "score", "reason", "mod-1", gx.credential, gy.credential];
  check("D3", forbidden.every((needle) => !everything.includes(needle)),
    "no frame carries the subject key, platform message reference, correlation, subject, verdict or task identifiers, a score, a reason, the moderator or a credential", forbidden.filter((needle) => everything.includes(needle)));
  check("D4", JSON.stringify(types(x.frames)) === JSON.stringify(types(y.frames)) && JSON.stringify(types(x.frames)) === '["HELLO","WARD_BLOCKED:d-block","DELIVER:d-noise","DELIVER:d-allow"]',
    "every consumer of the room gets the same frames, in platform order (10, 20, 30)", { x: types(x.frames), y: types(y.frames) });
  check("D5", noise?.type === "DELIVER" && noise?.display.text === "wwwww", "ALLOW_NOISE goes out on the same DELIVER frame as other approved messages", noise);
  closeAllSockets();
  await h.stop();
}

// =====================================================================================================================
section("S delivery status, bounded sending and resend (controlled clock; Q56)");
async function controlled() {
  const db = fx.openDecisionDatabase("probe-m7b-ctl-");
  fx.seedChannel(db.database, "channel-a");
  const server = http.createServer();
  const registry = createSubscriptionRegistry();
  const closed: Array<{ grantId: string; code: number }> = [];
  const endpoint = attachNativeOutput(server, { grants: store.createOutputGrantPort(db.database), subscribers: registry, timing: QUIET, onClosed: (entry: any) => void closed.push(entry) });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const port = (server.address() as net.AddressInfo).port;
  const clock = { now: new Date(fx.DECIDED_AT) };
  const pump = createDeliveryPump({ delivery: store.createOutputDeliveryPort(db.database), content: store.createApprovedContentPort(db.database), subscribers: registry, now: () => clock.now, batchLimit: 50, expireLimit: 500, maxAttempts: 3 });
  // One set of decision dependencies with one identifier counter, read against the settable clock.
  let ids = 0;
  const shared = { store: decisionStoreOf(db), newId: () => `svc-${++ids}`, now: () => clock.now, limits: decision.DEFAULT_DECISION_LIMITS };
  const deps = () => shared;
  return {
    db, registry, port, clock, pump, closed, deps,
    async stop() {
      endpoint.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      db.close();
    },
  };
}
{
  const c = await controlled();
  const at = (iso: string) => (c.clock.now = new Date(iso));
  const mod = fx.moderator("mod-1");
  addRow(c.db, { channelId: "channel-a", n: 1, verdict: "ALLOW_MEANINGFUL", deliveryId: "r-pend", text: "T-PEND" });
  addRow(c.db, { channelId: "channel-a", n: 2, verdict: "ALLOW_MEANINGFUL", deliveryId: "r-exp", text: "T-EXP" });
  addRow(c.db, { channelId: "channel-a", n: 3, verdict: "ALLOW_MEANINGFUL", deliveryId: "r-sent", text: "T-SENT" });
  addRow(c.db, { channelId: "channel-a", n: 4, verdict: "ALLOW_MEANINGFUL", deliveryId: "r-failed", text: "T-FAILED" });
  addRow(c.db, { channelId: "channel-a", n: 5, verdict: "ALLOW_MEANINGFUL", deliveryId: "r-cancel", text: "T-CANCEL" });
  addRow(c.db, { channelId: "channel-a", n: 6, verdict: "ALLOW_MEANINGFUL", deliveryId: "r-expired", text: "T-EXPIRED" });
  addRow(c.db, { channelId: "channel-a", n: 7, verdict: "ALLOW_MEANINGFUL", deliveryId: "r-old", text: "T-OVERTURNED" });
  setValidity(c.db, { "r-exp": "2026-11-10T10:00:05.000Z" });
  setStatus(c.db, "r-sent", "SENT");
  setStatus(c.db, "r-failed", "FAILED");
  setStatus(c.db, "r-cancel", "CANCELLED");
  setStatus(c.db, "r-expired", "EXPIRED");
  const over = decision.overturnEvent(c.deps(), { eventId: "event-channel-a-7", operationId: "op-block-7", verdict: contracts.createVerdict("BLOCK"), actor: mod });
  const g = grant(c.db);
  const k1 = consumer(c.port, g.credential);
  await k1.opened;
  await waitUntil(() => k1.frames.length >= 1);
  const report = await c.pump.runPass();
  await waitUntil(() => k1.frames.length >= 3);
  await sleep(100);
  check("S1", over.status === "overturned" && JSON.stringify(types(k1.frames)) === '["HELLO","DELIVER:r-pend","WARD_BLOCKED:overturn-delivery:channel-a:op-block-7"]' && !JSON.stringify(k1.frames).includes("T-OVERTURNED"),
    "only PENDING, unexpired rows of the current verdict go out: SENT, FAILED, CANCELLED, EXPIRED, expired-PENDING rows and the overturned ALLOW row are not sent; the overturn's BLOCK row is", { frames: types(k1.frames), report });
  const statuses = Object.fromEntries(["r-pend", "r-exp", "r-sent", "r-failed", "r-cancel", "r-expired", "r-old", "overturn-delivery:channel-a:op-block-7"].map((id) => [id, rowOf(c.db, id)?.status]));
  check("S2", JSON.stringify(statuses) === JSON.stringify({ "r-pend": "SENT", "r-exp": "EXPIRED", "r-sent": "SENT", "r-failed": "FAILED", "r-cancel": "CANCELLED", "r-expired": "EXPIRED", "r-old": "PENDING", "overturn-delivery:channel-a:op-block-7": "SENT" }) && all(c.db, "SELECT updated_at FROM deliveries WHERE id = 'r-pend'")[0].updated_at === c.clock.now.toISOString(),
    "after the pass: sent rows are SENT (updated_at = pass time), the expired PENDING row is EXPIRED, the other rows keep their status", statuses);

  k1.ws.terminate();
  await k1.closed;
  const k2 = consumer(c.port, g.credential);
  await k2.opened;
  await waitUntil(() => k2.frames.length >= 1);
  await c.pump.runPass();
  await sleep(100);
  check("S3", JSON.stringify(types(k2.frames)) === '["HELLO"]', "a reconnect replays nothing: SENT and EXPIRED rows (an expired SC alike) are not sent again", types(k2.frames));

  k2.ws.terminate();
  await k2.closed;
  addRow(c.db, { channelId: "channel-a", n: 8, verdict: "ALLOW_MEANINGFUL", deliveryId: "r-wait", text: "T-WAIT" });
  const waitReport = await c.pump.runPass();
  const waiting = rowOf(c.db, "r-wait");
  const k3 = consumer(c.port, g.credential);
  await k3.opened;
  await waitUntil(() => k3.frames.length >= 1);
  await c.pump.runPass();
  await waitUntil(() => k3.frames.length >= 2);
  check("S4", waiting?.status === "PENDING" && waiting?.attempts === 0 && JSON.stringify(types(k3.frames)) === '["HELLO","DELIVER:r-wait"]' && rowOf(c.db, "r-wait")?.status === "SENT",
    "with no consumer the row stays PENDING with 0 attempts; it goes out once a consumer connects", { waiting, waitReport, frames: types(k3.frames) });

  // Resend (S014 decision service, real store) against the output rules.
  at("2026-11-10T10:00:20.000Z");
  const notExpired = decision.resendDelivery(c.deps(), { deliveryId: "r-pend", operationId: "op-r1", actor: mod });
  at("2026-11-10T10:06:00.000Z");
  const alreadySent = decision.resendDelivery(c.deps(), { deliveryId: "r-pend", operationId: "op-r2", actor: mod });
  const resent = decision.resendDelivery(c.deps(), { deliveryId: "r-exp", operationId: "op-r3", actor: mod });
  const duplicate = decision.resendDelivery(c.deps(), { deliveryId: "r-exp", operationId: "op-r3", actor: mod });
  const deniedResend = decision.resendDelivery(c.deps(), { deliveryId: "r-exp", operationId: "op-r4", actor: fx.dataAdmin("admin-1") });
  const before = k3.frames.length;
  await c.pump.runPass();
  await waitUntil(() => k3.frames.length >= before + 1);
  await c.pump.runPass();
  await sleep(100);
  const newRow = rowOf(c.db, "resend:channel-a:op-r3");
  const resentFrames = k3.frames.slice(before);
  at("2026-11-10T10:11:00.000Z");
  const windowClosed = decision.resendDelivery(c.deps(), { deliveryId: "r-failed", operationId: "op-r5", actor: mod });
  check("S5", notExpired.status === "refused" && notExpired.reason === "NOT_EXPIRED" && alreadySent.status === "refused" && alreadySent.reason === "ALREADY_SENT" && rowOf(c.db, "resend:channel-a:op-r2") === undefined,
    "resend of a SENT row: NOT_EXPIRED while valid, ALREADY_SENT once its validity passed (Q56); no new row", { notExpired, alreadySent });
  check("S6", resent.status === "resent" && newRow?.status === "SENT" && newRow?.valid_until === "2026-11-10T10:07:00.000Z" && JSON.stringify(types(resentFrames)) === '["DELIVER:resend:channel-a:op-r3"]' && duplicate.status === "duplicate" && deniedResend.status === "denied" && windowClosed.status === "refused" && windowClosed.reason === "WINDOW_CLOSED",
    "an explicit resend of an EXPIRED row makes a new row (new deliveryId, 60 s validity) that goes out exactly once; the same operation is a duplicate; a data admin is denied; after 10 minutes WINDOW_CLOSED", { resent: resent.status, newRow, frames: types(resentFrames), duplicate: duplicate.status, deniedResend: deniedResend.status, windowClosed });

  // Release (BLOCK -> ALLOW) is written EXPIRED: never sent on its own, sendable only by an explicit resend.
  at("2026-11-10T10:01:00.000Z");
  addRow(c.db, { channelId: "channel-a", n: 9, verdict: "BLOCK", deliveryId: "r-blk", text: "T-RELEASED" });
  const released = decision.overturnEvent(c.deps(), { eventId: "event-channel-a-9", operationId: "op-release-9", verdict: contracts.createVerdict("ALLOW_MEANINGFUL"), actor: mod });
  const relId = "overturn-delivery:channel-a:op-release-9";
  const beforeRelease = k3.frames.length;
  await c.pump.runPass();
  await sleep(100);
  const releaseFrames = k3.frames.slice(beforeRelease).map((frame) => frame.deliveryId);
  at("2026-11-10T10:02:00.000Z");
  const releaseResend = decision.resendDelivery(c.deps(), { deliveryId: relId, operationId: "op-r6", actor: mod });
  await c.pump.runPass();
  await waitUntil(() => k3.frames.some((frame) => frame.deliveryId === "resend:channel-a:op-r6"));
  check("S7", released.status === "overturned" && rowOf(c.db, relId)?.status === "EXPIRED" && !releaseFrames.includes(relId) && releaseResend.status === "resent" && k3.frames.some((frame) => frame.deliveryId === "resend:channel-a:op-r6" && frame.display?.text === "T-RELEASED"),
    "a release (BLOCK to ALLOW) is written EXPIRED and is not sent by itself; only an explicit resend sends the approved text", { relStatus: rowOf(c.db, relId)?.status, releaseFrames, releaseResend: releaseResend.status });
  k3.ws.terminate();
  await k3.closed;

  // Bounded sending: 50 rows per channel per pass, 3 attempts, the rows behind a failing row wait.
  at("2026-11-10T10:00:30.000Z");
  for (let n = 100; n < 220; n += 1) addRow(c.db, { channelId: "channel-a", n, verdict: "ALLOW_MEANINGFUL", deliveryId: `bulk-${n}`, text: `T-${n}` });
  const k4 = consumer(c.port, g.credential);
  await k4.opened;
  await waitUntil(() => k4.frames.length >= 1);
  const perPass: number[] = [];
  for (let pass = 0; pass < 3; pass += 1) {
    const r = await c.pump.runPass();
    perPass.push(r.sent);
  }
  await waitUntil(() => k4.frames.length >= 121);
  check("S8", JSON.stringify(perPass) === "[50,50,20]" && k4.frames.length === 121, "sending is bounded: 120 pending rows go out as 50, 50, 20 over three passes", { perPass, frames: k4.frames.length });

  addRow(c.db, { channelId: "channel-a", n: 300, verdict: "ALLOW_MEANINGFUL", deliveryId: "f-1", text: "T-F1" });
  addRow(c.db, { channelId: "channel-a", n: 301, verdict: "ALLOW_MEANINGFUL", deliveryId: "f-2", text: "T-F2" });
  const failing = { grantId: "fake-grant", channelId: "channel-a", send: async () => { throw new Error("WRITE_FAILED"); }, bufferedAmount: () => 0, close: () => undefined };
  c.registry.attach(failing);
  const trail: Array<{ f1: unknown; f2: unknown }> = [];
  for (let pass = 0; pass < 3; pass += 1) {
    await c.pump.runPass();
    trail.push({ f1: rowOf(c.db, "f-1"), f2: rowOf(c.db, "f-2")?.status });
  }
  c.registry.detach(failing);
  await c.pump.runPass();
  await waitUntil(() => k4.frames.some((frame) => frame.deliveryId === "f-2"));
  const f1Copies = k4.frames.filter((frame) => frame.deliveryId === "f-1").length;
  check("S9", JSON.stringify(trail.map((step: any) => [step.f1.status, step.f1.attempts, step.f2])) === '[["PENDING",1,"PENDING"],["PENDING",2,"PENDING"],["FAILED",3,"PENDING"]]' && rowOf(c.db, "f-2")?.status === "SENT" && f1Copies === 3,
    "a row that fails for one consumer is retried at most 3 times and then FAILED; the row behind it waits; the healthy consumer receives the same deliveryId 3 times (it must deduplicate)", { trail, f1Copies });
  closeAllSockets();
  await c.stop();
}

// =====================================================================================================================
section("Z shutdown with consumers connected");
{
  const h = await startApp(QUIET);
  const a = consumer(h.port, grant(h.db).credential);
  const b = consumer(h.port, grant(h.db).credential);
  await Promise.all([a.opened, b.opened]);
  await waitUntil(() => a.frames.length >= 1 && b.frames.length >= 1);
  let resolvedAt = -1;
  const t0 = Date.now();
  const closing = h.app.close().then(() => (resolvedAt = Date.now() - t0));
  await sleep(3_000);
  const afterThree = { closeResolved: resolvedAt >= 0, aOpen: a.ws.readyState === 1, bOpen: b.ws.readyState === 1 };
  // While app.close() waits, is the delivery pump still sending?
  addRow(h.db, { channelId: "channel-a", n: 900, verdict: "ALLOW_MEANINGFUL", deliveryId: "during-close", text: "T-DURING-CLOSE" });
  setValidity(h.db, { "during-close": FAR_FUTURE });
  await sleep(500);
  const pumpStillSending = a.frames.some((frame) => frame.deliveryId === "during-close");
  const newConnection = await rawExchange(h.port, "GET /healthz HTTP/1.1\r\nHost: x\r\n\r\n", 500);
  // The consumers leave on their own; only then does close finish.
  const leftAt = Date.now() - t0;
  a.ws.close();
  b.ws.close();
  await Promise.race([closing, sleep(5_000)]);
  check("Z1", afterThree.closeResolved && !afterThree.aOpen && !afterThree.bOpen,
    "app.close() with two consumers connected finishes promptly and drops both consumers (design §8, §13: onClose stops the timer and closes the connections)",
    { afterThreeSeconds: afterThree, pumpStillSendingDuringClose: pumpStillSending, newConnectionRefused: newConnection.text === "", consumersLeftAtMs: leftAt, closeResolvedAtMs: resolvedAt });
  h.db.close();
}

// =====================================================================================================================
section("M observations (not contract checks)");
{
  const h = await startApp(QUIET);
  const g = grant(h.db);
  const big = await rawConsumer(h.port, g.credential);
  const payload = Buffer.alloc(16 * 1024 * 1024, 0x61);
  const t0 = Date.now();
  big.socket.write(clientFrame(0x1, payload));
  await Promise.race([big.ended, sleep(10_000)]);
  note("M1", "a 16 MiB client text frame: the server reads the whole frame, then closes 4400 (ws maxPayload stays at its 100 MiB default)", { closeCode: closeCodeOf(Buffer.concat(big.received)), elapsedMs: Date.now() - t0 });
  const many = Array.from({ length: 20 }, () => consumer(h.port, g.credential));
  const opened = await Promise.all(many.map((entry) => entry.opened));
  note("M2", "connections per grant are not limited: 20 connections with one credential", { opened: opened.filter(Boolean).length });
  closeAllSockets();
  await h.stop();
}

finish();
process.exit(0);
