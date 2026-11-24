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
      name: "审计助手",
      description: "",
      systemPreset: false,
      permissions: { "logs.view": "GRANT", "queue.read": "GRANT" },
    };
    const denyLogs: RbacRoleView = {
      id: "r_deny",
      name: "脱敏受限组",
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

  it("renders non-flattened 用户列表 view with + 创建用户 trigger and zero platform.message.delete capability", () => {
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

    expect(html).toContain("用户管理");
    expect(html).toContain("用户列表");
    expect(html).toContain("角色管理");
    expect(html).toContain("+ 创建用户");
    expect(html).not.toContain("创建新用户");
    expect(html).not.toContain("实时生效权限合成结果");
    expect(html).not.toContain("platform.message.delete");
    expect(html).not.toContain("当前频道");
  });
});
