import { UntrustedText } from "../../components/untrusted-text";

/**
 * Untrusted text from the logs, shown through the S003 component. The `<bdi>` wrapper isolates bidi controls and
 * zero-width characters, so they cannot reorder the text around them. The characters themselves are kept (Q15).
 */
export function IsolatedText({ text }: { readonly text: string }) {
  return (
    <bdi>
      <UntrustedText text={text} />
    </bdi>
  );
}
