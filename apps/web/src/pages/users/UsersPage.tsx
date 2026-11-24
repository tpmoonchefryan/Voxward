import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import {
  Badge,
  Button,
  ConfirmActionDialog,
  EmptyState,
  Input,
  MultiSelect,
  SearchInput,
  Select,
  SettingsLayout,
  Switch,
  TableShell,
} from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import { VoxWardShell, useVoxWardShell } from "../../shell";
import {
  createUsersRbacApi,
  previewEffectivePermissions,
  RBAC_CAPABILITY_KEYS,
  UsersRbacApiError,
  type RbacCapabilityKey,
  type RbacRoleView,
  type RbacTriState,
  type RbacUserView,
  type UsersRbacApi,
} from "./api";

const CAPABILITY_LABELS: Readonly<
  Record<RbacCapabilityKey, { readonly name: string; readonly scope: string }>
> = {
  "queue.read": { name: "查看待审队列与旁路流", scope: "审核工作台" },
  "review.decide": { name: "人工审核裁决与评分重判", scope: "审核工作台" },
  "list.edit": { name: "增删词库与黑名单用户", scope: "规则与拦截" },
  "score.config": { name: "配置计分规则与 AI 模型策略", scope: "系统设置" },
  "output.manage": { name: "管理直播平台、AI 与下游输出适配器", scope: "系统集成" },
  "output.feed": { name: "读取只读下游推送流", scope: "输出通道" },
  "members.manage": { name: "成员授权与三态角色权限管理", scope: "用户与权限" },
  "tokens.manage": { name: "签发或吊销 OBS / 桌面端输出凭据", scope: "系统集成" },
  "message.original": { name: "在工作台查看完整未折叠弹幕原文", scope: "隐私分级" },
  "subject.evidence": { name: "查看观众取证档案与记录", scope: "隐私分级" },
  "data.handle": { name: "执行数据导出与匿名化删除", scope: "数据合规" },
  "logs.view": { name: "查阅技术、变更与集成日志", scope: "日志审计" },
};

type UsersViewMode = "users-list" | "edit-user" | "roles-list" | "edit-role";

function decidedByLabel(decidedBy: string): string {
  switch (decidedBy) {
    case "DENY_RULE":
      return "显式拒绝优先";
    case "GRANT_RULE":
      return "显式授予";
    default:
      return "默认拒绝（未配置）";
  }
}

