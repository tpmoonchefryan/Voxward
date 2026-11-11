// Batch 6 acceptance probe for S013 Q28: OAuth codes bound to PKCE, owner state kept, old grant retired.
// Usage: tsx probe-s013-q28.mts <checkout> [label]
// A local fake of the Google token endpoint stands in for Google. Nothing here reaches the network.
import { createHash } from "node:crypto";

const [C, LABEL = "candidate"] = process.argv.slice(2);
if (!C) throw new Error("usage: probe-s013-q28.mts <checkout> [label]");
const vaultMod = await import(`${C}/apps/server/src/security/credential-vault.ts`);
const cred = await import(`${C}/apps/server/src/modules/platform-source/youtube/credentials.ts`);
const oauth = await import(`${C}/apps/server/src/modules/platform-source/youtube/oauth.ts`);
const routesMod = await import(`${C}/apps/server/src/modules/platform-source/youtube/routes.ts`);

let checks = 0;
let failures = 0;
const failed: string[] = [];
function expectEq(label: string, actual: unknown, expected: unknown): boolean {
  checks += 1;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures += 1;
    failed.push(label);
  }
  console.log(`${ok ? "OK  " : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
  return ok;
}
function note(label: string, value: unknown): void {
  console.log(`NOTE ${label}: ${JSON.stringify(value)}`);
}

const CLIENT = { clientId: "probe-client.example.test", clientSecret: "probe-client-secret", redirectUri: "https://voxward.example.test/youtube/oauth/callback" };
const TOKEN = oauth.GOOGLE_TOKEN_ENDPOINT as string;
const REVOKE = oauth.GOOGLE_REVOKE_ENDPOINT as string;

/**
 * Fake Google token endpoint. A code issued for an authorization request that carried an S256 challenge is redeemable
 * only with the matching verifier (RFC 7636 4.6). `consumeOnFailure` decides whether a failed redemption burns the code.
 */
function fakeGoogle(options: { readonly consumeOnFailure: boolean }) {
  const codes = new Map<string, { challenge: string | null; refreshToken: string; scopes: string[] }>();
  const live = new Set<string>();
  const posts: Array<{ url: string; form: Record<string, string> }> = [];
  let n = 0;
  const s256 = (v: string) => createHash("sha256").update(v, "ascii").digest("base64url");
  return {
    posts,
    live,
    approve(url: string) {
      const q = new URL(url).searchParams;
      const challenge = q.get("code_challenge_method") === "S256" ? q.get("code_challenge") : null;
      const code = `code-${++n}`;
      const refreshToken = `refresh-${n}`;
      codes.set(code, { challenge, refreshToken, scopes: (q.get("scope") ?? "").split(" ").filter(Boolean) });
      return { code, refreshToken, challenge, query: Object.fromEntries(q.entries()) };
    },
    http: {
      async postForm(url: string, form: Record<string, string>) {
        posts.push({ url, form: { ...form } });
        if (url === REVOKE) {
          if (!live.has(form.token ?? "")) return { status: 400, body: { error: "invalid_token" } };
          live.delete(form.token!);
          return { status: 200, body: {} };
        }
        if (url !== TOKEN) return { status: 404, body: { error: "invalid_request" } };
        if (form.client_id !== CLIENT.clientId || form.client_secret !== CLIENT.clientSecret) return { status: 401, body: { error: "invalid_client" } };
        if (form.grant_type === "refresh_token") {
          if (!live.has(form.refresh_token ?? "")) return { status: 400, body: { error: "invalid_grant" } };
          return { status: 200, body: { access_token: `access-${++n}`, expires_in: 3600, token_type: "Bearer", scope: "https://www.googleapis.com/auth/youtube.readonly" } };
        }
        if (form.grant_type !== "authorization_code") return { status: 400, body: { error: "invalid_request" } };
        if (form.redirect_uri !== CLIENT.redirectUri) return { status: 400, body: { error: "redirect_uri_mismatch" } };
        const grant = codes.get(form.code ?? "");
        if (grant === undefined) return { status: 400, body: { error: "invalid_grant" } };
        const verifierOk = grant.challenge === null || (typeof form.code_verifier === "string" && form.code_verifier !== "" && s256(form.code_verifier) === grant.challenge);
        if (!verifierOk) {
          if (options.consumeOnFailure) codes.delete(form.code!);
          return { status: 400, body: { error: "invalid_grant" } };
        }
        codes.delete(form.code!);
        live.add(grant.refreshToken);
        return { status: 200, body: { access_token: `access-${++n}`, expires_in: 3600, token_type: "Bearer", scope: grant.scopes.join(" "), refresh_token: grant.refreshToken } };
      },
    },
  };
}

function memoryRefs() {
  const rows: any[] = [];
  return {
    rows,
    insert(row: any) {
      rows.push({ ...row, revokedAt: null });
    },
    findLatest(channelId: string | null, purpose: string) {
      return [...rows].reverse().find((row) => row.channelId === channelId && row.purpose === purpose);
    },
    revoke(id: string, revokedAt: string) {
      const i = rows.findIndex((row) => row.id === id);
      rows[i] = { ...rows[i], revokedAt };
    },
  };
}

function harness(consumeOnFailure: boolean) {
  let nowMs = Date.parse("2026-11-11T12:00:00.000Z");
  let ids = 0;
  const google = fakeGoogle({ consumeOnFailure });
  const refs = memoryRefs();
  const vault = vaultMod.createCredentialVault({ key: Buffer.alloc(32, 9) });
  const store = cred.createYouTubeCredentialStore({
    client: { clientId: CLIENT.clientId, redirectUri: CLIENT.redirectUri, publishingStatus: "IN_PRODUCTION" },
    secrets: vault,
    refs,
    newId: () => `ref-${++ids}`,
    now: () => new Date(nowMs).toISOString(),
  });
  store.registerClientSecret(CLIENT.clientSecret);
  const roles = new Map<string, string>([
    ["acct-owner:chan-1", "CHANNEL_OWNER"],
    ["acct-mod:chan-1", "MODERATOR"],
    ["acct-other:chan-2", "CHANNEL_OWNER"],
  ]);
  const states = oauth.createAuthorizationStates({ now: () => nowMs, ttlMs: 10 * 60_000 });
  const routes = routesMod.createYouTubeAuthRoutes({
    store,
    http: google.http,
    states,
    now: () => new Date(nowMs).toISOString(),
    resolveRole: (accountId: string, channelId: string) => roles.get(`${accountId}:${channelId}`) ?? null,
  });
  return { google, refs, vault, store, routes, states, advance: (ms: number) => (nowMs += ms) };
}
const OWNER = { accountId: "acct-owner", channelId: "chan-1", role: "CHANNEL_OWNER" };
const OTHER = { accountId: "acct-other", channelId: "chan-2", role: "CHANNEL_OWNER" };
const op = { operation: "AUTHORIZED_DATA_READ" };
const grantKind = (h: ReturnType<typeof harness>, ch: string) => h.store.readGrant(ch).kind;
const tokenPosts = (h: ReturnType<typeof harness>) => h.google.posts.filter((p) => p.url === TOKEN && p.form.grant_type === "authorization_code");

console.log(`\n## [${LABEL}] Q28-1 authorization request carries an S256 challenge, never the verifier`);
{
  const h = harness(true);
  const started = await h.routes.start(OWNER, op);
  const url = String(started.body.authorizationUrl ?? "");
  const q = new URL(url).searchParams;
  expectEq("start returns 200 with an authorization URL", started.status, 200);
  expectEq("URL has code_challenge_method=S256 and a 43-character challenge", [q.get("code_challenge_method"), (q.get("code_challenge") ?? "").length], ["S256", 43]);
  expectEq("neither the URL nor the response body carries a verifier", [url.includes("code_verifier"), JSON.stringify(started.body).includes("verifier")], [false, false]);
  const approved = h.google.approve(url);
  const done = await h.routes.callback(OWNER.accountId, { state: q.get("state")!, code: approved.code });
  const exchange = tokenPosts(h).at(-1)!;
  expectEq("the owner's own callback succeeds and stores a grant", [done.status, done.body.state, grantKind(h, "chan-1")], [200, "AUTHORIZED", "ACTIVE"]);
  expectEq("the exchange carried a 43-char verifier whose S256 hash is the challenge", [(exchange.form.code_verifier ?? "").length, createHash("sha256").update(exchange.form.code_verifier ?? "", "ascii").digest("base64url") === q.get("code_challenge")], [43, true]);
  expectEq("the verifier is in RFC 7636 unreserved characters", /^[A-Za-z0-9\-._~]{43,128}$/.test(exchange.form.code_verifier ?? ""), true);
  const replay = await h.routes.callback(OWNER.accountId, { state: q.get("state")!, code: approved.code });
  expectEq("the same state cannot be used twice", [replay.status, replay.body.error], [400, "STATE_INVALID"]);
}

for (const consumeOnFailure of [true, false]) {
  console.log(`\n## [${LABEL}] Q28-2 another channel's owner pairs their own state with the streamer's code (fake Google consumeOnFailure=${consumeOnFailure})`);
  const h = harness(consumeOnFailure);
  const ownerStart = await h.routes.start(OWNER, op);
  const ownerUrl = String(ownerStart.body.authorizationUrl);
  const ownerState = new URL(ownerUrl).searchParams.get("state")!;
  const streamerCode = h.google.approve(ownerUrl).code; // the streamer consented; the code is not redeemed yet
  const attackerStart = await h.routes.start(OTHER, op);
  const attackerState = new URL(String(attackerStart.body.authorizationUrl)).searchParams.get("state")!;
  const attack = await h.routes.callback(OTHER.accountId, { state: attackerState, code: streamerCode });
  note("attacker callback response", attack);
  expectEq("the injected code does not produce a grant for the attacker's channel, nor touch the streamer's", [grantKind(h, "chan-2"), grantKind(h, "chan-1")], ["NONE", "NONE"]);
  const sent = tokenPosts(h).at(-1)!;
  expectEq("the exchange was sent with the attacker attempt's own verifier, which does not match", typeof sent.form.code_verifier === "string" && sent.form.code_verifier.length === 43, true);
  const ownerDone = await h.routes.callback(OWNER.accountId, { state: ownerState, code: streamerCode });
  note(`the streamer's own callback afterwards (depends on whether the provider burns a code after a failed redemption)`, [ownerDone.status, ownerDone.body.state ?? ownerDone.body.error, grantKind(h, "chan-1")]);
}

console.log(`\n## [${LABEL}] Q28-3 a missing or wrong verifier fails`);
{
  const h = harness(true);
  const before = h.google.posts.length;
  const outcome = await oauth.exchangeAuthorizationCode(h.google.http, { clientId: CLIENT.clientId, clientSecret: CLIENT.clientSecret, redirectUri: CLIENT.redirectUri, code: "code-x", codeVerifier: "" });
  expectEq("exchange with an empty verifier fails before any request is sent", [outcome.ok, outcome.error, h.google.posts.length - before], [false, "invalid_request", 0]);
  // Route level: a pending entry whose verifier is empty (cannot happen through start, forced here).
  const started = await h.routes.start(OWNER, op);
  const code = h.google.approve(String(started.body.authorizationUrl)).code;
  const forced = h.states.issue({ channelId: "chan-1", accountId: "acct-owner", operation: "AUTHORIZED_DATA_READ", codeVerifier: "" });
  const r1 = await h.routes.callback(OWNER.accountId, { state: forced, code });
  expectEq("callback whose pending entry has no verifier: no grant, no token request", [grantKind(h, "chan-1"), tokenPosts(h).length], ["NONE", 0]);
  note("its response", r1);
  // Wrong verifier: a pending entry that holds a verifier other than the one whose challenge was approved.
  const h2 = harness(false);
  const s2 = await h2.routes.start(OWNER, op);
  const code2 = h2.google.approve(String(s2.body.authorizationUrl)).code;
  const wrong = h2.states.issue({ channelId: "chan-1", accountId: "acct-owner", operation: "AUTHORIZED_DATA_READ", codeVerifier: oauth.pkceVerifier ? oauth.pkceVerifier() : "W".repeat(43) });
  const r2 = await h2.routes.callback(OWNER.accountId, { state: wrong, code: code2 });
  expectEq("callback with a wrong verifier: the provider refuses, no grant stored", [r2.status, r2.body.state, grantKind(h2, "chan-1")], [200, "REAUTHORIZATION_REQUIRED", "NONE"]);
}

console.log(`\n## [${LABEL}] Q28-4 someone else's failed attempt does not use up the owner's state`);
{
  const h = harness(true);
  const started = await h.routes.start(OWNER, op);
  const url = String(started.body.authorizationUrl);
  const state = new URL(url).searchParams.get("state")!;
  const attempts = [
    ["another channel's owner, with a code", await h.routes.callback(OTHER.accountId, { state, code: "whatever" })],
    ["another channel's owner, with error=access_denied", await h.routes.callback(OTHER.accountId, { state, error: "access_denied" })],
    ["a moderator of the same channel", await h.routes.callback("acct-mod", { state, code: "whatever" })],
    ["an account with no role", await h.routes.callback("acct-nobody", { state, code: "whatever" })],
  ] as const;
  for (const [label, response] of attempts) expectEq(`refused: ${label}`, [response.status, response.body.error], [400, "STATE_INVALID"]);
  expectEq("none of those attempts reached the token endpoint", tokenPosts(h).length, 0);
  const done = await h.routes.callback(OWNER.accountId, { state, code: h.google.approve(url).code });
  expectEq("the owner then completes with the same state", [done.status, done.body.state, grantKind(h, "chan-1")], [200, "AUTHORIZED", "ACTIVE"]);
}

console.log(`\n## [${LABEL}] Q28-5 re-authorization retires the old grant: row revoked, sealed value deleted`);
{
  const h = harness(true);
  async function authorize() {
    const s = await h.routes.start(OWNER, op);
    const url = String(s.body.authorizationUrl);
    const a = h.google.approve(url);
    await h.routes.callback(OWNER.accountId, { state: new URL(url).searchParams.get("state")!, code: a.code });
    return a.refreshToken;
  }
  const r1 = await authorize();
  const firstRow = h.refs.rows.filter((r: any) => r.purpose === "PLATFORM_OAUTH")[0];
  h.advance(60_000);
  const r2 = await authorize();
  const grantRows = h.refs.rows.filter((r: any) => r.purpose === "PLATFORM_OAUTH");
  expectEq("two grant rows: the first revoked, the second active", grantRows.map((r: any) => r.revokedAt !== null), [true, false]);
  let oldReveal = "readable";
  try {
    h.vault.reveal(firstRow.secretRef, "PLATFORM_OAUTH");
  } catch (error) {
    oldReveal = `refused: ${(error as Error).name}`;
  }
  expectEq("the old sealed value is gone from the vault (reveal refuses, describe and list do not show it)", [oldReveal.startsWith("refused"), h.vault.describe(firstRow.secretRef) === undefined, h.vault.list().some((d: any) => d.ref === firstRow.secretRef)], [true, true, false]);
  const read = h.store.readGrant("chan-1");
  expectEq("the channel reads the new refresh token", [read.kind, read.record?.refreshToken === r2], ["ACTIVE", true]);
  const status = await h.routes.status(OWNER, op);
  expectEq("auth status probes with the new grant", [status.status, status.body.state], [200, "AUTHORIZED"]);
  const lastRefresh = h.google.posts.filter((p) => p.form.grant_type === "refresh_token").at(-1);
  expectEq("the status probe used the new refresh token, not the old one", lastRefresh?.form.refresh_token === r2, true);
  note("the old refresh token at the provider after re-authorization (still live = not revoked there)", { oldTokenStillLiveAtProvider: h.google.live.has(r1), revokeCallsToProvider: h.google.posts.filter((p) => p.url === REVOKE).length });
  let removeWrongPurpose = "no error";
  try {
    h.vault.remove(grantRows[1].secretRef, "PLATFORM_PROJECT_KEY");
  } catch (error) {
    removeWrongPurpose = (error as Error).name;
  }
  expectEq("vault.remove with the wrong purpose refuses and keeps the value", [removeWrongPurpose, h.store.readGrant("chan-1").kind], ["CredentialPurposeError", "ACTIVE"]);
  let unknownRemove: unknown;
  try {
    unknownRemove = h.vault.remove("no-such-ref", "PLATFORM_OAUTH");
  } catch (error) {
    unknownRemove = (error as Error).name;
  }
  expectEq("vault.remove of an unknown reference is harmless (false)", unknownRemove, false);
}

console.log(`\n[${LABEL}] checks ${checks}, failures ${failures}`);
if (failed.length) console.log(`failed: ${failed.join(" | ")}`);
process.exit(0);
