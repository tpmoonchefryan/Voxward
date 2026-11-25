import { parseTermLanguage } from "@voxward/contracts";

export interface CsvRecord {
  readonly line: number;
  readonly fields: readonly string[];
  readonly invalid: boolean;
}

export function readTermCsv(text: string): readonly CsvRecord[] {
  const input = text.replace(/^\uFEFF/u, "");
  const comma = readDelimited(input, ",");
  const semicolon = readDelimited(input, ";");
  const commaFit = delimiterFit(comma);
  const semicolonFit = delimiterFit(semicolon);
  for (const [index, value] of semicolonFit.entries()) {
    const other = commaFit[index] ?? 0;
    if (value !== other) return value > other ? semicolon : comma;
  }
  return semicolonFit[3] > 0 ? semicolon : comma;
}

function readDelimited(input: string, delimiter: "," | ";"): readonly CsvRecord[] {
  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let field = "";
  let line = 1;
  let startLine = 1;
  let state: "unquoted" | "quoted" | "closed" = "unquoted";
  let invalid = false;
  const pushField = () => {
    fields.push(field.trim());
    field = "";
    state = "unquoted";
  };
  const pushRecord = () => {
    pushField();
    if (invalid || fields.some(Boolean) || fields.length > 1) records.push({ line: startLine, fields, invalid });
    fields = [];
    invalid = false;
  };

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i += 1;
      line += 1;
      if (state === "quoted") field += "\n";
      else {
        pushRecord();
        startLine = line;
      }
    } else if (state === "quoted") {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') state = "closed";
      else field += ch;
    } else if (ch === delimiter) {
      pushField();
    } else if (ch === '"') {
      if (state === "unquoted" && field.trim() === "") {
        field = "";
        state = "quoted";
      } else invalid = true;
    } else if (state === "closed") {
      if (ch?.trim() !== "") invalid = true;
    } else {
      field += ch;
    }
  }
  if (state === "quoted") invalid = true;
  pushRecord();
  return records;
}

function delimiterFit(records: readonly CsvRecord[]): readonly [
  header: number, validRows: number, explicitMatchKinds: number, multiColumn: number,
] {
  const first = records[0];
  const header = first !== undefined && !first.invalid &&
    first.fields[0]?.toLowerCase() === "term" && first.fields[1]?.toLowerCase() === "category" &&
    first.fields[2]?.toLowerCase() === "matchkind";
  const multiColumn = records.filter(({ invalid, fields }) =>
    !invalid && fields.length >= 2 && fields.length <= 4 && Boolean(fields[0]));
  const validRows = multiColumn.filter(({ fields }) => {
    return parseTermLanguage(fields[3] || "und") !== null &&
      /^(EXACT|CONTAINS|NORMALIZED|REGEX)$/i.test(fields[2] || "EXACT");
  });
  return [Number(header), validRows.length, validRows.filter(({ fields }) => Boolean(fields[2])).length, multiColumn.length];
}
