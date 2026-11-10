import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DatabaseSetupError,
  openDatabase,
  type VoxwardDatabase,
} from "../../src/db/client.js";
import { AsyncTransactionError, runShortTransaction } from "../../src/db/transaction.js";
import { channels } from "../../src/db/schema/index.js";
import { countRows, migratedDatabase, removeDirectory, scratchDirectory, T0 } from "./helpers.js";

function insertChannel(database: VoxwardDatabase, id: string): void {
  runShortTransaction(database, (tx) => {
    tx.insert(channels)
      .values({ id, platform: "youtube", platformChannelRef: `UC-${id}`, displayName: id, createdAt: T0, updatedAt: T0 })
      .run();
  });
}

describe("connection settings", () => {
  let directory: string;
  let database: VoxwardDatabase;

  beforeEach(() => {
    directory = scratchDirectory("tx-settings-");
    database = migratedDatabase(directory);
  });

  afterEach(() => {
    database.close();
    removeDirectory(directory);
  });

  it("runs in WAL mode with full synchronous writes and foreign keys enforced", () => {
    expect(database.sqlite.pragma("journal_mode", { simple: true })).toBe("wal");
    expect(database.sqlite.pragma("synchronous", { simple: true })).toBe(2);
    expect(database.sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
  });

  it("refuses to open a database that cannot use WAL, instead of falling back", () => {
    expect(() => openDatabase({ filePath: ":memory:" })).toThrow(DatabaseSetupError);
  });
});

describe("runShortTransaction", () => {
  let directory: string;
  let database: VoxwardDatabase;

  beforeEach(() => {
    directory = scratchDirectory("tx-");
    database = migratedDatabase(directory);
  });

  afterEach(() => {
    database.close();
    removeDirectory(directory);
  });

  it("commits the writes when the work returns", () => {
    const result = runShortTransaction(database, (tx) => {
      tx.insert(channels)
        .values({ id: "c-ok", platform: "youtube", platformChannelRef: "UC-ok", displayName: "ok", createdAt: T0, updatedAt: T0 })
        .run();
      return "done";
    });
    expect(result).toBe("done");
    expect(countRows(database, "channels")).toBe(1);
  });

  it("rolls back every write when the work throws", () => {
    expect(() =>
      runShortTransaction(database, (tx) => {
        tx.insert(channels)
          .values({ id: "c-fail", platform: "youtube", platformChannelRef: "UC-fail", displayName: "fail", createdAt: T0, updatedAt: T0 })
          .run();
        throw new Error("simulated failure after a write");
      }),
    ).toThrow("simulated failure after a write");
    expect(countRows(database, "channels")).toBe(0);
  });

  it("rejects asynchronous work and rolls back what it wrote before returning the promise", () => {
    expect(() =>
      runShortTransaction(database, (tx) => {
        tx.insert(channels)
          .values({ id: "c-async", platform: "youtube", platformChannelRef: "UC-async", displayName: "async", createdAt: T0, updatedAt: T0 })
          .run();
        return Promise.resolve("network result");
      }),
    ).toThrow(AsyncTransactionError);
    expect(countRows(database, "channels")).toBe(0);
  });

  it("takes the write lock when it starts, so a second writer is refused while the first is open", () => {
    const secondWriter = openDatabase({ filePath: database.filePath, busyTimeoutMs: 50 });
    try {
      runShortTransaction(database, () => {
        // Nothing has been written yet. An IMMEDIATE transaction still holds the write lock here.
        expect(() =>
          secondWriter.sqlite
            .prepare("insert into channels (id, platform, platform_channel_ref, display_name, created_at, updated_at) values (?, ?, ?, ?, ?, ?)")
            .run("c-other", "youtube", "UC-other", "other", T0, T0),
        ).toThrow(/locked|busy/i);
      });
    } finally {
      secondWriter.close();
    }
  });

  it("allows the second writer once the first transaction has finished", () => {
    insertChannel(database, "c-first");
    const secondWriter = openDatabase({ filePath: database.filePath, busyTimeoutMs: 50 });
    try {
      secondWriter.sqlite
        .prepare("insert into channels (id, platform, platform_channel_ref, display_name, created_at, updated_at) values (?, ?, ?, ?, ?, ?)")
        .run("c-second", "youtube", "UC-second", "second", T0, T0);
    } finally {
      secondWriter.close();
    }
    expect(countRows(database, "channels")).toBe(2);
  });
});
