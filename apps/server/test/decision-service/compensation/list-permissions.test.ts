import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createListAdministration } from "../../../src/modules/decision-service/index.js";
import {
  countWhere,
  dataAdmin,
  decisionDeps,
  moderator,
  openDecisionDatabase,
  seedChannel,
  seedOpenTask,
  type OpenDatabase,
} from "../fixtures.js";

// VW-SUB027-AC001（名单/词条操作按权限拒绝）
describe("blacklist, whitelist and word-list edits follow the list capability (VW-SUB027-AC001)", () => {
  let db: OpenDatabase;

  beforeEach(() => {
    db = openDecisionDatabase("decision-lists-");
    seedChannel(db.database, "channel-a");
    seedOpenTask(db.database, {
      channelId: "channel-a",
      subjectKey: "viewer-1",
      subjectId: "subject-1",
      eventId: "event-1",
      platformMessageRef: "msg-1",
      taskId: "task-1",
    });
  });

  afterEach(() => db.close());

  function lists() {
    return createListAdministration(decisionDeps(db.database));
  }

  const term = { action: "ADD" as const, term: "example-term", matchKind: "EXACT" as const, language: "zh", groupCode: "GROUP-1" };

  it("a data admin is denied every list and word-list edit, and nothing is written", () => {
    const admin = dataAdmin("admin-1");

    expect(lists().editSubjectList(admin, { subjectKey: "viewer-1", listKind: "BLACKLIST" })).toEqual({
      status: "denied",
      reason: "PERMISSION_DENIED",
    });
    expect(lists().editTerm(admin, term)).toEqual({ status: "denied", reason: "PERMISSION_DENIED" });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM list_entries")).toBe(0);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM rule_terms")).toBe(0);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM change_logs")).toBe(0);
  });

  it("a moderator adds a subject to the blacklist once, and the Change Log names the change without a score", () => {
    const service = lists();

    expect(service.editSubjectList(moderator("mod-1"), { subjectKey: "viewer-1", listKind: "BLACKLIST" })).toEqual({ status: "applied" });
    expect(service.editSubjectList(moderator("mod-1"), { subjectKey: "viewer-1", listKind: "BLACKLIST" })).toEqual({ status: "unchanged" });

    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM list_entries WHERE removed_at IS NULL")).toBe(1);
    const row = db.database.sqlite
      .prepare("SELECT change_kind, summary, correlation_id FROM change_logs")
      .get() as { change_kind: string; summary: string; correlation_id: string };
    expect(row).toEqual({ change_kind: "LIST_CHANGED", summary: "名单变更：加入黑名单", correlation_id: "subject:subject-1" });
    expect(row.summary).not.toMatch(/\d/);
  });

  it("a subject cannot be on the blacklist and the whitelist at once, and removing the entry ends it", () => {
    const service = lists();
    service.editSubjectList(moderator("mod-1"), { subjectKey: "viewer-1", listKind: "BLACKLIST" });

    expect(service.editSubjectList(moderator("mod-1"), { subjectKey: "viewer-1", listKind: "WHITELIST" })).toEqual({
      status: "conflict",
      reason: "OTHER_LIST_ACTIVE",
    });
    expect(service.editSubjectList(moderator("mod-1"), { subjectKey: "viewer-1", listKind: null })).toEqual({ status: "applied" });
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM list_entries WHERE removed_at IS NULL")).toBe(0);
    expect(
      db.database.sqlite.prepare("SELECT summary FROM change_logs ORDER BY rowid").all(),
    ).toEqual([{ summary: "名单变更：加入黑名单" }, { summary: "名单变更：移出名单" }]);
  });

  it("an unknown subject is refused", () => {
    expect(lists().editSubjectList(moderator("mod-1"), { subjectKey: "nobody", listKind: "WHITELIST" })).toEqual({
      status: "refused",
      reason: "SUBJECT_NOT_FOUND",
    });
  });

  it("a moderator adds a word once, retires it, and each change gets its own Change Log row", () => {
    const service = lists();

    expect(service.editTerm(moderator("mod-1"), term)).toEqual({ status: "applied" });
    expect(service.editTerm(moderator("mod-1"), term)).toEqual({ status: "unchanged" });
    expect(service.editTerm(moderator("mod-1"), { ...term, action: "RETIRE" })).toEqual({ status: "applied" });

    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM rule_terms WHERE retired_at IS NULL")).toBe(0);
    expect(countWhere(db.database, "SELECT COUNT(*) AS n FROM rule_terms")).toBe(1);
    expect(db.database.sqlite.prepare("SELECT summary, correlation_id FROM change_logs ORDER BY rowid").all()).toEqual([
      { summary: "词条变更：词条入库", correlation_id: null },
      { summary: "词条变更：词条停用", correlation_id: null },
    ]);
  });
});
