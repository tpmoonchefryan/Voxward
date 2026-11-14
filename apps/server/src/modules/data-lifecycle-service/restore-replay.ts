import { EVIDENCE_KINDS, type AuditLogPort, type SubjectCleanupPort } from "@voxward/contracts";
import type { TombstoneRecord } from "./types.js";

/** Everything a replay needs, injected: the module reads no database and no file. */
export interface ReplayDeps {
  readonly cleanup: SubjectCleanupPort;
  readonly logs: Pick<AuditLogPort, "certifySubjectChangeLogs" | "removeSubjectEvidence" | "removeSubjectTechnicalRows">;
  /** Re-creates the scoring-exception marker on the restored database. */
  readonly reinstateException: (input: {
    readonly channelId: string;
    readonly subjectId: string;
    readonly requestId: string;
    readonly at: string;
  }) => void;
  /** Bumps `processing_generation` on the restored database if the deletion request predates the snapshot. */
  readonly bumpGenerationForTombstone: (input: { readonly subjectId: string; readonly requestId: string }) => void;
  readonly certificateSummary: string;
  readonly now: () => Date;
}

export interface ReplayFailure {
  readonly requestId: string;
  readonly code: string;
}

export interface ReplayReport {
  /** True only when every tombstoned subject that is in the snapshot was cleaned. */
  readonly complete: boolean;
  readonly replayed: number;
  /** Subjects that the snapshot does not contain: nothing to resurrect. */
  readonly absent: number;
  readonly failed: readonly ReplayFailure[];
}

interface SubjectPlan {
  readonly channelId: string;
  readonly subjectId: string;
  readonly requestId: string;
  readonly requestIds: string[];
  exception: { readonly requestId: string; readonly at: string } | null;
}

/**
 * Repeats the deletions of the tombstone ledger on a restored snapshot (S020, SUB-038), before it serves anything. Every
 * surface of a tombstoned subject is cleaned in the order of the S019 executor; other subjects are never touched. The
 * exception marker is reinstated for DELETE_AND_EXCEPT unless a later RESUME entry lifted it. Surfaces are idempotent,
 * so replaying a deletion that the snapshot already contains changes nothing.
 */
export function replayTombstones(deps: ReplayDeps, tombstones: readonly TombstoneRecord[]): ReplayReport {
  const plans = new Map<string, SubjectPlan>();
  for (const entry of tombstones) {
    const key = `${entry.channelId}\u0000${entry.subjectId}`;
    if (entry.kind === "DELETE") {
      const plan = plans.get(key) ?? {
        channelId: entry.channelId,
        subjectId: entry.subjectId,
        requestId: entry.requestId,
        requestIds: [],
        exception: null,
      };
      if (!plan.requestIds.includes(entry.requestId)) plan.requestIds.push(entry.requestId);
      if (entry.mode === "DELETE_AND_EXCEPT") plan.exception = { requestId: entry.requestId, at: entry.at };
      plans.set(key, plan);
    } else if (entry.kind === "RESUME") {
      const plan = plans.get(key);
      if (plan !== undefined) plan.exception = null;
    }
  }

  const failed: ReplayFailure[] = [];
  let replayed = 0;
  let absent = 0;
  for (const plan of plans.values()) {
    try {
      if (deps.cleanup.readCleanupFacts(plan.channelId, plan.subjectId) === undefined) {
        absent += 1;
        continue;
      }
      cleanSubject(deps, plan);
      if (plan.exception !== null) {
        deps.reinstateException({ channelId: plan.channelId, subjectId: plan.subjectId, ...plan.exception });
      }
      for (const requestId of plan.requestIds) {
        deps.bumpGenerationForTombstone({ subjectId: plan.subjectId, requestId });
      }
      replayed += 1;
    } catch (error) {
      failed.push({ requestId: plan.requestId, code: codeOf(error) });
    }
  }
  return { complete: failed.length === 0, replayed, absent, failed };
}

/** The database surfaces in cleaning order, with the child rows of an FK parent swept before it, as the executor does. */
function cleanSubject(deps: ReplayDeps, plan: SubjectPlan): void {
  const { channelId, subjectId } = plan;
  const clean = (targetKind: Parameters<SubjectCleanupPort["cleanSurface"]>[0]["targetKind"]): void => {
    deps.cleanup.cleanSurface({ channelId, subjectId, targetKind, at: deps.now().toISOString() });
  };
  deps.logs.certifySubjectChangeLogs(subjectId, deps.certificateSummary);
  for (const kind of EVIDENCE_KINDS) deps.logs.removeSubjectEvidence(subjectId, kind);
  deps.logs.removeSubjectTechnicalRows(subjectId);
  for (const kind of ["SCORE_OUTCOME", "SCORE_LEDGER", "SUBJECT_IDENTITY", "NICKNAME_CHANGE", "SUBJECT_SCORE"] as const) clean(kind);
  clean("DELIVERY");
  clean("VERDICT");
  deps.logs.removeSubjectTechnicalRows(subjectId);
  clean("TASK");
  clean("CHANNEL_EVENT");
}

function codeOf(error: unknown): string {
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Z][A-Z_]{2,63}$/.test(code) ? code : "REPLAY_FAILED";
}
