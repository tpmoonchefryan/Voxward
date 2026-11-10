const HTML_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

/** Escapes text for HTML, including the characters that end an attribute or a template literal. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"'`]/g, (char) => HTML_ESCAPES[char] ?? char);
}

/** Removes C0 and C1 control characters. Tab and newline are kept, because they carry layout. */
export function stripControlCharacters(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
}

/** Only http and https addresses may become links. Any other scheme, including javascript:, is refused. */
export function isSafeHttpUrl(candidate: string): boolean {
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
