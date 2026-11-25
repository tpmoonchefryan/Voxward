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
import { formatBuiltInRbacRole, pickLocale, USERS_COPY, type UsersCopy } from "../../i18n";
import { VoxWardShell, useVoxWardShell } from "../../shell";
import {
  createUsersRbacApi,
  previewEffectivePermissions,
  RBAC_CAPABILITY_KEYS,
  UsersRbacApiError,
  type RbacRoleView,
  type RbacTriState,
  type RbacUserView,
  type UsersRbacApi,
} from "./api";

type UsersViewMode = "users-list" | "edit-user" | "roles-list" | "edit-role";

interface UsersHeaderMeta {
  readonly viewMode: UsersViewMode;
  readonly showCreateUser: boolean;
  readonly showCreateRole: boolean;
  readonly userDisplayName: string;
  readonly userLoginName: string;
  readonly roleName: string;
}

type HeaderActionKind = "toggle-create-user" | "toggle-create-role" | "back-users" | "back-roles";

type HeaderActionRequest = {
  readonly kind: HeaderActionKind;
  readonly seq: number;
} | null;

type NoticeState = {
  readonly tone: "positive" | "danger";
  readonly resolve: (copy: UsersCopy) => string;
} | null;

function decidedByLabel(decidedBy: string, copy: UsersCopy): string {
  switch (decidedBy) {
    case "DENY_RULE":
      return copy.decidedBy.DENY_RULE;
    case "GRANT_RULE":
      return copy.decidedBy.GRANT_RULE;
    default:
      return copy.decidedBy.DEFAULT_DENY;
  }
}

