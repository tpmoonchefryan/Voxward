import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VoxwardDatabase } from "../../src/db/client.js";
import { ChannelEventStore } from "../../src/db/repository.js";
import { runShortTransaction } from "../../src/db/transaction.js";
import { migratedDatabase, removeDirectory, scratchDirectory, seedChannelAndSubject, T0, type Seed } from "./helpers.js";

let directory: string;
let database: VoxwardDatabase;
let seed: Seed;
let eventId: string;

beforeEach(() => {
  directory = scratchDirectory("constraints-");
  database = migratedDatabase(directory);
  seed = seedChannelAndSubject(database);
  const recorded = runShortTransaction(database, (tx) =>
    ChannelEventStore.recordIfNew(tx, {
      id: "event-1",
      channelId: seed.channelId,
      subjectId: seed.subjectId,
      platformMessageRef: "msg-1",
      platformOrder: 1,
      receivedAt: T0,
      correlationId: "corr-1",
      exceptionMarked: false,
      createdAt: T0,
    }),
  );
  eventId = recorded.id;
});

afterEach(() => {
  database.close();
  removeDirectory(directory);
});

/** Runs a raw statement and returns the error message, or undefined when it succeeds. */
function errorOf(sql: string, params: unknown[]): string | undefined {
  try {
    database.sqlite.prepare(sql).run(...params);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe("verdict rules", () => {
  it("rejects a downstream verdict that contradicts the internal classification", () => {
    const message = errorOf(
      "insert into verdicts (id, event_id, seq, classification, downstream, source, is_current, decided_at, decided_by_ref) values (?, ?, 1, 'BLOCK', 'ALLOW', 'MODEL', 1, ?, 'system')",
      ["v-bad", eventId, T0],
    );
    expect(message).toMatch(/CHECK constraint failed: ck_verdicts_consistent/);
  });

  it("allows one current verdict per event", () => {
    const insert = (id: string, seq: number) =>
      errorOf(
        "insert into verdicts (id, event_id, seq, classification, downstream, source, is_current, decided_at, decided_by_ref) values (?, ?, ?, 'BLOCK', 'BLOCK', 'MODEL', 1, ?, 'system')",
        [id, eventId, seq, T0],
      );
    expect(insert("v-1", 1)).toBeUndefined();
    // SQLite names the columns of a partial unique index, not the index itself.
    expect(insert("v-2", 2)).toMatch(/UNIQUE constraint failed: verdicts\.event_id/);
  });
});

describe("score and list rules", () => {
  it("rejects a second ledger entry for the same idempotency key", () => {
    const insert = (id: string) =>
      errorOf(
        "insert into score_ledger (id, subject_id, idempotency_key, reason_code, requested_delta, actual_delta, created_at) values (?, ?, 'verdict-1:score', 'COMPLIANT_REWARD', 2, 2, ?)",
        [id, seed.subjectId, T0],
      );
    expect(insert("l-1")).toBeUndefined();
    expect(insert("l-2")).toMatch(/UNIQUE constraint failed: score_ledger\.idempotency_key/);
  });

  it("rejects two active list entries for the same subject in one channel", () => {
    const insert = (id: string) =>
      errorOf(
        "insert into list_entries (id, channel_id, subject_id, list_kind, created_at, created_by_ref) values (?, ?, ?, 'BLACKLIST', ?, 'owner-1')",
        [id, seed.channelId, seed.subjectId, T0],
      );
    expect(insert("e-1")).toBeUndefined();
    expect(insert("e-2")).toMatch(/UNIQUE constraint failed: list_entries\.channel_id, list_entries\.subject_id/);
  });

  it("rejects a negative score version", () => {
    expect(errorOf("update subject_scores set version = -1 where subject_id = ?", [seed.subjectId])).toMatch(
      /CHECK constraint failed: ck_subject_scores_version/,
    );
  });
});

describe("credential references", () => {
  const insertCredential = (id: string, secretRef: string) =>
    errorOf(
      "insert into credential_refs (id, channel_id, purpose, secret_ref, created_at) values (?, ?, 'PLATFORM_OAUTH', ?, ?)",
      [id, seed.channelId, secretRef, T0],
    );

  it("accepts a secretref identifier", () => {
    expect(insertCredential("c-1", "secretref:oauth-abc12345")).toBeUndefined();
  });

  it("rejects a value that looks like a plaintext credential", () => {
    expect(insertCredential("c-2", "sk-live-9f8e7d6c5b4a")).toMatch(/CHECK constraint failed: ck_credential_refs_secret_ref/);
    expect(insertCredential("c-3", "secretref:has space")).toMatch(/CHECK constraint failed: ck_credential_refs_secret_ref/);
  });
});

describe("log rules", () => {
  it("rejects a change log summary longer than 500 characters", () => {
    expect(
      errorOf(
        "insert into change_logs (id, channel_id, occurred_at, actor_kind, actor_ref, change_kind, summary, outcome, expires_at) values ('cl-1', ?, ?, 'SYSTEM', 'system', 'CONFIG_CHANGED', ?, 'SUCCEEDED', ?)",
        [seed.channelId, T0, "x".repeat(501), T0],
      ),
    ).toMatch(/CHECK constraint failed: ck_change_logs_summary/);
  });

  it("rejects evidence whose recorded size does not match its payload", () => {
    const logId = insertTechnicalLog();
    expect(
      errorOf(
        "insert into technical_log_evidence (id, log_id, evidence_kind, payload, payload_bytes, expires_at) values ('ev-1', ?, 'MESSAGE_TEXT', 'hello', 99, ?)",
        [logId, T0],
      ),
    ).toMatch(/CHECK constraint failed: ck_technical_log_evidence_bytes/);
  });

  it("rejects validated JSON evidence that is not JSON", () => {
    const logId = insertTechnicalLog();
    expect(
      errorOf(
        "insert into technical_log_evidence (id, log_id, evidence_kind, payload, payload_bytes, expires_at) values ('ev-2', ?, 'VALIDATED_JSON', 'not json', 8, ?)",
        [logId, T0],
      ),
    ).toMatch(/CHECK constraint failed: ck_technical_log_evidence_json/);
  });

  it("deletes a log's evidence with the log itself", () => {
    const logId = insertTechnicalLog();
    expect(
      errorOf(
        "insert into technical_log_evidence (id, log_id, evidence_kind, payload, payload_bytes, expires_at) values ('ev-3', ?, 'MESSAGE_TEXT', 'hello', 5, ?)",
        [logId, T0],
      ),
    ).toBeUndefined();
    database.sqlite.prepare("delete from technical_logs where id = ?").run(logId);
    const remaining = database.sqlite.prepare("select count(*) as n from technical_log_evidence").get() as { n: number };
    expect(remaining.n).toBe(0);
  });

  function insertTechnicalLog(): string {
    const id = `log-${Math.random().toString(36).slice(2)}`;
    database.sqlite
      .prepare(
        "insert into technical_logs (id, channel_id, correlation_id, sequence, stage, status, created_at, expires_at) values (?, ?, 'corr-1', 0, 'INGEST', 'OK', ?, ?)",
      )
      .run(id, seed.channelId, T0, T0);
    return id;
  }
});

describe("referential integrity", () => {
  it("rejects a subject that points at a missing channel", () => {
    expect(
      errorOf(
        "insert into subjects (id, channel_id, platform_subject_key, processing_generation, created_at) values ('s-x', 'no-such-channel', 'k', 0, ?)",
        [T0],
      ),
    ).toMatch(/FOREIGN KEY constraint failed/);
  });

  it("rejects a delivery whose verdict does not exist", () => {
    expect(
      errorOf(
        "insert into deliveries (id, event_id, verdict_id, delivery_sequence, platform_order, valid_until, status, updated_at) values ('d-1', ?, 'no-such-verdict', 1, 1, ?, 'PENDING', ?)",
        [eventId, T0, T0],
      ),
    ).toMatch(/FOREIGN KEY constraint failed/);
  });
});
