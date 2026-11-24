import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { UsersPage } from "../UsersPage";
import { previewEffectivePermissions, type RbacRoleView } from "../api";
import { route } from "../route";

describe("Users & RBAC Page (VW-Draft-04C)", () => {
  it("exports /users/:channelId? route", () => {
    expect(route.path).toBe("/users/:channelId?");
  });

  it("enforces Deny > Grant > Not Set precedence across multiple assigned roles", () => {
    const grantLogs: RbacRoleView = {
      id: "r_grant",
      name: "Audit Helper",
      description: "",
      systemPreset: false,
      permissions: { "logs.view": "GRANT", "queue.read": "GRANT" },
    };
    const denyLogs: RbacRoleView = {
      id: "r_deny",
      name: "Restricted Group",
      description: "",
      systemPreset: false,
      permissions: { "logs.view": "DENY" },
    };

    const effective = previewEffectivePermissions([grantLogs, denyLogs]);
    const logsEntry = effective.find((e) => e.capability === "logs.view");
    const queueEntry = effective.find((e) => e.capability === "queue.read");
    const dataEntry = effective.find((e) => e.capability === "data.handle");

    expect(logsEntry?.effect).toBe("DENY");
    expect(logsEntry?.decidedBy).toBe("DENY_RULE");
    expect(logsEntry?.sourceRoleIds).toEqual(["r_deny"]);

    expect(queueEntry?.effect).toBe("ALLOW");
    expect(queueEntry?.decidedBy).toBe("GRANT_RULE");

    expect(dataEntry?.effect).toBe("DENY");
    expect(dataEntry?.decidedBy).toBe("DEFAULT_DENY");
  });

  it("renders non-flattened Users list view with + Create User trigger and zero platform.message.delete capability", () => {
    const stubApi = {
      listRoles: vi.fn(async () => []),
      createRole: vi.fn(async () => []),
      updateRole: vi.fn(async () => []),
      deleteRole: vi.fn(async () => {}),
      listUsersAndRoles: vi.fn(async () => ({ users: [], roles: [] })),
      upsertUser: vi.fn(async () => {
        throw new Error("unused");
      }),
      deleteUser: vi.fn(async () => {}),
    };

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/users/ch_1"]}>
        <Routes>
          <Route path="/users/:channelId?" element={<UsersPage api={stubApi} />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(html).toContain("Users &amp; RBAC");
    expect(html).toContain("Users (0)");
    expect(html).toContain("Roles (0)");
    expect(html).toContain("+ Create User");
    expect(html).not.toContain("Create Operator Account");
    expect(html).not.toContain("Effective Combined Permissions");
    expect(html).not.toContain("platform.message.delete");
    expect(html).not.toContain("Active Channel");
  });
});
