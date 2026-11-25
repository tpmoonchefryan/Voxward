import { parseTermLanguage } from "@voxward/contracts";

export const CSV_DELIMITERS = [",", ";", "\t"] as const;
export type CsvDelimiter = (typeof CSV_DELIMITERS)[number];

export type TermCsvErrorCode =
  | "UNTERMINATED_QUOTE"
  | "EMPTY_TERM"
  | "TERM_TOO_LONG"
  | "BATCH_LIMIT_EXCEEDED"
  | "INVALID_MATCH_KIND"
  | "INVALID_LANGUAGE"
  | "INVALID_ACTION"
  | "EMPTY_NORMALIZED"
  | "INVALID_REGEX"
  | "INVALID_READING";

export interface TermCsvRowError {
  readonly line: number;
  readonly code: TermCsvErrorCode;
  readonly message: string;
  readonly detail?: string;
}

export interface ParsedTermCsvRow {
  readonly line: number;
  readonly term: string;
  readonly categoryCode: string;
  readonly matchKind: "EXACT" | "CONTAINS" | "REGEX" | "NORMALIZED" | "PHONETIC";
  readonly language: string;
  readonly action: "BLOCK" | "REVIEW" | "ALLOW";
}

export interface ParseTermCsvOptions {
  readonly delimiter?: CsvDelimiter;
  readonly defaultCategoryCode: string;
  readonly listKind?: "BLACKLIST" | "WHITELIST";
  readonly maxRows?: number;
  readonly maxTermLength?: number;
  readonly normalizedTermIsEmpty?: (term: string) => boolean;
  readonly validateRegexPattern?: (pattern: string) => { readonly ok: boolean; readonly code?: string; readonly hint?: string };
}

export interface ParseTermCsvResult {
  readonly rows: readonly ParsedTermCsvRow[];
  readonly errors: readonly TermCsvRowError[];
}

interface CsvRecord {
  readonly line: number;
  readonly fields: readonly string[];
}

function parseRfc4180Records(
  input: string,
  delimiter: CsvDelimiter,
): { readonly records: readonly CsvRecord[]; readonly unterminatedQuoteLine: number | null } {
  const normalized = input.replace(/^\uFEFF/, "");
  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteStartLine = 1;
  let recordStartLine = 1;
  let line = 1;

  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i] ?? "";
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === "\n") {
          line += 1;
        } else if (ch === "\r") {
          if (normalized[i + 1] === "\n") {
            current += "\n";
            i += 1;
            line += 1;
            continue;
          }
          line += 1;
        }
        current += ch;
      }
      continue;
    }

    if (ch === '"') {
      if (current === "") {
        inQuotes = true;
        quoteStartLine = line;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === delimiter) {
      fields.push(current);
      current = "";
      continue;
    }

    if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && normalized[i + 1] === "\n") {
        i += 1;
      }
      fields.push(current);
      if (fields.some((field) => field.trim().length > 0)) {
        records.push({ line: recordStartLine, fields });
      }
      fields = [];
      current = "";
      line += 1;
      recordStartLine = line;
      continue;
    }

    current += ch;
  }

  if (inQuotes) {
    return { records, unterminatedQuoteLine: quoteStartLine };
  }

  if (current.length > 0 || fields.length > 0) {
    fields.push(current);
    if (fields.some((field) => field.trim().length > 0)) {
      records.push({ line: recordStartLine, fields });
    }
  }

  return { records, unterminatedQuoteLine: null };
}

function isHeaderRecord(parts: readonly string[]): boolean {
  const c0 = parts[0]?.toLowerCase() ?? "";
  const c1 = parts[1]?.toLowerCase() ?? "";
  const c2 = parts[2]?.toLowerCase() ?? "";
  return c0 === "term" && c1 === "category" && (c2 === "matchkind" || c2 === "match_kind");
}

/**
 * Pure RFC-4180 CSV parser for channel term import:
 * - Supports explicit delimiter (`,` / `;` / `\t`), quotes, escaped `""`, and embedded newlines.
 * - Validates matchKind, BCP-47 language tag (via `@voxward/contracts`), action, normalized emptiness, and regex safety.
 */
