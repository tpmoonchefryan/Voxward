const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

export interface UntrustedTextProps {
  /** Text from a viewer, a platform, a log or a model. It is shown as characters and never parsed as markup. */
  readonly text: string;
}

/**
 * Renders untrusted text as plain characters. React escapes text children, so markup, template syntax and
 * tool-call syntax stay visible as text. This component has no innerHTML path and creates no links.
 */
export function UntrustedText({ text }: UntrustedTextProps) {
  return (
    <span className="untrusted-text" data-untrusted="true" style={{ whiteSpace: "pre-wrap" }}>
      {text.replace(CONTROL_CHARACTERS, "")}
    </span>
  );
}
