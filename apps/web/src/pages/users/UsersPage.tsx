import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import {
  Badge,
  Button,
  ConfirmActionDialog,
  EmptyState,
  Input,
  MultiSelect,
  Select,
  Switch,
  TableShell,
} from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { SectionTabs } from "../../components/section-tabs";
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

const CAPABILITY_LABELS: Readonly<Record<RbacCapabilityKey, { readonly name: string; readonly scope: string }>> = {
  "queue.read": { name: "查看待审队列与旁路流", scope: "审核工作台" },
  "review.decide": { name: "人工审核裁决与评分重判", scope: "审核工作台" },
  "list.edit": { name: "增删词库与黑名单用户", scope: "规则与拦截" },
  "score.config": { name: "配置计分策略与适配器", scope: "设置与集成" },
  "output.manage": { name: "管理下游投屏适配器", scope: "集成管理" },
  "output.feed": { name: "只读订阅输出投屏流", scope: "投屏通道" },
  "members.manage": { name: "管理频道成员与角色矩阵", scope: "成员权限" },
  "tokens.manage": { name: "签发与吊销投屏凭据", scope: "集成管理" },
  "message.original": { name: "查看观众未脱敏发言原文", scope: "隐私分级" },
  "subject.evidence": { name: "查看观众取证档案与记录", scope: "隐私分级" },
  "data.handle": { name: "执行数据导出与匿名化删除", scope: "数据合规" },
  "logs.view": { name: "查阅技术、变更与集成日志", scope: "日志审计" },
};

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

  const [tab, setTab] = useState<string>("users");
  const [users, setUsers] = useState<readonly RbacUserView[]>([]);
  const [roles, setRoles] = useState<readonly RbacRoleView[]>([]);

  // User editor state
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [userAccountId, setUserAccountId] = useState("");
  const [userLoginName, setUserLoginName] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [userEnabled, setUserEnabled] = useState(true);
  const [userRoleIds, setUserRoleIds] = useState<string[]>([]);

  // Role editor state
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
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

  const liveAssignedRoles = useMemo(
    () => roles.filter((r) => userRoleIds.includes(r.id)),
    [roles, userRoleIds],
  );

  const livePreview = useMemo(
    () => previewEffectivePermissions(liveAssignedRoles),
    [liveAssignedRoles],
  );

  const startNewUser = () => {
    setEditingAccountId(null);
    setUserAccountId("");
    setUserLoginName("");
    setUserDisplayName("");
    setUserEnabled(true);
    setUserRoleIds([]);
  };

  const selectUserForEdit = (user: RbacUserView) => {
    setEditingAccountId(user.accountId);
    setUserAccountId(user.accountId);
    setUserLoginName(user.loginName);
    setUserDisplayName(user.displayName);
    setUserEnabled(user.enabled);
    setUserRoleIds([...user.roleIds]);
  };

  const handleSaveUser = async () => {
    const accountId = (editingAccountId ?? userAccountId).trim();
    if (!accountId || !userLoginName.trim() || !userDisplayName.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      await client.upsertUser(channelId, {
        accountId,
        loginName: userLoginName.trim(),
        displayName: userDisplayName.trim(),
        enabled: userEnabled,
        roleIds: userRoleIds,
      });
      await loadData();
      startNewUser();
      setNotice({ tone: "positive", text: "成员账号与多角色授权关系已保存。" });
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof UsersRbacApiError ? `保存成员失败 (${error.code})` : "保存成员失败。",
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
      if (editingAccountId === accountId) startNewUser();
      await loadData();
      setNotice({ tone: "positive", text: "成员授权已移除。" });
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof UsersRbacApiError ? `删除成员失败 (${error.code})` : "删除成员失败。",
      });
    } finally {
      setBusy(false);
    }
  };

  const startNewRole = () => {
    setEditingRoleId(null);
    setRoleName("");
    setRoleDescription("");
    setRolePermissions({});
  };

  const selectRoleForEdit = (role: RbacRoleView) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description);
    setRolePermissions({ ...role.permissions });
  };

  const handleSaveRole = async () => {
    if (!roleName.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      if (editingRoleId !== null) {
        await client.updateRole(channelId, editingRoleId, {
          name: roleName.trim(),
          description: roleDescription.trim(),
          permissions: rolePermissions,
        });
      } else {
        await client.createRole(channelId, {
          name: roleName.trim(),
          description: roleDescription.trim(),
          permissions: rolePermissions,
        });
      }
      await loadData();
      startNewRole();
      setNotice({ tone: "positive", text: "角色权限矩阵已更新。" });
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
      if (editingRoleId === pendingDeleteRole.id) startNewRole();
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

  return (
    <VoxWardShell
      activeNavId="users"
      channelId={channelId}
      showChannelSelector
      requireAuth
      pageTitle="成员权限"
      pageDescription="管理多角色成员分配并按三态矩阵（显式拒绝 > 显式授予 > 未设置）实时预览最终生效权限。"
    >
      <div className="vw-stack-md">
        {notice ? <BannerNotice tone={notice.tone}>{notice.text}</BannerNotice> : null}

        <SectionTabs
          label="用户与角色权限切换"
          selectedId={tab}
          onSelect={setTab}
          items={[
            { id: "users", label: `用户管理 (${users.length})` },
            { id: "roles", label: `角色与权限 (${roles.length})` },
          ]}
        >
          {tab === "users" ? (
            <div className="vw-stack-md">
              <section className="vw-panel-card" aria-label="成员账号列表">
                <div className="vw-row-between">
                  <strong>频道授权用户 ({users.length})</strong>
                  <Button size="sm" variant="secondary" onClick={startNewUser}>
                    新增成员授权
                  </Button>
                </div>
                <TableShell
                  label="成员列表"
                  columns={[
                    { key: "loginName", label: "登录名" },
                    { key: "displayName", label: "显示名称" },
                    { key: "roles", label: "绑定角色" },
                    { key: "status", label: "状态" },
                    { key: "allowCount", label: "允许项数" },
                    { key: "actions", label: "操作", align: "end" },
                  ]}
                  rows={users.map((u) => {
                    const allowedCount = u.effectivePermissions.filter((p) => p.effect === "ALLOW").length;
                    const assignedNames = u.roleIds
                      .map((id) => roles.find((r) => r.id === id)?.name ?? id)
                      .join("、");
                    return {
                      loginName: <span className="vw-mono">{u.loginName}</span>,
                      displayName: <UntrustedText text={u.displayName} />,
                      roles: assignedNames || <span className="vw-muted">无绑定角色</span>,
                      status: (
                        <Badge tone={u.enabled ? "positive" : "neutral"}>
                          {u.enabled ? "已启用" : "已禁用"}
                        </Badge>
                      ),
                      allowCount: `${allowedCount} / ${RBAC_CAPABILITY_KEYS.length}`,
                      actions: (
                        <div className="vw-table-actions">
                          <Button size="sm" variant="quiet" onClick={() => selectUserForEdit(u)}>
                            编辑角色
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busy}
                            onClick={() => void handleDeleteUser(u.accountId)}
                          >
                            移除
                          </Button>
                        </div>
                      ),
                    };
                  })}
                  emptyState={<EmptyState title="暂无授权用户" />}
                />
              </section>

              <section className="vw-panel-card" aria-label="用户编辑与实时生效权限预览">
                <strong>
                  {editingAccountId !== null ? `编辑成员权限：${editingAccountId}` : "新增成员并配置多角色"}
                </strong>
                <div className="vw-row-wrap">
                  <div className="vw-field-col--compact">
                    <label className="vw-field-label" htmlFor="rbac-acc-id">
                      账号唯一标识
                    </label>
                    <Input
                      id="rbac-acc-id"
                      value={userAccountId}
                      disabled={editingAccountId !== null}
                      onChange={(e) => setUserAccountId(e.target.value)}
                      placeholder="例如：acc_mod_02"
                    />
                  </div>
                  <div className="vw-field-col--compact">
                    <label className="vw-field-label" htmlFor="rbac-login">
                      登录名
                    </label>
                    <Input
                      id="rbac-login"
                      value={userLoginName}
                      onChange={(e) => setUserLoginName(e.target.value)}
                      placeholder="例如：lin_mod"
                    />
                  </div>
                  <div className="vw-field-col--compact">
                    <label className="vw-field-label" htmlFor="rbac-disp">
                      显示名称
                    </label>
                    <Input
                      id="rbac-disp"
                      value={userDisplayName}
                      onChange={(e) => setUserDisplayName(e.target.value)}
                      placeholder="值班审核员"
                    />
                  </div>
                </div>

                <Switch
                  label="启用该成员访问"
                  checked={userEnabled}
                  onChange={(e) => setUserEnabled(e.target.checked)}
                />

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
                  <strong>实时生效权限预览（显式拒绝 &gt; 显式授予 &gt; 未设置默认拒绝）</strong>
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
                    disabled={!userAccountId.trim() || !userLoginName.trim() || !userDisplayName.trim()}
                    onClick={() => void handleSaveUser()}
                  >
                    保存成员与角色
                  </Button>
                  {editingAccountId !== null ? (
                    <Button variant="quiet" onClick={startNewUser}>
                      重置为新建模式
                    </Button>
                  ) : null}
                </div>
              </section>
            </div>
          ) : (
            <div className="vw-stack-md">
              <section className="vw-panel-card" aria-label="角色列表">
                <div className="vw-row-between">
                  <strong>频道角色定义 ({roles.length})</strong>
                  <Button size="sm" variant="secondary" onClick={startNewRole}>
                    新建自定义角色
                  </Button>
                </div>
                <TableShell
                  label="角色列表"
                  columns={[
                    { key: "name", label: "角色名称" },
                    { key: "description", label: "说明" },
                    { key: "kind", label: "类型" },
                    { key: "grants", label: "授予数" },
                    { key: "denies", label: "显式拒绝数" },
                    { key: "actions", label: "操作", align: "end" },
                  ]}
                  rows={roles.map((r) => {
                    const vals = Object.values(r.permissions);
                    const grants = vals.filter((v) => v === "GRANT").length;
                    const denies = vals.filter((v) => v === "DENY").length;
                    return {
                      name: r.name,
                      description: r.description || <span className="vw-muted">无说明</span>,
                      kind: (
                        <Badge tone={r.systemPreset ? "accent" : "neutral"}>
                          {r.systemPreset ? "系统预设" : "自定义"}
                        </Badge>
                      ),
                      grants,
                      denies,
                      actions: (
                        <div className="vw-table-actions">
                          <Button size="sm" variant="quiet" onClick={() => selectRoleForEdit(r)}>
                            编辑权限矩阵
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

              <section className="vw-panel-card" aria-label="角色三态权限矩阵编辑">
                <strong>{editingRoleId !== null ? `编辑角色：${roleName}` : "创建自定义角色"}</strong>
                <div className="vw-row-wrap">
                  <div className="vw-field-col--compact">
                    <label className="vw-field-label" htmlFor="role-name-input">
                      角色名称
                    </label>
                    <Input
                      id="role-name-input"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      placeholder="例如：夜班值守审核"
                    />
                  </div>
                  <div className="vw-field-col">
                    <label className="vw-field-label" htmlFor="role-desc-input">
                      职责说明
                    </label>
                    <Input
                      id="role-desc-input"
                      value={roleDescription}
                      onChange={(e) => setRoleDescription(e.target.value)}
                      placeholder="允许审核与拉黑，显式拒绝修改系统集成配置"
                    />
                  </div>
                </div>

                <TableShell
                  label="三态权限矩阵"
                  columns={[
                    { key: "scope", label: "功能域" },
                    { key: "capability", label: "能力说明" },
                    { key: "state", label: "权限策略（未设置 / 允许 / 拒绝）" },
                  ]}
                  rows={RBAC_CAPABILITY_KEYS.map((cap) => {
                    const info = CAPABILITY_LABELS[cap];
                    const state = rolePermissions[cap] ?? "NOT_SET";
                    return {
                      scope: info.scope,
                      capability: info.name,
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
                              { value: "NOT_SET", label: "未设置（默认拒绝 / 由其他角色决定）" },
                              { value: "GRANT", label: "允许（Grant）" },
                              { value: "DENY", label: "显式拒绝（Deny · 最高优先级）" },
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
                    onClick={() => void handleSaveRole()}
                  >
                    {editingRoleId !== null ? "保存角色修改" : "创建角色"}
                  </Button>
                  {editingRoleId !== null ? (
                    <Button variant="quiet" onClick={startNewRole}>
                      取消编辑
                    </Button>
                  ) : null}
                </div>
              </section>
            </div>
          )}
        </SectionTabs>

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
