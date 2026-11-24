import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { IntegrationsPage } from "../IntegrationsPage";
import { route } from "../route";

describe("Integrations Page (VW-Draft-04B)", () => {
  it("exports /integrations/:channelId? route", () => {
    expect(route.path).toBe("/integrations/:channelId?");
  });

  it("renders adapter launcher button, empty adapter state, and unified downstream outputs management", () => {
    const stubApi = {
      getCatalog: vi.fn(async () => []),
      listAdapters: vi.fn(async () => []),
      createAdapter: vi.fn(async () => {
        throw new Error("unused");
      }),
      updateAdapter: vi.fn(async () => {
        throw new Error("unused");
      }),
      deleteAdapter: vi.fn(async () => {}),
      runAdapterAction: vi.fn(async () => {
        throw new Error("unused");
      }),
      getOutputs: vi.fn(async () => ({ grants: [], tokens: [] })),
      issueOutputToken: vi.fn(async () => ({ id: "t1", token: "vw_tok_abc" })),
      revokeOutputToken: vi.fn(async () => {}),
      issueOutputGrant: vi.fn(async () => ({ grantId: "g1", credential: "vw_gnt_xyz" })),
      revokeOutputGrant: vi.fn(async () => {}),
    };

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/integrations/ch_1"]}>
        <Routes>
          <Route path="/integrations/:channelId?" element={<IntegrationsPage api={stubApi} />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("系统集成");
    expect(html).toContain("+ 接入新适配器 ▾");
    expect(html).toContain("已接入适配器实例");
    expect(html).toContain("下游输出适配器");
    expect(html).not.toContain("下游输出与单向只读连接凭据");
    expect(html).not.toContain("签发 OBS 投屏令牌");
    expect(html).not.toContain("当前频道");
  });
});
