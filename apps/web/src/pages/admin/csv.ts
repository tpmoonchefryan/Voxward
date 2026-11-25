export const CSV_ENCODINGS = ["utf-8", "gb18030", "shift_jis", "euc-kr"] as const;
export type CsvEncoding = (typeof CSV_ENCODINGS)[number];

export const CSV_DELIMITERS = [",", ";", "\t"] as const;
export type CsvDelimiter = (typeof CSV_DELIMITERS)[number];

export function decodeCsvBuffer(buffer: ArrayBuffer, encoding: CsvEncoding): string {
  return new TextDecoder(encoding, { fatal: false }).decode(buffer).replace(/^\uFEFF/, "");
}

export interface CsvPreviewResult {
  readonly hasHeader: boolean;
  readonly rows: readonly (readonly string[])[];
  readonly totalRows: number;
  readonly unterminatedQuote: boolean;
}

export function previewTermCsv(
  input: string,
  delimiter: CsvDelimiter,
  maxRows = 5,
): CsvPreviewResult {
  const normalized = input.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let fields: string[] = [];
  let current = "";
  let inQuotes = false;

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
        if (ch === "\r" && normalized[i + 1] === "\n") {
          current += "\n";
          i += 1;
        } else {
          current += ch;
        }
      }
      continue;
    }

    if (ch === '"' && current === "") {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      fields.push(current.trim());
      current = "";
      continue;
    }
    if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && normalized[i + 1] === "\n") {
        i += 1;
      }
      fields.push(current.trim());
      if (fields.some((f) => f.length > 0)) {
        records.push(fields);
      }
      fields = [];
      current = "";
      continue;
    }
    current += ch;
  }

  if (inQuotes) {
    return {
      hasHeader: false,
      rows: records.slice(0, maxRows),
      totalRows: records.length,
      unterminatedQuote: true,
    };
  }

  if (current.length > 0 || fields.length > 0) {
    fields.push(current.trim());
    if (fields.some((f) => f.length > 0)) {
      records.push(fields);
    }
  }

  const first = records[0];
  const hasHeader =
    first !== undefined &&
    (first[0]?.toLowerCase() ?? "") === "term" &&
    (first[1]?.toLowerCase() ?? "") === "category" &&
    ((first[2]?.toLowerCase() ?? "") === "matchkind" || (first[2]?.toLowerCase() ?? "") === "match_kind");
  const dataRows = hasHeader ? records.slice(1) : records;
  return {
    hasHeader,
    rows: dataRows.slice(0, maxRows),
    totalRows: dataRows.length,
    unterminatedQuote: false,
  };
}
