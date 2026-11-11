import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { actorFor, type DataFixture, openDataFixture, SUBJECT } from "../fixtures.js";

/** Actors that lack data.handle. Each one holds the capabilities of its S003 role, so the refusal is by capability. */
const MODERATOR = actorFor("MODERATOR");
const OWNER_WITHOUT_DATA_ADMIN = actorFor("CHANNEL_OWNER");
const NO_CAPABILITIES = { accountId: "stranger-1", channelId: "channel-1", capabilities: new Set<string>() };

describe("data routes refuse actors without data.handle (VW-SUB033-AC001: ordinary moderators)", () => {
  let fixture: DataFixture;

  beforeEach(() => {
    fixture = openDataFixture("perm-");
  });

  afterEach(() => {
    fixture.close();
  });

  it.each([
    ["moderator", MODERATOR],
    ["owner without DATA_ADMIN", OWNER_WITHOUT_DATA_ADMIN],
    ["member with no capability", NO_CAPABILITIES],
  ])("%s: every route answers 403, and the refusal comes before input checks", (_label, actor) => {
    // The inputs below are invalid on purpose. A refusal that names the input would reveal the route to a caller who
    // must not use it.
    expect(fixture.routes.subject(actor, "%%bad%%").status).toBe(403);
    expect(fixture.routes.listRequests(actor, undefined).status).toBe(403);
    expect(fixture.routes.getRequest(actor, undefined).status).toBe(403);
    expect(fixture.routes.createRequest(actor, { nothing: true }).status).toBe(403);
    expect(fixture.routes.decideVerification(actor, undefined, { verdict: "X" }).status).toBe(403);
  });

  it("reports dataHandle false to a moderator, so the page shows no data actions", () => {
    expect(fixture.routes.capabilities(MODERATOR)).toEqual({ status: 200, body: { dataHandle: false } });
    expect(fixture.routes.capabilities(OWNER_WITHOUT_DATA_ADMIN)).toEqual({ status: 200, body: { dataHandle: false } });
  });

  it("writes nothing when a moderator tries to register or decide", () => {
    const before = fixture.database.sqlite.prepare("select count(*) as n from data_requests").get() as { n: number };
    fixture.routes.createRequest(MODERATOR, {
      subjectRef: SUBJECT,
      kind: "DELETE",
      mode: "DELETE_AND_EXCEPT",
      requestSource: "OPERATOR_INITIATED",
    });
    const after = fixture.database.sqlite.prepare("select count(*) as n from data_requests").get() as { n: number };
    expect(after.n).toBe(before.n);
  });

  it("grants dataHandle to DATA_ADMIN, the only role that holds the capability (S003 design 4.1)", () => {
    expect(fixture.routes.capabilities(actorFor("DATA_ADMIN"))).toEqual({ status: 200, body: { dataHandle: true } });
  });
});
