/** Input the audit module refuses before any port call. The field names the rule that failed, never the value. */
export class AuditInputError extends Error {
  readonly code = "AUDIT_INPUT_INVALID";
  readonly field: string;

  constructor(field: string) {
    super(`audit input rejected: ${field}`);
    this.name = "AuditInputError";
    this.field = field;
  }
}
