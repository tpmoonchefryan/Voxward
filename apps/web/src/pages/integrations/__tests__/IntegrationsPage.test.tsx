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

    expect(html).toContain("Integrations");
    expect(html).toContain("+ Add Adapter ▾");
    expect(html).toContain("Configured Adapter Instances (0)");
    expect(html).toContain("Output Target");
    expect(html).not.toContain("Issue OBS Token");
    expect(html).not.toContain("Active Channel");
  });
});
