export interface CsvRecord {
  readonly line: number;
  readonly fields: readonly string[];
  readonly invalid: boolean;
}

export function readTermCsv(text: string): readonly CsvRecord[] {
  const input = text.replace(/^\uFEFF/u, "");
  const delimiter = delimiterOf(input);
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

function delimiterOf(input: string): "," | ";" {
  let quoted = false;
  let comma = 0;
  let semicolon = 0;
  for (const ch of input) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted) {
      if (ch === "\n" || ch === "\r") {
        if (comma > 0 || semicolon > 0) break;
      } else if (ch === ",") comma += 1;
      else if (ch === ";") semicolon += 1;
    }
  }
  return semicolon > comma ? ";" : ",";
}