export function parseTermCsv(csvText: string, options: ParseTermCsvOptions): ParseTermCsvResult {
  const delimiter = options.delimiter ?? ",";
  const { records, unterminatedQuoteLine } = parseRfc4180Records(csvText, delimiter);
  const errors: TermCsvRowError[] = [];
  if (unterminatedQuoteLine !== null) {
    errors.push({
      line: unterminatedQuoteLine,
      code: "UNTERMINATED_QUOTE",
      message: "Unterminated quoted CSV field",
    });
    return { rows: [], errors };
  }

  const maxRows = options.maxRows ?? 500;
  const maxTermLength = options.maxTermLength ?? 100;
  const READING_PATTERN = /^[a-z0-9]+$/;
  const rows: ParsedTermCsvRow[] = [];
  let dataRowCount = 0;
  for (const [idx, record] of records.entries()) {
    const parts = record.fields.map((part) => part.trim());
    if (idx === 0 && isHeaderRecord(parts)) {
      continue;
    }
    dataRowCount += 1;
    if (dataRowCount > maxRows) {
      errors.push({
        line: record.line,
        code: "BATCH_LIMIT_EXCEEDED",
        message: `CSV import exceeds maximum of ${maxRows} rows per batch`,
      });
      break;
    }
    const [term = "", rawCategory = "", rawKind = "EXACT", rawLang = "", rawAction = ""] = parts;
    if (!term) {
      errors.push({ line: record.line, code: "EMPTY_TERM", message: "Term must not be empty" });
      continue;
    }
    if ([...term].length > maxTermLength) {
      errors.push({
        line: record.line,
        code: "TERM_TOO_LONG",
        message: `Term exceeds maximum length of ${maxTermLength} characters`,
      });
      continue;
    }
    const rawMatchKind = (rawKind || "EXACT").toUpperCase();
    const matchKind =
      rawMatchKind === "CROSS_LANGUAGE_PHONETIC" || rawMatchKind === "READING" ? "PHONETIC" : rawMatchKind;
    if (
      matchKind !== "EXACT" &&
      matchKind !== "CONTAINS" &&
      matchKind !== "REGEX" &&
      matchKind !== "NORMALIZED" &&
      matchKind !== "PHONETIC"
    ) {
      errors.push({
        line: record.line,
        code: "INVALID_MATCH_KIND",
        message: "matchKind must be EXACT, CONTAINS, REGEX, NORMALIZED, or PHONETIC",
        detail: rawKind,
      });
      continue;
    }
    const language = rawLang === "" ? "und" : parseTermLanguage(rawLang);
    if (language === null) {
      errors.push({
        line: record.line,
        code: "INVALID_LANGUAGE",
        message: "Invalid BCP 47 language tag",
        detail: rawLang,
      });
      continue;
    }
    const defaultAction = options.listKind === "WHITELIST" ? "ALLOW" : "REVIEW";
    const upperAction = rawAction === "" ? defaultAction : rawAction.toUpperCase();
    if (upperAction !== "BLOCK" && upperAction !== "REVIEW" && upperAction !== "ALLOW") {
      errors.push({
        line: record.line,
        code: "INVALID_ACTION",
        message: "action must be BLOCK, REVIEW, or ALLOW",
        detail: rawAction,
      });
      continue;
    }
    if (options.listKind === "BLACKLIST" && upperAction === "ALLOW") {
      errors.push({
        line: record.line,
        code: "INVALID_ACTION",
        message: "BLACKLIST entries only accept BLOCK or REVIEW action",
        detail: rawAction,
      });
      continue;
    }
    if (options.listKind === "WHITELIST" && upperAction === "BLOCK") {
      errors.push({
        line: record.line,
        code: "INVALID_ACTION",
        message: "WHITELIST entries cannot use BLOCK action",
        detail: rawAction,
      });
      continue;
    }
    if (matchKind === "PHONETIC" && !READING_PATTERN.test(term.toLowerCase())) {
      errors.push({
        line: record.line,
        code: "INVALID_READING",
        message: "PHONETIC reading term must contain only ASCII letters and digits ([a-z0-9]+)",
      });
      continue;
    }
    if (matchKind === "NORMALIZED" && options.normalizedTermIsEmpty?.(term)) {
      errors.push({
        line: record.line,
        code: "EMPTY_NORMALIZED",
        message: "Normalized term must not be empty",
      });
      continue;
    }
    if (matchKind === "REGEX" && options.validateRegexPattern) {
      const check = options.validateRegexPattern(term);
      if (!check.ok) {
        errors.push({
          line: record.line,
          code: "INVALID_REGEX",
          message: check.hint ?? check.code ?? "Invalid regular expression",
          ...(check.code ? { detail: check.code } : {}),
        });
        continue;
      }
    }
    rows.push({
      line: record.line,
      term: matchKind === "PHONETIC" ? term.toLowerCase() : term,
      categoryCode: rawCategory || options.defaultCategoryCode,
      matchKind,
      language,
      action: upperAction,
    });
  }
  return { rows, errors };
}
