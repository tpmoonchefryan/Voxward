import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { actorFor, CHANNEL, type DataFixture, openDataFixture, rowsIn, SUBJECT, TWIN } from "../fixtures.js";

const ADMIN = actorFor("DATA_ADMIN");

function activeExceptions(fixture: DataFixture, subjectId: string): number {
  const row = fixture.database.sqlite
    .prepare("select count(*) as n from score_exceptions where subject_id = ? and removed_at is null")
    .get(subjectId) as { n: number };
  return row.n;
}

describe("the two deletion options register a request and change no scoring state (VW-SUB034-AC001)", () => {
  let fixture: DataFixture;

  beforeEach(() => {
    fixture = openDataFixture("delete-options-");
  });

  afterEach(() => {
    fixture.close();
  });

  it("delete data only leaves an existing active exception in place", () => {
    expect(activeExceptions(fixture, SUBJECT)).toBe(1);
    const response = fixture.routes.createRequest(ADMIN, {
      subjectRef: SUBJECT,
      kind: "DELETE",
      mode: "DELETE_DATA_ONLY",
      requestSource: "OPERATOR_INITIATED",
    });
    expect(response.status).toBe(201);
    expect(activeExceptions(fixture, SUBJECT)).toBe(1);
  });

  it("delete data only still leaves the exception active after the request is verified", () => {
    const created = fixture.routes.createRequest(ADMIN, {
      subjectRef: SUBJECT,
      kind: "DELETE",
      mode: "DELETE_DATA_ONLY",
      requestSource: "OPERATOR_INITIATED",
    });
    const requestId = (created.body as { requestId: string }).requestId;
    fixture.routes.decideVerification(ADMIN, requestId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" });
    expect(activeExceptions(fixture, SUBJECT)).toBe(1);
  });

  it("delete and except adds no marker and changes no score, list or ledger row at registration", () => {
    const snapshot = {
      exceptions: rowsIn(fixture.database, "score_exceptions"),
      lists: rowsIn(fixture.database, "list_entries"),
      ledger: rowsIn(fixture.database, "score_ledger"),
      scoreVersion: (
        fixture.database.sqlite.prepare("select version from subject_scores where subject_id = ?").get(SUBJECT) as {
          version: number;
        }
      ).version,
      generation: (
        fixture.database.sqlite.prepare("select processing_generation as g from subjects where id = ?").get(SUBJECT) as {
          g: number;
        }
      ).g,
    };
    const response = fixture.routes.createRequest(ADMIN, {
      subjectRef: SUBJECT,
      kind: "DELETE",
      mode: "DELETE_AND_EXCEPT",
      requestSource: "OPERATOR_INITIATED",
    });
    expect(response.status).toBe(201);
    expect(rowsIn(fixture.database, "score_exceptions")).toBe(snapshot.exceptions);
    expect(rowsIn(fixture.database, "list_entries")).toBe(snapshot.lists);
    expect(rowsIn(fixture.database, "score_ledger")).toBe(snapshot.ledger);
    expect(
      (
        fixture.database.sqlite.prepare("select version from subject_scores where subject_id = ?").get(SUBJECT) as {
          version: number;
        }
      ).version,
    ).toBe(snapshot.scoreVersion);
    expect(
      (
        fixture.database.sqlite.prepare("select processing_generation as g from subjects where id = ?").get(SUBJECT) as {
          g: number;
        }
      ).g,
    ).toBe(snapshot.generation);
  });

  it("delete and except does not create an exception for a subject that has none", () => {
    expect(activeExceptions(fixture, TWIN)).toBe(0);
    fixture.routes.createRequest(ADMIN, {
      subjectRef: TWIN,
      kind: "DELETE",
      mode: "DELETE_AND_EXCEPT",
      requestSource: "OPERATOR_INITIATED",
    });
    expect(activeExceptions(fixture, TWIN)).toBe(0);
  });

  it("each registration writes exactly one Change Log row in the same transaction", () => {
    const before = rowsIn(fixture.database, "change_logs");
    fixture.routes.createRequest(ADMIN, {
      subjectRef: SUBJECT,
      kind: "DELETE",
      mode: "DELETE_DATA_ONLY",
      requestSource: "OPERATOR_INITIATED",
    });
    fixture.routes.createRequest(ADMIN, {
      subjectRef: TWIN,
      kind: "DELETE",
      mode: "DELETE_AND_EXCEPT",
      requestSource: "OPERATOR_INITIATED",
    });
    expect(rowsIn(fixture.database, "change_logs")).toBe(before + 2);
    const summaries = fixture.database.sqlite
      .prepare("select summary, change_kind as kind, channel_id as channel from change_logs order by id")
      .all() as { summary: string; kind: string; channel: string }[];
    expect(summaries.every((row) => row.kind === "DATA_REQUEST_CHANGED" && row.channel === CHANNEL)).toBe(true);
    // The summary is a fixed template. It carries enumeration values and an id, never a nickname.
    expect(summaries.some((row) => row.summary.includes("mode=DELETE_AND_EXCEPT"))).toBe(true);
  });
});
