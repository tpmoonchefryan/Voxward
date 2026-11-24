import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { GuidesPage } from "../GuidesPage";
import { route } from "../route";

describe("GuidesPage (VW-Draft-08)", () => {
  it("exports /guides route and renders StatusBadge support matrix without raw enum strings", () => {
    expect(route.path).toBe("/guides");

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/guides"]}>
        <GuidesPage />
      </MemoryRouter>,
    );

    expect(html).toContain("接入指南");
    expect(html).toContain("官方协议支持");
    expect(html).toContain("本机回环已验证");
    expect(html).toContain("云端至本机 PC 回环拓扑");
    expect(html).toContain("前往集成管理签发凭据");
    expect(html).toContain("4403");
    expect(html).not.toContain("SUPPORTED");
    expect(html).not.toContain("VERIFIED_LOOPBACK");
    expect(html).not.toContain("UNSUPPORTED");
  });
});