function UsersSurface({
  channelIdParam,
  api,
  headerAction,
  onHeaderMetaChange,
}: {
  readonly channelIdParam?: string;
  readonly api?: UsersRbacApi;
  readonly headerAction: HeaderActionRequest;
  readonly onHeaderMetaChange: (meta: UsersHeaderMeta) => void;
}) {
  const { activeChannelId, locale } = useVoxWardShell();
  const channelId = channelIdParam ?? activeChannelId;
  const copy = pickLocale(USERS_COPY, locale);
  const client = useMemo(() => api ?? createUsersRbacApi(), [api]);

  const [viewMode, setViewMode] = useState<UsersViewMode>("users-list");
  const [users, setUsers] = useState<readonly RbacUserView[]>([]);
  const [roles, setRoles] = useState<readonly RbacRoleView[]>([]);

  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Create / Edit User state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [userAccountId, setUserAccountId] = useState("");
  const [userLoginName, setUserLoginName] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [userEnabled, setUserEnabled] = useState(true);
  const [userRoleIds, setUserRoleIds] = useState<string[]>([]);

  // Create / Edit Role state
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRolePreset, setEditingRolePreset] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [rolePermissions, setRolePermissions] = useState<Record<string, RbacTriState>>({});
  const [pendingDeleteRole, setPendingDeleteRole] = useState<RbacRoleView | null>(null);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  useEffect(() => {
    onHeaderMetaChange({
      viewMode,
      showCreateUser,
      showCreateRole,
      userDisplayName,
      userLoginName,
      roleName,
    });
  }, [
    viewMode,
    showCreateUser,
    showCreateRole,
    userDisplayName,
    userLoginName,
    roleName,
    onHeaderMetaChange,
  ]);

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
        resolve: (c) =>
          error instanceof UsersRbacApiError
            ? c.messages.loadFailedCode(error.code)
            : c.messages.loadFailed,
      });
    }
  }, [channelId, client]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetUserDraft = useCallback(() => {
    setEditingAccountId(null);
    setUserAccountId("");
    setUserLoginName("");
    setUserDisplayName("");
    setUserEnabled(true);
    setUserRoleIds([]);
  }, []);

  const resetRoleDraft = useCallback(() => {
    setEditingRoleId(null);
    setEditingRolePreset(false);
    setRoleName("");
    setRoleDescription("");
    setRolePermissions({});
  }, []);

  useEffect(() => {
    if (headerAction === null) return;
    switch (headerAction.kind) {
      case "toggle-create-user":
        resetUserDraft();
        setShowCreateUser((prev) => !prev);
        break;
      case "toggle-create-role":
        resetRoleDraft();
        setShowCreateRole((prev) => !prev);
        break;
      case "back-users":
        resetUserDraft();
        setViewMode("users-list");
        break;
      case "back-roles":
        resetRoleDraft();
        setViewMode("roles-list");
        break;
    }
  }, [headerAction, resetUserDraft, resetRoleDraft]);

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
      setNotice({ tone: "positive", resolve: (c) => c.messages.userSaved });
    } catch (error) {
      setNotice({
        tone: "danger",
        resolve: (c) =>
          error instanceof UsersRbacApiError
            ? c.messages.userSaveFailedCode(error.code)
            : c.messages.userSaveFailed,
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
      setNotice({ tone: "positive", resolve: (c) => c.messages.userDeleted });
    } catch (error) {
      setNotice({
        tone: "danger",
        resolve: (c) =>
          error instanceof UsersRbacApiError
            ? c.messages.userDeleteFailedCode(error.code)
            : c.messages.userDeleteFailed,
      });
    } finally {
      setBusy(false);
    }
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
      setNotice({ tone: "positive", resolve: (c) => c.messages.roleCreated });
    } catch (error) {
      setNotice({
        tone: "danger",
        resolve: (c) =>
          error instanceof UsersRbacApiError
            ? c.messages.roleCreateFailedCode(error.code)
            : c.messages.roleCreateFailed,
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
      setNotice({ tone: "positive", resolve: (c) => c.messages.roleSaved });
    } catch (error) {
      setNotice({
        tone: "danger",
        resolve: (c) =>
          error instanceof UsersRbacApiError
            ? c.messages.roleSaveFailedCode(error.code)
            : c.messages.roleSaveFailed,
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
      setNotice({ tone: "positive", resolve: (c) => c.messages.roleDeleted });
    } catch (error) {
      setNotice({
        tone: "danger",
        resolve: (c) =>
          error instanceof UsersRbacApiError
            ? c.messages.roleDeleteFailedCode(error.code)
            : c.messages.roleDeleteFailed,
      });
    } finally {
      setBusy(false);
      setPendingDeleteRole(null);
    }
  };

  const isListView = viewMode === "users-list" || viewMode === "roles-list";

  const localNavigation = (
    <nav className="vw-settings-nav" aria-label={copy.localNavAria}>
      <div className="vw-settings-group-title">{copy.localNavTitle}</div>
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
        {copy.navUsersItem(users.length)}
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
        {copy.navRolesItem(roles.length)}
      </button>
    </nav>
  );

  return (
    <div className="vw-stack-md">
      {notice ? <BannerNotice tone={notice.tone}>{notice.resolve(copy)}</BannerNotice> : null}

      {isListView ? (
        <SettingsLayout
          navigation={localNavigation}
          navigationLabel={copy.settingsNavLabel}
          contentLabel={copy.settingsContentLabel}
        >
          {viewMode === "users-list" ? (
            <div className="vw-stack-md">
              {showCreateUser ? (
                <section className="vw-panel-card" aria-label={copy.createUserAria}>
                  <div className="vw-row-between">
                    <strong>{copy.createUserHeading}</strong>
                    <span className="vw-caption">{copy.createUserHint}</span>
                  </div>
                  <div className="vw-input-action-row">
                    <div className="vw-field-col--compact">
                      <label className="vw-field-label" htmlFor="rbac-disp">
                        {copy.displayNameLabel}
                      </label>
                      <Input
                        id="rbac-disp"
                        value={userDisplayName}
                        onChange={(e) => setUserDisplayName(e.target.value)}
                        placeholder={copy.displayNamePlaceholder}
                      />
                    </div>
                    <div className="vw-field-col--compact">
                      <label className="vw-field-label" htmlFor="rbac-login">
                        {copy.loginNameLabel}
                      </label>
                      <Input
                        id="rbac-login"
                        value={userLoginName}
                        onChange={(e) => setUserLoginName(e.target.value)}
                        placeholder={copy.loginNamePlaceholder}
                      />
                    </div>
                    <div className="vw-field-col--compact">
                      <label className="vw-field-label" htmlFor="rbac-acc-id">
                        {copy.accountIdLabel}
                      </label>
                      <Input
                        id="rbac-acc-id"
                        value={userAccountId}
                        onChange={(e) => setUserAccountId(e.target.value)}
                        placeholder={copy.accountIdPlaceholder}
                      />
                    </div>
                  </div>
                  <div className="vw-field-col">
                    <label className="vw-field-label" htmlFor="rbac-create-roles">
                      {copy.initialRolesLabel}
                    </label>
                    <MultiSelect
                      id="rbac-create-roles"
                      presentation="checkboxes"
                      emptySelectionLabel={copy.selectRolesEmpty}
                      clearSelectionLabel={copy.clearRolesLabel}
                      value={userRoleIds}
                      onChange={setUserRoleIds}
                      options={roles.map((r) => ({ value: r.id, label: formatBuiltInRbacRole(r, locale).name }))}
                    />
                  </div>
                  <div className="vw-row-wrap">
                    <Button
                      variant="primary"
                      loading={busy}
                      disabled={!userLoginName.trim() || !userDisplayName.trim()}
                      onClick={() => void handleSaveUser()}
                    >
                      {copy.confirmCreateUserBtn}
                    </Button>
                    <Button
                      variant="quiet"
                      onClick={() => {
                        resetUserDraft();
                        setShowCreateUser(false);
                      }}
                    >
                      {copy.cancelBtn}
                    </Button>
                  </div>
                </section>
              ) : null}

              <section className="vw-panel-card" aria-label={copy.usersAria}>
                <div className="vw-input-action-row">
                  <div className="vw-field-col">
                    <label className="vw-field-label" htmlFor="rbac-user-search">
                      {copy.searchUserLabel}
                    </label>
                    <SearchInput
                      id="rbac-user-search"
                      fill
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder={copy.searchUserPlaceholder}
                    />
                  </div>
                  <div className="vw-field-col--compact">
                    <label className="vw-field-label" htmlFor="rbac-user-role-filter">
                      {copy.filterRoleLabel}
                    </label>
                    <Select
                      id="rbac-user-role-filter"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      options={[
                        { value: "ALL", label: copy.allRolesOption(roles.length) },
                        ...roles.map((r) => ({ value: r.id, label: formatBuiltInRbacRole(r, locale).name })),
                      ]}
                    />
                  </div>
                </div>

                <TableShell
                  label={copy.usersTableLabel}
                  columns={[
                    { key: "loginName", label: copy.colUserLogin },
                    { key: "roles", label: copy.colAssignedRoles },
                    { key: "status", label: copy.colUserStatus },
                    { key: "actions", label: copy.colActions, align: "end" },
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
                      roles: assignedNames || <span className="vw-muted">{copy.noRolesAssigned}</span>,
                      status: (
                        <Badge tone={u.enabled ? "positive" : "neutral"}>
                          {u.enabled ? copy.userEnabledBadge : copy.userDisabledBadge}
                        </Badge>
                      ),
                      actions: (
                        <div className="vw-table-actions">
                          <Button size="sm" variant="secondary" onClick={() => openEditUser(u)}>
                            {copy.editBtn}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busy}
                            onClick={() => void handleDeleteUser(u.accountId)}
                          >
                            {copy.deleteBtn}
                          </Button>
                        </div>
                      ),
                    };
                  })}
                  emptyState={
                    <EmptyState
                      title={copy.emptyUsersTitle}
                      description={copy.emptyUsersDesc}
                    />
                  }
                />
              </section>
            </div>
          ) : (
            <div className="vw-stack-md">
              {showCreateRole ? (
                <section className="vw-panel-card" aria-label={copy.createRoleAria}>
                  <strong>{copy.createRoleHeading}</strong>
                  <div className="vw-input-action-row">
                    <div className="vw-field-col--compact">
                      <label className="vw-field-label" htmlFor="role-name-input">
                        {copy.roleNameLabel}
                      </label>
                      <Input
                        id="role-name-input"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        placeholder={copy.roleNamePlaceholder}
                      />
                    </div>
                    <div className="vw-field-col">
                      <label className="vw-field-label" htmlFor="role-desc-input">
                        {copy.roleDescLabel}
                      </label>
                      <Input
                        id="role-desc-input"
                        value={roleDescription}
                        onChange={(e) => setRoleDescription(e.target.value)}
                        placeholder={copy.roleDescPlaceholder}
                      />
                    </div>
                    <Button
                      variant="primary"
                      loading={busy}
                      disabled={!roleName.trim()}
                      onClick={() => void handleCreateRoleInline()}
                    >
                      {copy.confirmCreateRoleBtn}
                    </Button>
                    <Button
                      variant="quiet"
                      onClick={() => {
                        resetRoleDraft();
                        setShowCreateRole(false);
                      }}
                    >
                      {copy.cancelBtn}
                    </Button>
                  </div>
                </section>
              ) : null}

              <section className="vw-panel-card" aria-label={copy.rolesAria}>
                <div className="vw-row-between">
                  <strong>{copy.rolesHeading}</strong>
                  <span className="vw-caption">{copy.rolesMergeHint}</span>
                </div>
                <TableShell
                  label={copy.rolesTableLabel}
                  columns={[
                    { key: "name", label: copy.colRoleName },
                    { key: "boundUsers", label: copy.colBoundUsers },
                    { key: "summary", label: copy.colRoleSummary },
                    { key: "actions", label: copy.colActions, align: "end" },
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
                            <UntrustedText text={formatBuiltInRbacRole(r, locale).name} />
                          </strong>
                          {r.systemPreset ? copy.systemPresetSuffix : ""}
                        </span>
                      ),
                      boundUsers: copy.boundUsersCount(boundCount),
                      summary: copy.summaryCounts(grants, denies),
                      actions: (
                        <div className="vw-table-actions">
                          <Button size="sm" variant="secondary" onClick={() => openEditRole(r)}>
                            {copy.editPermissionsBtn}
                          </Button>
                          {!r.systemPreset ? (
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={busy}
                              onClick={() => setPendingDeleteRole(r)}
                            >
                              {copy.deleteBtn}
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
          <section className="vw-panel-card" aria-label={copy.editUserBasicAria}>
            <div className="vw-row-between">
              <strong>{copy.editUserBasicHeading}</strong>
              <Button
                size="sm"
                variant="danger"
                disabled={busy || editingAccountId === null}
                onClick={() => editingAccountId && void handleDeleteUser(editingAccountId)}
              >
                {copy.deleteUserBtn}
              </Button>
            </div>
            <div className="vw-row-wrap">
              <div className="vw-field-col--compact">
                <label className="vw-field-label" htmlFor="edit-user-disp">
                  {copy.displayNameLabel}
                </label>
                <Input
                  id="edit-user-disp"
                  value={userDisplayName}
                  onChange={(e) => setUserDisplayName(e.target.value)}
                />
              </div>
              <div className="vw-field-col--compact">
                <label className="vw-field-label" htmlFor="edit-user-login">
                  {copy.loginNameLabel}
                </label>
                <Input
                  id="edit-user-login"
                  value={userLoginName}
                  onChange={(e) => setUserLoginName(e.target.value)}
                />
              </div>
            </div>
            <Switch
              label={copy.accountEnabledLabel}
              description={copy.accountEnabledDesc}
              checked={userEnabled}
              onChange={(e) => setUserEnabled(e.target.checked)}
            />
          </section>

          <section className="vw-panel-card" aria-label={copy.roleAssignAria}>
            <strong>{copy.roleAssignHeading}</strong>
            <div className="vw-field-col">
              <label className="vw-field-label" htmlFor="rbac-role-multi">
                {copy.roleMultiLabel}
              </label>
              <MultiSelect
                id="rbac-role-multi"
                presentation="checkboxes"
                emptySelectionLabel={copy.emptyRoleMulti}
                clearSelectionLabel={copy.clearRolesLabel}
                value={userRoleIds}
                onChange={setUserRoleIds}
                options={roles.map((r) => ({ value: r.id, label: formatBuiltInRbacRole(r, locale).name }))}
              />
            </div>

            <div className="vw-stack-sm">
              <strong>{copy.livePreviewHeading}</strong>
              <TableShell
                label={copy.previewTableLabel}
                columns={[
                  { key: "scope", label: copy.colScope },
                  { key: "capability", label: copy.colCap },
                  { key: "effect", label: copy.colEffect },
                  { key: "decidedBy", label: copy.colDecidedBy },
                  { key: "sources", label: copy.colSources },
                ]}
                rows={livePreview.map((entry) => {
                  const info = copy.capabilities[entry.capability];
                  return {
                    scope: info.scope,
                    capability: info.name,
                    effect: (
                      <Badge tone={entry.effect === "ALLOW" ? "positive" : "danger"}>
                        {entry.effect === "ALLOW" ? copy.effectAllow : copy.effectDeny}
                      </Badge>
                    ),
                    decidedBy: decidedByLabel(entry.decidedBy, copy),
                    sources:
                      entry.sourceRoleIds.length > 0
                        ? entry.sourceRoleIds
                            .map((id) => roles.find((r) => r.id === id)?.name ?? id)
                            .join(", ")
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
                {copy.saveUserBtn}
              </Button>
              <Button
                variant="quiet"
                onClick={() => {
                  resetUserDraft();
                  setViewMode("users-list");
                }}
              >
                {copy.backUsersBtn}
              </Button>
            </div>
          </section>
        </div>
      ) : (
        <div className="vw-stack-lg">
          <section className="vw-panel-card" aria-label={copy.roleMatrixAria}>
            <div className="vw-row-between">
              <strong>{copy.roleMatrixHeading}</strong>
              <Badge tone="neutral">{copy.roleMatrixBadge}</Badge>
            </div>
            <div className="vw-row-wrap">
              <div className="vw-field-col--compact">
                <label className="vw-field-label" htmlFor="edit-role-name">
                  {copy.roleNameLabel}
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
                  {copy.roleMatrixDescLabel}
                </label>
                <Input
                  id="edit-role-desc"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                />
              </div>
            </div>

            <TableShell
              label={copy.matrixTableLabel}
              columns={[
                { key: "scope", label: copy.colScope },
                { key: "capability", label: copy.colCapAndDesc },
                { key: "state", label: copy.colTriDecision },
              ]}
              rows={RBAC_CAPABILITY_KEYS.map((cap) => {
                const info = copy.capabilities[cap];
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
                        aria-label={`${info.name}${copy.triAriaSuffix}`}
                        value={state}
                        onChange={(event) =>
                          setRolePermissions((prev) => ({
                            ...prev,
                            [cap]: event.target.value as RbacTriState,
                          }))
                        }
                        options={[
                          { value: "NOT_SET", label: copy.triNotSet },
                          { value: "GRANT", label: copy.triGrant },
                          { value: "DENY", label: copy.triDeny },
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
                {copy.saveRoleBtn}
              </Button>
              <Button
                variant="quiet"
                onClick={() => {
                  resetRoleDraft();
                  setViewMode("roles-list");
                }}
              >
                {copy.backRolesBtn}
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
        title={copy.deleteDialogTitle}
        message={copy.deleteDialogMessage(pendingDeleteRole?.name ?? "")}
        confirmLabel={copy.confirmDeleteRoleBtn}
        cancelLabel={copy.cancelBtn}
        tone="danger"
        onConfirm={() => void handleConfirmDeleteRole()}
        onCancel={() => setPendingDeleteRole(null)}
      />
    </div>
  );
}

export function UsersPage({ api }: { readonly api?: UsersRbacApi }) {
  const params = useParams();
  const [headerMeta, setHeaderMeta] = useState<UsersHeaderMeta>({
    viewMode: "users-list",
    showCreateUser: false,
    showCreateRole: false,
    userDisplayName: "",
    userLoginName: "",
    roleName: "",
  });
  const [headerAction, setHeaderAction] = useState<HeaderActionRequest>(null);

  const dispatchHeaderAction = (kind: HeaderActionKind) => {
    setHeaderAction((prev) => ({ kind, seq: (prev?.seq ?? 0) + 1 }));
  };

  return (
    <VoxWardShell
      activeNavId="users"
      channelId={params.channelId}
      showChannelSelector={false}
      requireAuth
      pageTitle={(locale) => {
        const copy = pickLocale(USERS_COPY, locale);
        if (headerMeta.viewMode === "edit-user") {
          return copy.pageTitleEditUser(headerMeta.userDisplayName, headerMeta.userLoginName);
        }
        if (headerMeta.viewMode === "edit-role") {
          return copy.pageTitleEditRole(headerMeta.roleName);
        }
        return copy.pageTitleList;
      }}
      pageDescription={(locale) => {
        const copy = pickLocale(USERS_COPY, locale);
        if (headerMeta.viewMode === "edit-user") return copy.pageDescEditUser;
        if (headerMeta.viewMode === "edit-role") return copy.pageDescEditRole;
        return copy.pageDescList;
      }}
      pageActions={(locale) => {
        const copy = pickLocale(USERS_COPY, locale);
        if (headerMeta.viewMode === "users-list") {
          return (
            <Button
              size="sm"
              variant={headerMeta.showCreateUser ? "secondary" : "primary"}
              onClick={() => dispatchHeaderAction("toggle-create-user")}
            >
              {headerMeta.showCreateUser ? copy.collapseCreateBtn : copy.addUserBtn}
            </Button>
          );
        }
        if (headerMeta.viewMode === "roles-list") {
          return (
            <Button
              size="sm"
              variant={headerMeta.showCreateRole ? "secondary" : "primary"}
              onClick={() => dispatchHeaderAction("toggle-create-role")}
            >
              {headerMeta.showCreateRole ? copy.collapseCreateBtn : copy.addRoleBtn}
            </Button>
          );
        }
        if (headerMeta.viewMode === "edit-user") {
          return (
            <Button
              size="sm"
              variant="quiet"
              onClick={() => dispatchHeaderAction("back-users")}
            >
              {copy.backUsersBtn}
            </Button>
          );
        }
        return (
          <Button
            size="sm"
            variant="quiet"
            onClick={() => dispatchHeaderAction("back-roles")}
          >
            {copy.backRolesBtn}
          </Button>
        );
      }}
    >
      <UsersSurface
        channelIdParam={params.channelId}
        api={api}
        headerAction={headerAction}
        onHeaderMetaChange={setHeaderMeta}
      />
    </VoxWardShell>
  );
}
