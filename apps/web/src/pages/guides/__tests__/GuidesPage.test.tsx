import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { GuidesPage } from "../GuidesPage";
import { route } from "../route";

describe("GuidesPage (VW-Draft-08)", () => {
  it("exports /guides route and renders StatusBadge support matrix in English by default without raw enum strings", () => {
    expect(route.path).toBe("/guides");

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/guides"]}>
        <GuidesPage />
      </MemoryRouter>,
    );

    expect(html).toContain("Integration Guides");
    expect(html).toContain("Official Protocol");
    expect(html).toContain("Loopback Verified");
    expect(html).toContain("Cloud-to-PC Loopback Topology");
    expect(html).toContain("Issue credentials in Integrations");
    expect(html).toContain("4403");
    expect(html).not.toContain("SUPPORTED");
    expect(html).not.toContain("VERIFIED_LOOPBACK");
    expect(html).not.toContain("UNSUPPORTED");
  });
});
