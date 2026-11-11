/**
 * The minimal marker a scoring-exception preference keeps (design §5). It holds the purpose, the subject's internal
 * reference and the time it was made. It never holds a score, a nickname, a message or the request's content.
 * The HMAC subject marker that the proposal asks for has no key source yet (design §8), so the subject reference
 * stands in for it.
 */
export const PREFERENCE_PURPOSE = "SCORING_EXCEPTION_PREFERENCE" as const;

export interface PreferenceMarker {
  readonly purpose: typeof PREFERENCE_PURPOSE;
  readonly subjectId: string;
  readonly createdAt: string;
}

export function preferenceMarkerOf(subjectId: string, createdAt: string): PreferenceMarker {
  return { purpose: PREFERENCE_PURPOSE, subjectId, createdAt };
}
