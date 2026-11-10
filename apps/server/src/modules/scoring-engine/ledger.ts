import type {
  ScoreCommitResult,
  ScoreDecision,
  ScoreSubjectKey,
  ScoreSubjectState,
  ScoringLedgerPort,
} from "@voxward/contracts";
import { withExceptionGuard } from "./exception-guard.js";

export interface ScoringCommit {
  readonly subject: ScoreSubjectKey;
  readonly idempotencyKey: string;
  readonly identityEventRef?: string;
  readonly committedAt: string;
  readonly decide: (state: ScoreSubjectState) => ScoreDecision;
}

/**
 * The single write path of the scoring module: realtime verdicts, identity events and manual corrections all come
 * through here. The exception guard wraps the caller's decision before the port receives it.
 */
export function commitScoring(port: ScoringLedgerPort, commit: ScoringCommit): ScoreCommitResult {
  return port.commitScoreDecision({ ...commit, decide: withExceptionGuard(commit.decide) });
}
