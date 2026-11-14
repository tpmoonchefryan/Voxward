import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UntrustedText } from "../src/components/untrusted-text";

describe("UntrustedText", () => {
  it("renders script markup as escaped text", () => {
    const html = renderToStaticMarkup(<UntrustedText text="<script>alert(1)</script>" />);
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("keeps template and tool-call syntax as plain text", () => {
    const html = renderToStaticMarkup(<UntrustedText text={'{{ 7*7 }} ${process.exit()} <tool_call name="rm"/>'} />);
    expect(html).toContain("{{ 7*7 }}");
    expect(html).toContain("${process.exit()}");
    expect(html).not.toContain("<tool_call");
  });

  it("creates no links and drops control characters", () => {
    const html = renderToStaticMarkup(<UntrustedText text={"open https://example.com\u0007 now"} />);
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("\u0007");
    expect(html).toContain("open https://example.com now");
  });

  it("wraps cleaned text in <bdi> to isolate bidi and zero-width characters (Q15)", () => {
    const html = renderToStaticMarkup(<UntrustedText text={"abc\u202Edef\u200Bghi\u2066jkl\u2069"} />);
    expect(html).toContain('<span class="untrusted-text" data-untrusted="true" style="white-space:pre-wrap"><bdi>');
    expect(html).toContain("</bdi></span>");
    expect(html).toContain("\u202E");
    expect(html).toContain("\u200B");
  });
});