export function UsersPage({ api }: { readonly api?: UsersRbacApi }) {
  const params = useParams();
  const { activeChannelId } = useVoxWardShell();
  const channelId = params.channelId ?? activeChannelId;
  const client = useMemo(() => api ?? createUsersRbacApi(), [api]);

  const [viewMode, setViewMode] = useState<UsersViewMode>("users-list");
  const [users, setUsers] = useState<readonly RbacUserView[]>([]);
  const [roles, setRoles] = useState<readonly RbacRoleView[]>([]);

  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Create / Edit User state (inline create hidden until "+ 创建用户" click)
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [userAccountId, setUserAccountId] = useState("");
  const [userLoginName, setUserLoginName] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [userEnabled, setUserEnabled] = useState(true);
  const [userRoleIds, setUserRoleIds] = useState<string[]>([]);

  // Create / Edit Role state (inline create hidden until "+ 创建角色" click)
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRolePreset, setEditingRolePreset] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [rolePermissions, setRolePermissions] = useState<Record<string, RbacTriState>>({});
  const [pendingDeleteRole, setPendingDeleteRole] = useState<RbacRoleView | null>(null);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "positive" | "danger"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await client.listUsersAndRoles(channelId);
      setUsers(data.users);
      setRoles(data.roles);
    } catch (error) {
      if (error instanceof UsersRbacApiError && error.status === 401) {
        return;
      }
      setNotice({
        tone: "danger",
        text: error instanceof UsersRbacApiError ? `加载权限配置失败 (${error.code})` : "加载用户与角色失败。",
      });
    }
  }, [channelId, client]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "ALL" && !u.roleIds.includes(roleFilter)) return false;
      if (!q) return true;
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.loginName.toLowerCase().includes(q) ||
        u.accountId.toLowerCase().includes(q)
      );
    });
  }, [users, userSearch, roleFilter]);

  const liveAssignedRoles = useMemo(
    () => roles.filter((r) => userRoleIds.includes(r.id)),
    [roles, userRoleIds],
  );

  const livePreview = useMemo(
    () => previewEffectivePermissions(liveAssignedRoles),
    [liveAssignedRoles],
  );

  const resetUserDraft = () => {
    setEditingAccountId(null);
    setUserAccountId("");
    setUserLoginName("");
    setUserDisplayName("");
    setUserEnabled(true);
    setUserRoleIds([]);
  };

  const openEditUser = (user: RbacUserView) => {
    setEditingAccountId(user.accountId);
    setUserAccountId(user.accountId);
    setUserLoginName(user.loginName);
    setUserDisplayName(user.displayName);
    setUserEnabled(user.enabled);
    setUserRoleIds([...user.roleIds]);
    setShowCreateUser(false);
    setViewMode("edit-user");
  };

  const handleSaveUser = async () => {
    const rawLogin = userLoginName.trim();
    const accountId = (editingAccountId ?? (userAccountId.trim() || `acc-${rawLogin}`)).trim();
    if (!accountId || !rawLogin || !userDisplayName.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      await client.upsertUser(channelId, {
        accountId,
        loginName: rawLogin,
        displayName: userDisplayName.trim(),
        enabled: userEnabled,
        roleIds: userRoleIds,
      });
      await loadData();
      resetUserDraft();
      setShowCreateUser(false);
      setViewMode("users-list");
      setNotice({ tone: "positive", text: "用户账号与多角色授权关系已保存。" });
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof UsersRbacApiError ? `保存用户失败 (${error.code})` : "保存用户失败。",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteUser = async (accountId: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await client.deleteUser(channelId, accountId);
      if (editingAccountId === accountId) {
        resetUserDraft();
        setViewMode("users-list");
      }
      await loadData();
      setNotice({ tone: "positive", text: "用户授权已移除。" });
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof UsersRbacApiError ? `删除用户失败 (${error.code})` : "删除用户失败。",
      });
    } finally {
      setBusy(false);
    }
  };

  const resetRoleDraft = () => {
    setEditingRoleId(null);
    setEditingRolePreset(false);
    setRoleName("");
    setRoleDescription("");
    setRolePermissions({});
  };

  const openEditRole = (role: RbacRoleView) => {
    setEditingRoleId(role.id);
    setEditingRolePreset(role.systemPreset);
    setRoleName(role.name);
    setRoleDescription(role.description);
    setRolePermissions({ ...role.permissions });
    setShowCreateRole(false);
    setViewMode("edit-role");
  };

  const handleCreateRoleInline = async () => {
    if (!roleName.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const updatedRoles = await client.createRole(channelId, {
        name: roleName.trim(),
        description: roleDescription.trim(),
        permissions: {},
      });
      setRoles(updatedRoles);
      const created = updatedRoles.find((r) => r.name === roleName.trim()) ?? null;
      resetRoleDraft();
      setShowCreateRole(false);
      if (created !== null) {
        openEditRole(created);
      }
      setNotice({ tone: "positive", text: "角色已创建；可在此继续配置三态权限矩阵。" });
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof UsersRbacApiError ? `创建角色失败 (${error.code})` : "创建角色失败。",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveRolePermissions = async () => {
    if (editingRoleId === null || !roleName.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      await client.updateRole(channelId, editingRoleId, {
        name: roleName.trim(),
        description: roleDescription.trim(),
        permissions: rolePermissions,
      });
      await loadData();
      resetRoleDraft();
      setViewMode("roles-list");
      setNotice({ tone: "positive", text: "角色权限矩阵已保存。" });
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof UsersRbacApiError ? `保存角色失败 (${error.code})` : "保存角色失败。",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDeleteRole = async () => {
    if (pendingDeleteRole === null) return;
    setBusy(true);
    setNotice(null);
    try {
      await client.deleteRole(channelId, pendingDeleteRole.id);
      if (editingRoleId === pendingDeleteRole.id) {
        resetRoleDraft();
        setViewMode("roles-list");
      }
      await loadData();
      setNotice({ tone: "positive", text: "自定义角色已删除。" });
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof UsersRbacApiError ? `删除角色失败 (${error.code})` : "删除角色失败。",
      });
    } finally {
      setBusy(false);
      setPendingDeleteRole(null);
    }
  };

  const isListView = viewMode === "users-list" || viewMode === "roles-list";
  const pageTitle =
    viewMode === "edit-user"
      ? `编辑用户 · ${userDisplayName} (${userLoginName})`
      : viewMode === "edit-role"
        ? `编辑角色 · ${roleName}`
        : "用户管理";
  const pageDescription =
    viewMode === "edit-user"
      ? "维护用户资料、账号启停状态及多角色叠加后的最终生效权限。"
      : viewMode === "edit-role"
        ? "配置三态权限矩阵，多角色合并严格遵循 Deny > Grant > Not Set。"
        : "管理工作台用户多角色授权，并配置三态权限角色矩阵（Deny > Grant > Not Set）。";

  const pageActions =
    viewMode === "users-list" ? (
      <Button
        size="sm"
        variant={showCreateUser ? "secondary" : "primary"}
        onClick={() => {
          resetUserDraft();
          setShowCreateUser((prev) => !prev);
        }}
      >
        {showCreateUser ? "收起创建" : "+ 创建用户"}
      </Button>
    ) : viewMode === "roles-list" ? (
      <Button
        size="sm"
        variant={showCreateRole ? "secondary" : "primary"}
        onClick={() => {
          resetRoleDraft();
          setShowCreateRole((prev) => !prev);
        }}
      >
        {showCreateRole ? "收起创建" : "+ 创建角色"}
      </Button>
    ) : viewMode === "edit-user" ? (
      <Button
        size="sm"
        variant="quiet"
        onClick={() => {
          resetUserDraft();
          setViewMode("users-list");
        }}
      >
        返回用户列表
      </Button>
    ) : (
      <Button
        size="sm"
        variant="quiet"
        onClick={() => {
          resetRoleDraft();
          setViewMode("roles-list");
        }}
      >
        返回角色列表
      </Button>
    );

  const localNavigation = (
    <nav className="vw-settings-nav" aria-label="用户与权限">
      <div className="vw-settings-group-title">用户与权限 (2)</div>
      <button
        type="button"
        className={
          viewMode === "users-list"
            ? "vw-settings-nav-item vw-settings-nav-item--active"
            : "vw-settings-nav-item"
        }
        onClick={() => {
          setViewMode("users-list");
          setShowCreateRole(false);
        }}
      >
        用户列表 ({users.length})
      </button>
      <button
        type="button"
        className={
          viewMode === "roles-list"
            ? "vw-settings-nav-item vw-settings-nav-item--active"
            : "vw-settings-nav-item"
        }
        onClick={() => {
          setViewMode("roles-list");
          setShowCreateUser(false);
        }}
      >
        角色管理 ({roles.length})
      </button>
    </nav>
  );

  return (
    <VoxWardShell
      activeNavId="users"
      channelId={channelId}
      showChannelSelector={false}
      requireAuth
      pageTitle={pageTitle}
      pageDescription={pageDescription}
      pageActions={pageActions}
    >
      <div className="vw-stack-md">
        {notice ? <BannerNotice tone={notice.tone}>{notice.text}</BannerNotice> : null}

        {isListView ? (
          <SettingsLayout
            navigation={localNavigation}
            navigationLabel="用户与权限栏目"
            contentLabel="用户与权限工作区"
          >
            {viewMode === "users-list" ? (
              <div className="vw-stack-md">
                {showCreateUser ? (
                  <section className="vw-panel-card" aria-label="创建新用户">
                    <div className="vw-row-between">
                      <strong>创建新用户</strong>
                      <span className="vw-caption">支持直接多角色分配，无需邀请链接</span>
                    </div>
                    <div className="vw-input-action-row">
                      <div className="vw-field-col--compact">
                        <label className="vw-field-label" htmlFor="rbac-disp">
                          显示名称
                        </label>
                        <Input
                          id="rbac-disp"
                          value={userDisplayName}
                          onChange={(e) => setUserDisplayName(e.target.value)}
                          placeholder="如：aya"
                        />
                      </div>
                      <div className="vw-field-col--compact">
                        <label className="vw-field-label" htmlFor="rbac-login">
                          登录账号
                        </label>
                        <Input
                          id="rbac-login"
                          value={userLoginName}
                          onChange={(e) => setUserLoginName(e.target.value)}
                          placeholder="如：mod_aya"
                        />
                      </div>
                      <div className="vw-field-col--compact">
                        <label className="vw-field-label" htmlFor="rbac-acc-id">
                          账号 ID（可选）
                        </label>
                        <Input
                          id="rbac-acc-id"
                          value={userAccountId}
                          onChange={(e) => setUserAccountId(e.target.value)}
                          placeholder="留空自动生成"
                        />
                      </div>
                    </div>
                    <div className="vw-field-col">
                      <label className="vw-field-label" htmlFor="rbac-create-roles">
                        初始角色（多选）
                      </label>
                      <MultiSelect
                        id="rbac-create-roles"
                        presentation="checkboxes"
                        emptySelectionLabel="选择初始角色"
                        clearSelectionLabel="清空已选角色"
                        value={userRoleIds}
                        onChange={setUserRoleIds}
                        options={roles.map((r) => ({ value: r.id, label: r.name }))}
                      />
                    </div>
                    <div className="vw-row-wrap">
                      <Button
                        variant="primary"
                        loading={busy}
                        disabled={!userLoginName.trim() || !userDisplayName.trim()}
                        onClick={() => void handleSaveUser()}
                      >
                        确认创建
                      </Button>
                      <Button
                        variant="quiet"
                        onClick={() => {
                          resetUserDraft();
                          setShowCreateUser(false);
                        }}
                      >
                        取消
                      </Button>
                    </div>
                  </section>
                ) : null}

                <section className="vw-panel-card" aria-label="成员账号列表">
                  <div className="vw-input-action-row">
                    <div className="vw-field-col">
                      <label className="vw-field-label" htmlFor="rbac-user-search">
                        搜索用户名 / 登录账号
                      </label>
                      <SearchInput
                        id="rbac-user-search"
                        fill
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="搜索用户名或登录账号…"
                      />
                    </div>
                    <div className="vw-field-col--compact">
                      <label className="vw-field-label" htmlFor="rbac-user-role-filter">
                        按角色筛选
                      </label>
                      <Select
                        id="rbac-user-role-filter"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        options={[
                          { value: "ALL", label: `全部 (${roles.length})` },
                          ...roles.map((r) => ({ value: r.id, label: r.name })),
                        ]}
                      />
                    </div>
                  </div>

                  <TableShell
                    label="用户列表"
                    columns={[
                      { key: "loginName", label: "用户 / 登录账号" },
                      { key: "roles", label: "已分配角色 (多角色)" },
                      { key: "status", label: "状态" },
                      { key: "actions", label: "操作", align: "end" },
                    ]}
                    rows={filteredUsers.map((u) => {
                      const assignedNames = u.roleIds
                        .map((id) => roles.find((r) => r.id === id)?.name ?? id)
                        .join(" · ");
                      return {
                        loginName: (
                          <span>
                            <strong>
                              <UntrustedText text={u.displayName} />
                            </strong>{" "}
                            <span className="vw-mono">({u.loginName})</span>
                          </span>
                        ),
                        roles: assignedNames || <span className="vw-muted">未分配角色</span>,
                        status: (
                          <Badge tone={u.enabled ? "positive" : "neutral"}>
                            {u.enabled ? "启用" : "停用"}
                          </Badge>
                        ),
                        actions: (
                          <div className="vw-table-actions">
                            <Button size="sm" variant="secondary" onClick={() => openEditUser(u)}>
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={busy}
                              onClick={() => void handleDeleteUser(u.accountId)}
                            >
                              删除
                            </Button>
                          </div>
                        ),
                      };
                    })}
                    emptyState={<EmptyState title="暂无授权用户" description="点击右上角「+ 创建用户」添加工作台操作员。" />}
                  />
                </section>
              </div>
            ) : (
              <div className="vw-stack-md">
                {showCreateRole ? (
                  <section className="vw-panel-card" aria-label="创建新角色">
                    <strong>创建自定义角色</strong>
                    <div className="vw-input-action-row">
                      <div className="vw-field-col--compact">
                        <label className="vw-field-label" htmlFor="role-name-input">
                          角色名称
                        </label>
                        <Input
                          id="role-name-input"
                          value={roleName}
                          onChange={(e) => setRoleName(e.target.value)}
                          placeholder="例如：夜班实习房管"
                        />
                      </div>
                      <div className="vw-field-col">
                        <label className="vw-field-label" htmlFor="role-desc-input">
                          角色说明（可选）
                        </label>
                        <Input
                          id="role-desc-input"
                          value={roleDescription}
                          onChange={(e) => setRoleDescription(e.target.value)}
                          placeholder="描述角色适用场景，创建后进入权限矩阵细化配置"
                        />
                      </div>
                      <Button
                        variant="primary"
                        loading={busy}
                        disabled={!roleName.trim()}
                        onClick={() => void handleCreateRoleInline()}
                      >
                        确认创建角色
                      </Button>
                      <Button
                        variant="quiet"
                        onClick={() => {
                          resetRoleDraft();
                          setShowCreateRole(false);
                        }}
                      >
                        取消
                      </Button>
                    </div>
                  </section>
                ) : null}

                <section className="vw-panel-card" aria-label="角色列表">
                  <div className="vw-row-between">
                    <strong>角色列表</strong>
                    <span className="vw-caption">合并规则：Deny &gt; Grant &gt; Not Set</span>
                  </div>
                  <TableShell
                    label="角色定义列表"
                    columns={[
                      { key: "name", label: "角色名称" },
                      { key: "boundUsers", label: "绑定用户" },
                      { key: "summary", label: "权限摘要 (Grant / Deny)" },
                      { key: "actions", label: "操作", align: "end" },
                    ]}
                    rows={roles.map((r) => {
                      const vals = Object.values(r.permissions);
                      const grants = vals.filter((v) => v === "GRANT").length;
                      const denies = vals.filter((v) => v === "DENY").length;
                      const boundCount = users.filter((u) => u.roleIds.includes(r.id)).length;
                      return {
                        name: (
                          <span>
                            <strong>
                              <UntrustedText text={r.name} />
                            </strong>
                            {r.systemPreset ? " (内置)" : ""}
                          </span>
                        ),
                        boundUsers: `${boundCount} 人`,
                        summary: `Grant ${grants} · Deny ${denies}`,
                        actions: (
                          <div className="vw-table-actions">
                            <Button size="sm" variant="secondary" onClick={() => openEditRole(r)}>
                              编辑权限
                            </Button>
                            {!r.systemPreset ? (
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={busy}
                                onClick={() => setPendingDeleteRole(r)}
                              >
                                删除
                              </Button>
                            ) : null}
                          </div>
                        ),
                      };
                    })}
                  />
                </section>
              </div>
            )}
          </SettingsLayout>
        ) : viewMode === "edit-user" ? (
          <div className="vw-stack-lg">
            <section className="vw-panel-card" aria-label="基础资料与账号状态">
              <div className="vw-row-between">
                <strong>基础资料与账号状态</strong>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busy || editingAccountId === null}
                  onClick={() => editingAccountId && void handleDeleteUser(editingAccountId)}
                >
                  删除用户
                </Button>
              </div>
              <div className="vw-row-wrap">
                <div className="vw-field-col--compact">
                  <label className="vw-field-label" htmlFor="edit-user-disp">
                    显示名称
                  </label>
                  <Input
                    id="edit-user-disp"
                    value={userDisplayName}
                    onChange={(e) => setUserDisplayName(e.target.value)}
                  />
                </div>
                <div className="vw-field-col--compact">
                  <label className="vw-field-label" htmlFor="edit-user-login">
                    登录账号
                  </label>
                  <Input
                    id="edit-user-login"
                    value={userLoginName}
                    onChange={(e) => setUserLoginName(e.target.value)}
                  />
                </div>
              </div>
              <Switch
                label="账号启用状态"
                description="停用后该用户所有会话立即失效且无法登录。"
                checked={userEnabled}
                onChange={(e) => setUserEnabled(e.target.checked)}
              />
            </section>

            <section className="vw-panel-card" aria-label="所属角色分配与最终权限预览">
              <strong>所属角色分配与最终权限预览</strong>
              <div className="vw-field-col">
                <label className="vw-field-label" htmlFor="rbac-role-multi">
                  分配角色（多选叠加：显式拒绝优先于授予）
                </label>
                <MultiSelect
                  id="rbac-role-multi"
                  presentation="checkboxes"
                  emptySelectionLabel="未勾选角色"
                  clearSelectionLabel="清空已选角色"
                  value={userRoleIds}
                  onChange={setUserRoleIds}
                  options={roles.map((r) => ({ value: r.id, label: r.name }))}
                />
              </div>

              <div className="vw-stack-sm">
                <strong>实时生效权限合成结果（Deny &gt; Grant &gt; Not Set）</strong>
                <TableShell
                  label="生效权限预览"
                  columns={[
                    { key: "scope", label: "功能域" },
                    { key: "capability", label: "能力项" },
                    { key: "effect", label: "生效结果" },
                    { key: "decidedBy", label: "判定依据" },
                    { key: "sources", label: "命中角色" },
                  ]}
                  rows={livePreview.map((entry) => {
                    const info = CAPABILITY_LABELS[entry.capability];
                    return {
                      scope: info.scope,
                      capability: info.name,
                      effect: (
                        <Badge tone={entry.effect === "ALLOW" ? "positive" : "danger"}>
                          {entry.effect === "ALLOW" ? "允许" : "拒绝"}
                        </Badge>
                      ),
                      decidedBy: decidedByLabel(entry.decidedBy),
                      sources:
                        entry.sourceRoleIds.length > 0
                          ? entry.sourceRoleIds
                              .map((id) => roles.find((r) => r.id === id)?.name ?? id)
                              .join("、")
                          : "—",
                    };
                  })}
                />
              </div>

              <div className="vw-row-wrap">
                <Button
                  variant="primary"
                  loading={busy}
                  disabled={!userLoginName.trim() || !userDisplayName.trim()}
                  onClick={() => void handleSaveUser()}
                >
                  保存用户
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => {
                    resetUserDraft();
                    setViewMode("users-list");
                  }}
                >
                  返回用户列表
                </Button>
              </div>
            </section>
          </div>
        ) : (
          <div className="vw-stack-lg">
            <section className="vw-panel-card" aria-label="角色权限管理矩阵">
              <div className="vw-row-between">
                <strong>角色权限管理矩阵（Deny &gt; Grant &gt; Not Set）</strong>
                <Badge tone="neutral">Deny 显式拒绝覆盖其他角色的 Grant；全为 Not Set 默认无权</Badge>
              </div>
              <div className="vw-row-wrap">
                <div className="vw-field-col--compact">
                  <label className="vw-field-label" htmlFor="edit-role-name">
                    角色名称
                  </label>
                  <Input
                    id="edit-role-name"
                    value={roleName}
                    disabled={editingRolePreset}
                    onChange={(e) => setRoleName(e.target.value)}
                  />
                </div>
                <div className="vw-field-col">
                  <label className="vw-field-label" htmlFor="edit-role-desc">
                    职责说明
                  </label>
                  <Input
                    id="edit-role-desc"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                  />
                </div>
              </div>

              <TableShell
                label="三态权限矩阵"
                columns={[
                  { key: "scope", label: "功能域" },
                  { key: "capability", label: "权限键 / 说明" },
                  { key: "state", label: "授权决策（Not Set / Grant / Deny）" },
                ]}
                rows={RBAC_CAPABILITY_KEYS.map((cap) => {
                  const info = CAPABILITY_LABELS[cap];
                  const state = rolePermissions[cap] ?? "NOT_SET";
                  return {
                    scope: info.scope,
                    capability: (
                      <span>
                        <span className="vw-mono">{cap}</span> · {info.name}
                      </span>
                    ),
                    state: (
                      <div className="vw-field-col--compact">
                        <Select
                          aria-label={`${info.name} 权限配置`}
                          value={state}
                          onChange={(event) =>
                            setRolePermissions((prev) => ({
                              ...prev,
                              [cap]: event.target.value as RbacTriState,
                            }))
                          }
                          options={[
                            { value: "NOT_SET", label: "未设置 (Not Set)" },
                            { value: "GRANT", label: "允许 (Grant)" },
                            { value: "DENY", label: "显式拒绝 (Deny)" },
                          ]}
                        />
                      </div>
                    ),
                  };
                })}
              />

              <div className="vw-row-wrap">
                <Button
                  variant="primary"
                  loading={busy}
                  disabled={!roleName.trim()}
                  onClick={() => void handleSaveRolePermissions()}
                >
                  保存角色权限
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => {
                    resetRoleDraft();
                    setViewMode("roles-list");
                  }}
                >
                  返回角色列表
                </Button>
              </div>
            </section>
          </div>
        )}

        <ConfirmActionDialog
          open={pendingDeleteRole !== null}
          onOpenChange={(open) => {
            if (!open) setPendingDeleteRole(null);
          }}
          title="删除自定义角色确认"
          message={`确认删除角色「${pendingDeleteRole?.name ?? ""}」吗？该角色将同时从已绑定的用户列表中移除。`}
          confirmLabel="确认删除"
          cancelLabel="取消"
          tone="danger"
          onConfirm={() => void handleConfirmDeleteRole()}
          onCancel={() => setPendingDeleteRole(null)}
        />
      </div>
    </VoxWardShell>
  );
}
