import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import {
  Badge,
  Button,
  ClipboardCopyButton,
  ConfirmActionDialog,
  EmptyState,
  Input,
  KeyValueList,
  Menu,
  SearchInput,
  Select,
  Switch,
  TableShell,
} from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { SectionTabs } from "../../components/section-tabs";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import {
  formatAdapterActionLabel,
  formatAdapterCatalogDriver,
  formatAdapterStatus,
  INTEGRATIONS_COPY,
  pickLocale,
  type AdapterStatusCode,
  type IntegrationsCopy,
} from "../../i18n";
import { VoxWardShell, useVoxWardShell } from "../../shell";
import type { OutputsSummaryView } from "../admin/api";
import {
  createIntegrationsApi,
  IntegrationsApiError,
  type AdapterCatalogEntry,
  type AdapterCategory,
  type AdapterDriverId,
  type AdapterModelPoolItem,
  type ChannelAdapterView,
  type IntegrationsApi,
} from "./api";

type ConfigValues = Record<string, string | number | boolean | null>;

type NoticeState = {
  readonly tone: "positive" | "danger";
  readonly resolve: (copy: IntegrationsCopy) => string;
} | null;

type AddRequest = {
  readonly category: AdapterCategory;
  readonly seq: number;
} | null;

function driverDefaults(driverId: AdapterDriverId, channelId: string): ConfigValues {
  switch (driverId) {
    case "youtube-live-v3":
      return {
        channelUrl: "",
        clientId: "",
        clientSecret: "",
        refreshToken: "",
      };
    case "kiro-cli":
      return {
        cliPath: "kiro-cli",
        workDir: "/tmp/voxward-kiro",
        kiroApiKey: "",
      };
    case "openai-compat":
    case "anthropic-compat":
      return {
        baseEndpoint: "",
        apiKey: "",
        apiVersion: driverId === "anthropic-compat" ? "2023-06-01" : "v1",
      };
    case "obs-overlay-source":
      return {
        roomId: channelId,
        showOriginalText: true,
        showTranslation: true,
      };
    case "native-readonly-protocol":
      return {
        protocolFlavor: "blivechat",
        loopbackEndpoint: "ws://127.0.0.1:12450",
      };
  }
}

function IntegrationsSurface({
  channelIdParam,
  api,
  pendingAddRequest,
}: {
  readonly channelIdParam?: string;
  readonly api?: IntegrationsApi;
  readonly pendingAddRequest: AddRequest;
}) {
  const { activeChannelId, locale } = useVoxWardShell();
  const channelId = channelIdParam ?? activeChannelId;
  const copy = pickLocale(INTEGRATIONS_COPY, locale);
  const client = useMemo(() => api ?? createIntegrationsApi(), [api]);

  const [catalog, setCatalog] = useState<readonly AdapterCatalogEntry[]>([]);
  const [adapters, setAdapters] = useState<readonly ChannelAdapterView[]>([]);
  const [outputs, setOutputs] = useState<OutputsSummaryView>({ grants: [], tokens: [] });

  const [listSearch, setListSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | AdapterCategory>("ALL");

  // Editor state: mode "list" | "add" | "edit"
  const [editorMode, setEditorMode] = useState<"list" | "add" | "edit">("list");
  const [editingAdapterId, setEditingAdapterId] = useState<string | null>(null);
  const [draftCategory, setDraftCategory] = useState<AdapterCategory>("AI_PROVIDER");
  const [draftDriverId, setDraftDriverId] = useState<AdapterDriverId | "">("");
  const [editorTab, setEditorTab] = useState<string>("basic");
  const [draftDisplayName, setDraftDisplayName] = useState("");
  const [draftEnabled, setDraftEnabled] = useState(true);
  const [draftConfig, setDraftConfig] = useState<ConfigValues>({});
  const [draftModels, setDraftModels] = useState<AdapterModelPoolItem[]>([]);

  // Manual model add form
  const [manualModelId, setManualModelId] = useState("");
  const [manualModelName, setManualModelName] = useState("");
  const [manualReasoning, setManualReasoning] = useState("medium");

  const [issuedSecret, setIssuedSecret] = useState<{
    readonly kind: "obs" | "desktop";
    readonly secret: string;
  } | null>(null);
  const [lastActionResult, setLastActionResult] = useState<{
    readonly summary: string;
    readonly summaryCode?: AdapterStatusCode;
    readonly summaryParams?: Readonly<Record<string, string | number>>;
    readonly correlationId: string;
  } | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const loadAll = useCallback(async () => {
    try {
      const [catList, adpList, outData] = await Promise.all([
        client.getCatalog(channelId),
        client.listAdapters(channelId),
        client.getOutputs(channelId),
      ]);
      setCatalog(catList);
      setAdapters(adpList);
      setOutputs(outData);
    } catch (error) {
      if (error instanceof IntegrationsApiError && error.status === 401) {
        return;
      }
      setNotice({
        tone: "danger",
        resolve: (c) =>
          error instanceof IntegrationsApiError
            ? c.messages.loadFailedCode(error.code)
            : c.messages.loadFailed,
      });
    }
  }, [channelId, client]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const startAddFlow = useCallback((category: AdapterCategory) => {
    setEditorMode("add");
    setEditingAdapterId(null);
    setDraftCategory(category);
    setDraftDriverId("");
    setEditorTab("basic");
    setDraftDisplayName("");
    setDraftEnabled(true);
    setDraftConfig({});
    setDraftModels([]);
    setLastActionResult(null);
    setIssuedSecret(null);
  }, []);

  useEffect(() => {
    if (pendingAddRequest !== null) {
      startAddFlow(pendingAddRequest.category);
    }
  }, [pendingAddRequest, startAddFlow]);

  const startEditFlow = (adapter: ChannelAdapterView) => {
    setEditorMode("edit");
    setEditingAdapterId(adapter.id);
    setDraftCategory(adapter.category);
    setDraftDriverId(adapter.driverId);
    setEditorTab("basic");
    setDraftDisplayName(adapter.displayName);
    setDraftEnabled(adapter.enabled);
    setDraftConfig({ ...adapter.config });
    setDraftModels([...adapter.models]);
    setLastActionResult(null);
    setIssuedSecret(null);
  };

  const handleSelectNewDriver = (driverIdValue: string) => {
    const id = driverIdValue as AdapterDriverId | "";
    setDraftDriverId(id);
    if (id === "") {
      setDraftConfig({});
      setDraftDisplayName("");
      return;
    }
    const meta = catalog.find((c) => c.driverId === id);
    setDraftDisplayName(meta?.displayName ?? "");
    setDraftConfig(driverDefaults(id, channelId));
  };

  const activeCatalogMeta = useMemo(
    () => catalog.find((c) => c.driverId === draftDriverId) ?? null,
    [catalog, draftDriverId],
  );

  const scopedCatalogOptions = useMemo(
    () => catalog.filter((c) => c.category === draftCategory),
    [catalog, draftCategory],
  );

  const filteredAdapters = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return adapters.filter((a) => {
      if (categoryFilter !== "ALL" && a.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        a.displayName.toLowerCase().includes(q) ||
        a.driverId.toLowerCase().includes(q)
      );
    });
  }, [adapters, categoryFilter, listSearch]);

  const handleSaveAdapter = async () => {
    if (draftDriverId === "" || !draftDisplayName.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      if (editorMode === "add") {
        const created = await client.createAdapter(channelId, {
          category: draftCategory,
          driverId: draftDriverId,
          displayName: draftDisplayName.trim(),
          enabled: draftEnabled,
          config: draftConfig,
          models: draftModels,
        });
        await loadAll();
        startEditFlow(created);
        setNotice({ tone: "positive", resolve: (c) => c.messages.created });
      } else if (editingAdapterId !== null) {
        const updated = await client.updateAdapter(channelId, editingAdapterId, {
          displayName: draftDisplayName.trim(),
          enabled: draftEnabled,
          config: draftConfig,
          models: draftModels,
        });
        await loadAll();
        startEditFlow(updated);
        setNotice({ tone: "positive", resolve: (c) => c.messages.saved });
      }
    } catch (error) {
      setNotice({
        tone: "danger",
        resolve: (c) =>
          error instanceof IntegrationsApiError
            ? c.messages.saveFailedCode(error.code)
            : c.messages.saveFailed,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRunAction = async (action: string) => {
    if (editingAdapterId === null) return;
    if (action === "issue-output-token") {
      await handleIssueGrant("OBS_OVERLAY");
      return;
    }
    if (action === "issue-output-grant") {
      await handleIssueGrant();
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await client.runAdapterAction(channelId, editingAdapterId, action);
      setLastActionResult({
        summary: res.summary,
        summaryCode: res.summaryCode,
        summaryParams: res.summaryParams,
        correlationId: res.correlationId,
      });
      setDraftModels([...res.adapter.models]);
      await loadAll();
      setNotice({
        tone: "positive",
        resolve: () =>
          formatAdapterStatus(
            {
              lastStatus: res.summary,
              lastStatusCode: res.summaryCode,
              lastStatusParams: res.summaryParams,
            },
            locale,
          ),
      });
    } catch (error) {
      setNotice({
        tone: "danger",
        resolve: (c) =>
          error instanceof IntegrationsApiError
            ? c.messages.actionFailedCode(error.code)
            : c.messages.actionFailed,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAdapter = async () => {
    if (editingAdapterId === null) return;
    setBusy(true);
    setNotice(null);
    try {
      await client.deleteAdapter(channelId, editingAdapterId);
      setConfirmDeleteOpen(false);
      setEditorMode("list");
      setEditingAdapterId(null);
      await loadAll();
      setNotice({ tone: "positive", resolve: (c) => c.messages.deleted });
    } catch (error) {
      setNotice({
        tone: "danger",
        resolve: (c) =>
          error instanceof IntegrationsApiError
            ? c.messages.deleteFailedCode(error.code)
            : c.messages.deleteFailed,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleAddManualModel = () => {
    const id = manualModelId.trim();
    if (!id) return;
    const item: AdapterModelPoolItem = {
      modelId: id,
      displayName: manualModelName.trim() || id,
      reasoningLevels: manualReasoning === "none" ? [] : [manualReasoning],
      source: "manual",
    };
    setDraftModels((prev) => [...prev.filter((m) => m.modelId !== id), item]);
    setManualModelId("");
    setManualModelName("");
  };

  const handleIssueGrant = async (outputKind: "NATIVE_V1" | "OBS_OVERLAY" | "BLIVECHAT" = "NATIVE_V1") => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await client.issueOutputGrant(channelId, outputKind);
      if (res.credential) {
        setIssuedSecret({ kind: outputKind === "OBS_OVERLAY" ? "obs" : "desktop", secret: res.credential });
      }
      await loadAll();
    } catch (error) {
      setNotice({
        tone: "danger",
        resolve: (c) =>
          error instanceof IntegrationsApiError
            ? c.messages.grantFailedCode(error.code)
            : c.messages.grantFailed,
      });
    } finally {
      setBusy(false);
    }
  };

  const updateConfigField = (key: string, value: string | boolean) => {
    setDraftConfig((prev) => ({ ...prev, [key]: value }));
  };

  const obsRoomId = String(draftConfig.roomId ?? channelId) || channelId;
  const obsPreviewHref = `/overlay/${encodeURIComponent(obsRoomId)}?preview=1`;

  return (
    <div className="vw-stack-lg">
      {notice ? <BannerNotice tone={notice.tone}>{notice.resolve(copy)}</BannerNotice> : null}

      {editorMode === "list" ? (
        <section className="vw-panel-card" aria-label={copy.listAria}>
          <div className="vw-row-between">
            <strong>{copy.listHeading(filteredAdapters.length)}</strong>
            <span className="vw-caption">{copy.listHint}</span>
          </div>

          <div className="vw-input-action-row">
            <div className="vw-field-col">
              <label className="vw-field-label" htmlFor="adp-list-search">
                {copy.searchLabel}
              </label>
              <SearchInput
                id="adp-list-search"
                fill
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder={copy.searchPlaceholder}
              />
            </div>
            <div className="vw-field-col--compact">
              <label className="vw-field-label" htmlFor="adp-cat-filter">
                {copy.categoryFilterLabel}
              </label>
              <Select
                id="adp-cat-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as "ALL" | AdapterCategory)}
                options={[
                  { value: "ALL", label: copy.allCategories(adapters.length) },
                  { value: "LIVE_PLATFORM", label: copy.categories.LIVE_PLATFORM },
                  { value: "AI_PROVIDER", label: copy.categories.AI_PROVIDER },
                  { value: "OUTPUT_TARGET", label: copy.categories.OUTPUT_TARGET },
                ]}
              />
            </div>
          </div>

          <TableShell
            label={copy.tableLabel}
            columns={[
              { key: "name", label: copy.cols.name },
              { key: "category", label: copy.cols.category },
              { key: "driver", label: copy.cols.driver },
              { key: "status", label: copy.cols.status },
              { key: "lastStatus", label: copy.cols.lastStatus },
              { key: "actions", label: copy.cols.actions, align: "end" },
            ]}
            rows={filteredAdapters.map((a) => {
              const meta = catalog.find((c) => c.driverId === a.driverId);
              return {
                name: <UntrustedText text={a.displayName} />,
                category: <Badge tone="neutral">{copy.categories[a.category]}</Badge>,
                driver: formatAdapterCatalogDriver(
                  a.driverId,
                  { displayName: meta?.displayName ?? a.driverId, summary: meta?.summary ?? "" },
                  locale,
                ).displayName,
                status: (
                  <Badge tone={a.enabled ? "positive" : "neutral"}>
                    {a.enabled ? copy.enabledBadge : copy.disabledBadge}
                  </Badge>
                ),
                lastStatus: formatAdapterStatus(a, locale),
                actions: (
                  <div className="vw-table-actions">
                    <Button size="sm" variant="secondary" onClick={() => startEditFlow(a)}>
                      {copy.configureBtn}
                    </Button>
                  </div>
                ),
              };
            })}
            emptyState={
              <EmptyState
                title={copy.emptyTitle}
                description={copy.emptyDesc}
              />
            }
          />
        </section>
      ) : (
        <section className="vw-panel-card" aria-label={copy.editorAria}>
          <div className="vw-row-between">
            <strong>
              {editorMode === "add"
                ? copy.addHeading(copy.categories[draftCategory])
                : copy.editHeading(draftDisplayName)}
            </strong>
            <Button size="sm" variant="quiet" onClick={() => setEditorMode("list")}>
              {copy.backToListBtn}
            </Button>
          </div>

          {editorMode === "add" && draftDriverId === "" ? (
            <div className="vw-stack-md">
              <div className="vw-field-col">
                <label className="vw-field-label" htmlFor="adapter-driver-pick">
                  {copy.pickDriverLabel}
                </label>
                <Select
                  id="adapter-driver-pick"
                  value={draftDriverId}
                  onChange={(event) => handleSelectNewDriver(event.target.value)}
                  options={[
                    { value: "", label: copy.pickDriverPlaceholder },
                    ...scopedCatalogOptions.map((c) => ({
                      value: c.driverId,
                      label: formatAdapterCatalogDriver(c.driverId, c, locale).displayName,
                    })),
                  ]}
                />
              </div>
              <span className="vw-muted">{copy.pickDriverHint}</span>
            </div>
          ) : (
            <div className="vw-stack-md">
              <SectionTabs
                label={copy.tabsLabel}
                selectedId={editorTab}
                onSelect={setEditorTab}
                items={[
                  { id: "basic", label: copy.tabBasic },
                  { id: "control", label: copy.tabControl },
                ]}
              >
                {editorTab === "basic" ? (
                  <div className="vw-stack-md">
                    {editorMode === "edit" ? (
                      <KeyValueList
                        items={[
                          {
                            key: "driver",
                            label: copy.boundDriverLabel,
                            value: formatAdapterCatalogDriver(
                              draftDriverId,
                              {
                                displayName: activeCatalogMeta?.displayName ?? draftDriverId,
                                summary: activeCatalogMeta?.summary ?? "",
                              },
                              locale,
                            ).displayName,
                          },
                          {
                            key: "category",
                            label: copy.adapterCategoryLabel,
                            value: copy.categories[draftCategory],
                          },
                        ]}
                      />
                    ) : (
                      <div className="vw-row-between">
                        <Badge tone="accent">
                          {copy.pickedDriverBadge(
                            formatAdapterCatalogDriver(
                              draftDriverId,
                              {
                                displayName: activeCatalogMeta?.displayName ?? draftDriverId,
                                summary: activeCatalogMeta?.summary ?? "",
                              },
                              locale,
                            ).displayName,
                          )}
                        </Badge>
                        <Button
                          size="sm"
                          variant="quiet"
                          onClick={() => handleSelectNewDriver("")}
                        >
                          {copy.repickDriverBtn}
                        </Button>
                      </div>
                    )}

                    <div className="vw-field-col">
                      <label className="vw-field-label" htmlFor="adp-display-name">
                        {copy.displayNameLabel}
                      </label>
                      <Input
                        id="adp-display-name"
                        value={draftDisplayName}
                        onChange={(e) => setDraftDisplayName(e.target.value)}
                      />
                    </div>

                    {draftDriverId === "youtube-live-v3" ? (
                      <div className="vw-stack-sm">
                        <div className="vw-field-col">
                          <label className="vw-field-label" htmlFor="yt-channel-url">
                            {copy.ytChannelUrlLabel}
                          </label>
                          <Input
                            id="yt-channel-url"
                            value={String(draftConfig.channelUrl ?? "")}
                            onChange={(e) => updateConfigField("channelUrl", e.target.value)}
                            placeholder="https://www.youtube.com/@channel/live"
                          />
                        </div>
                        <div className="vw-row-wrap">
                          <div className="vw-field-col--compact">
                            <label className="vw-field-label" htmlFor="yt-client-id">
                              {copy.ytClientIdLabel}
                            </label>
                            <Input
                              id="yt-client-id"
                              value={String(draftConfig.clientId ?? "")}
                              onChange={(e) => updateConfigField("clientId", e.target.value)}
                            />
                          </div>
                          <div className="vw-field-col--compact">
                            <label className="vw-field-label" htmlFor="yt-client-secret">
                              {copy.ytClientSecretLabel}
                            </label>
                            <Input
                              id="yt-client-secret"
                              type="password"
                              value={String(draftConfig.clientSecret ?? "")}
                              onChange={(e) => updateConfigField("clientSecret", e.target.value)}
                            />
                          </div>
                          <div className="vw-field-col--compact">
                            <label className="vw-field-label" htmlFor="yt-refresh-token">
                              {copy.ytRefreshTokenLabel}
                            </label>
                            <Input
                              id="yt-refresh-token"
                              type="password"
                              value={String(draftConfig.refreshToken ?? "")}
                              onChange={(e) => updateConfigField("refreshToken", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ) : draftDriverId === "kiro-cli" ? (
                      <div className="vw-row-wrap">
                        <div className="vw-field-col--compact">
                          <label className="vw-field-label" htmlFor="kiro-path">
                            {copy.kiroPathLabel}
                          </label>
                          <Input
                            id="kiro-path"
                            value={String(draftConfig.cliPath ?? "kiro-cli")}
                            onChange={(e) => updateConfigField("cliPath", e.target.value)}
                          />
                        </div>
                        <div className="vw-field-col">
                          <label className="vw-field-label" htmlFor="kiro-workdir">
                            {copy.kiroWorkDirLabel}
                          </label>
                          <Input
                            id="kiro-workdir"
                            value={String(draftConfig.workDir ?? "")}
                            onChange={(e) => updateConfigField("workDir", e.target.value)}
                          />
                        </div>
                        <div className="vw-field-col--compact">
                          <label className="vw-field-label" htmlFor="kiro-key">
                            {copy.kiroKeyLabel}
                          </label>
                          <Input
                            id="kiro-key"
                            type="password"
                            value={String(draftConfig.kiroApiKey ?? "")}
                            onChange={(e) => updateConfigField("kiroApiKey", e.target.value)}
                          />
                        </div>
                      </div>
                    ) : draftDriverId === "obs-overlay-source" ? (
                      <div className="vw-stack-md">
                        <div className="vw-field-col--compact">
                          <label className="vw-field-label" htmlFor="obs-room-id">
                            {copy.obsRoomIdLabel}
                          </label>
                          <Input
                            id="obs-room-id"
                            value={String(draftConfig.roomId ?? channelId)}
                            onChange={(e) => updateConfigField("roomId", e.target.value)}
                          />
                        </div>
                        <Switch
                          label={copy.obsShowOrigLabel}
                          checked={draftConfig.showOriginalText !== false}
                          onChange={(e) => updateConfigField("showOriginalText", e.target.checked)}
                        />
                        <Switch
                          label={copy.obsShowTransLabel}
                          checked={draftConfig.showTranslation !== false}
                          onChange={(e) => updateConfigField("showTranslation", e.target.checked)}
                        />
                        <BannerNotice
                          tone="info"
                          title={copy.obsPreviewTitle}
                          actions={
                            <a href={obsPreviewHref} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="primary">
                                {copy.obsPreviewBtn}
                              </Button>
                            </a>
                          }
                        >
                          {copy.obsPreviewDescBefore}
                          <span className="vw-mono">{`/overlay/${encodeURIComponent(obsRoomId)}#cred=<token>`}</span>
                          {copy.obsPreviewDescAfter}
                        </BannerNotice>
                      </div>
                    ) : draftDriverId === "native-readonly-protocol" ? (
                      <div className="vw-stack-md">
                        <div className="vw-field-col--compact">
                          <label className="vw-field-label" htmlFor="native-proto-flavor">
                            {copy.nativeTargetLabel}
                          </label>
                          <Select
                            id="native-proto-flavor"
                            value={String(draftConfig.protocolFlavor ?? "blivechat")}
                            onChange={(e) => updateConfigField("protocolFlavor", e.target.value)}
                            options={[
                              { value: "blivechat", label: copy.nativeOptBlivechat },
                              { value: "native-ws", label: copy.nativeOptWs },
                            ]}
                          />
                        </div>
                        <div className="vw-field-col">
                          <label className="vw-field-label" htmlFor="native-loopback-url">
                            {copy.nativeLoopbackLabel}
                          </label>
                          <Input
                            id="native-loopback-url"
                            value={String(draftConfig.loopbackEndpoint ?? "ws://127.0.0.1:12450")}
                            onChange={(e) => updateConfigField("loopbackEndpoint", e.target.value)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="vw-row-wrap">
                        <div className="vw-field-col">
                          <label className="vw-field-label" htmlFor="ai-base-url">
                            {copy.customEndpointLabel}
                          </label>
                          <Input
                            id="ai-base-url"
                            value={String(draftConfig.baseEndpoint ?? "")}
                            onChange={(e) => updateConfigField("baseEndpoint", e.target.value)}
                            placeholder={copy.customEndpointPlaceholder}
                          />
                        </div>
                        <div className="vw-field-col--compact">
                          <label className="vw-field-label" htmlFor="ai-api-key">
                            {copy.customKeyLabel}
                          </label>
                          <Input
                            id="ai-api-key"
                            type="password"
                            value={String(draftConfig.apiKey ?? "")}
                            onChange={(e) => updateConfigField("apiKey", e.target.value)}
                          />
                        </div>
                        <div className="vw-field-col--compact">
                          <label className="vw-field-label" htmlFor="ai-api-ver">
                            {copy.customVersionLabel}
                          </label>
                          <Input
                            id="ai-api-ver"
                            value={String(draftConfig.apiVersion ?? "")}
                            onChange={(e) => updateConfigField("apiVersion", e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {draftCategory === "AI_PROVIDER" ? (
                      <div className="vw-panel-card vw-panel-card--quiet">
                        <div className="vw-row-between">
                          <strong>{copy.modelPoolHeading}</strong>
                          {editorMode === "edit" ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy}
                              onClick={() => void handleRunAction("fetch-models")}
                            >
                              {copy.fetchModelsBtn}
                            </Button>
                          ) : (
                            <span className="vw-caption">{copy.fetchModelsHint}</span>
                          )}
                        </div>

                        <div className="vw-input-action-row">
                          <div className="vw-field-col--compact">
                            <label className="vw-field-label" htmlFor="manual-model-id">
                              {copy.manualIdLabel}
                            </label>
                            <Input
                              id="manual-model-id"
                              value={manualModelId}
                              onChange={(e) => setManualModelId(e.target.value)}
                              placeholder="gpt-4.1-mini"
                            />
                          </div>
                          <div className="vw-field-col--compact">
                            <label className="vw-field-label" htmlFor="manual-model-name">
                              {copy.manualNameLabel}
                            </label>
                            <Input
                              id="manual-model-name"
                              value={manualModelName}
                              onChange={(e) => setManualModelName(e.target.value)}
                              placeholder="GPT-4.1 mini"
                            />
                          </div>
                          <div className="vw-field-col--compact">
                            <label className="vw-field-label" htmlFor="manual-reasoning">
                              {copy.manualReasoningLabel}
                            </label>
                            <Select
                              id="manual-reasoning"
                              value={manualReasoning}
                              onChange={(e) => setManualReasoning(e.target.value)}
                              options={[
                                { value: "low", label: copy.reasoningLow },
                                { value: "medium", label: copy.reasoningMedium },
                                { value: "high", label: copy.reasoningHigh },
                                { value: "none", label: copy.reasoningNone },
                              ]}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!manualModelId.trim()}
                            onClick={handleAddManualModel}
                          >
                            {copy.addModelBtn}
                          </Button>
                        </div>

                        <TableShell
                          label={copy.modelTableLabel}
                          columns={[
                            { key: "modelId", label: copy.colModelId },
                            { key: "displayName", label: copy.colDisplayName },
                            { key: "reasoning", label: copy.colReasoning },
                            { key: "source", label: copy.colSource },
                            { key: "actions", label: copy.cols.actions, align: "end" },
                          ]}
                          rows={draftModels.map((m) => ({
                            modelId: <span className="vw-mono">{m.modelId}</span>,
                            displayName: <UntrustedText text={m.displayName} />,
                            reasoning:
                              m.reasoningLevels.length > 0
                                ? m.reasoningLevels.join(" / ")
                                : copy.reasoningDefault,
                            source: m.source === "remote" ? copy.sourceRemote : copy.sourceManual,
                            actions: (
                              <Button
                                size="sm"
                                variant="quiet"
                                onClick={() =>
                                  setDraftModels((prev) =>
                                    prev.filter((item) => item.modelId !== m.modelId),
                                  )
                                }
                              >
                                {copy.removeBtn}
                              </Button>
                            ),
                          }))}
                          emptyState={<EmptyState title={copy.emptyModelsTitle} />}
                        />
                      </div>
                    ) : null}

                    <div>
                      <Button
                        variant="primary"
                        loading={busy}
                        disabled={!draftDisplayName.trim()}
                        onClick={() => void handleSaveAdapter()}
                      >
                        {editorMode === "add" ? copy.createAdapterBtn : copy.saveBasicBtn}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="vw-stack-md">
                    <Switch
                      label={copy.enableSwitchLabel}
                      description={copy.enableSwitchDesc}
                      checked={draftEnabled}
                      onChange={(e) => setDraftEnabled(e.target.checked)}
                    />

                    <div className="vw-row-wrap">
                      <Button variant="primary" loading={busy} onClick={() => void handleSaveAdapter()}>
                        {copy.applyStateBtn}
                      </Button>
                    </div>

                    {editorMode === "edit" && activeCatalogMeta ? (
                      <div className="vw-panel-card vw-panel-card--quiet">
                        <strong>{copy.controlActionsHeading}</strong>
                        <div className="vw-row-wrap">
                          {activeCatalogMeta.controlActions.map((act) => (
                            <Button
                              key={act.action}
                              size="sm"
                              variant="secondary"
                              disabled={busy}
                              onClick={() => void handleRunAction(act.action)}
                            >
                              {formatAdapterActionLabel(act.action, act.label, locale)}
                            </Button>
                          ))}
                        </div>
                        {lastActionResult ? (
                          <BannerNotice
                            tone="positive"
                            actions={
                              <Link
                                to={`/logs/${encodeURIComponent(channelId)}?tab=integration&correlationId=${encodeURIComponent(lastActionResult.correlationId)}`}
                              >
                                {copy.viewIntLogLink}
                              </Link>
                            }
                          >
                            {formatAdapterStatus(
                              {
                                lastStatus: lastActionResult.summary,
                                lastStatusCode: lastActionResult.summaryCode,
                                lastStatusParams: lastActionResult.summaryParams,
                              },
                              locale,
                            )}
                          </BannerNotice>
                        ) : null}
                      </div>
                    ) : null}

                    {issuedSecret ? (
                      <BannerNotice
                        tone="positive"
                        title={copy.issuedTitle(
                          issuedSecret.kind === "obs" ? copy.obsKindLabel : copy.desktopKindLabel,
                        )}
                        actions={
                          <ClipboardCopyButton
                            text={issuedSecret.secret}
                            ariaLabel={copy.copyCredAria}
                            idleLabel={copy.copyCredIdle}
                            copiedLabel={copy.copyCredDone}
                          />
                        }
                      >
                        {copy.issuedBody}
                      </BannerNotice>
                    ) : null}

                    {draftDriverId === "obs-overlay-source" ? (
                      <div className="vw-panel-card vw-panel-card--quiet">
                        <div className="vw-row-between">
                          <strong>
                            {copy.obsTokensHeading(
                              outputs.grants.filter((g) => g.outputKind === "OBS_OVERLAY").length,
                            )}
                          </strong>
                          <div className="vw-row-wrap">
                            <a href={obsPreviewHref} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="quiet">
                                {copy.openStagePreviewBtn}
                              </Button>
                            </a>
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={busy}
                              onClick={() => void handleIssueGrant("OBS_OVERLAY")}
                            >
                              {copy.issueObsTokenBtn}
                            </Button>
                          </div>
                        </div>
                        <TableShell
                          label={copy.obsTableLabel}
                          columns={[
                            { key: "id", label: copy.colTokenId },
                            { key: "kind", label: copy.colGrantKind },
                            { key: "actions", label: copy.cols.actions, align: "end" },
                          ]}
                          rows={outputs.grants
                            .filter((g) => g.outputKind === "OBS_OVERLAY")
                            .map((g) => ({
                              id: <span className="vw-mono">{g.grantId}</span>,
                              kind: g.outputKind,
                              actions: (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={busy}
                                  onClick={() =>
                                    void client.revokeOutputGrant(channelId, g.grantId).then(loadAll)
                                  }
                                >
                                  {copy.revokeBtn}
                                </Button>
                              ),
                            }))}
                          emptyState={<EmptyState title={copy.emptyObsTitle} />}
                        />
                        {outputs.tokens.length > 0 ? (
                          <TableShell
                            label={copy.obsTableLabel}
                            columns={[
                              { key: "id", label: copy.colTokenId },
                              { key: "createdAt", label: copy.colIssuedAt },
                              { key: "actions", label: copy.cols.actions, align: "end" },
                            ]}
                            rows={outputs.tokens.map((t) => ({
                              id: <span className="vw-mono">{t.tokenId}</span>,
                              createdAt: new Date(t.createdAt).toLocaleString(locale),
                              actions: (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={busy}
                                  onClick={() =>
                                    void client.revokeOutputToken(channelId, t.tokenId).then(loadAll)
                                  }
                                >
                                  {copy.revokeBtn}
                                </Button>
                              ),
                            }))}
                            emptyState={<EmptyState title={copy.emptyObsTitle} />}
                          />
                        ) : null}
                      </div>
                    ) : null}

                    {draftDriverId === "native-readonly-protocol" ? (
                      <div className="vw-panel-card vw-panel-card--quiet">
                        <div className="vw-row-between">
                          <strong>{copy.grantsHeading(outputs.grants.length)}</strong>
                          <div className="vw-row-wrap">
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy}
                              onClick={() => void handleIssueGrant("BLIVECHAT")}
                            >
                              {copy.blivechatDesktopLabel}
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={busy}
                              onClick={() => void handleIssueGrant("NATIVE_V1")}
                            >
                              {copy.issueGrantBtn}
                            </Button>
                          </div>
                        </div>
                        <TableShell
                          label={copy.grantTableLabel}
                          columns={[
                            { key: "id", label: copy.colGrantId },
                            { key: "kind", label: copy.colGrantKind },
                            { key: "actions", label: copy.cols.actions, align: "end" },
                          ]}
                          rows={outputs.grants.map((g) => ({
                            id: <span className="vw-mono">{g.grantId}</span>,
                            kind:
                              g.outputKind === "BLIVECHAT" || g.outputKind === "blivechat"
                                ? copy.blivechatDesktopLabel
                                : g.outputKind,
                            actions: (
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={busy}
                                onClick={() =>
                                  void client.revokeOutputGrant(channelId, g.grantId).then(loadAll)
                                }
                              >
                                {copy.revokeBtn}
                              </Button>
                            ),
                          }))}
                          emptyState={<EmptyState title={copy.emptyGrantsTitle} />}
                        />
                      </div>
                    ) : null}

                    {editorMode === "edit" ? (
                      <div>
                        <Button
                          variant="danger"
                          disabled={busy}
                          onClick={() => setConfirmDeleteOpen(true)}
                        >
                          {copy.deleteAdapterBtn}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
              </SectionTabs>
            </div>
          )}
        </section>
      )}

      <ConfirmActionDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={copy.deleteDialogTitle}
        message={copy.deleteDialogMessage(draftDisplayName)}
        confirmLabel={copy.confirmDeleteBtn}
        cancelLabel={copy.cancelBtn}
        tone="danger"
        onConfirm={() => void handleDeleteAdapter()}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}

export function IntegrationsPage({ api }: { readonly api?: IntegrationsApi }) {
  const params = useParams();
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [pendingAddRequest, setPendingAddRequest] = useState<AddRequest>(null);

  const requestAddFlow = (category: AdapterCategory) => {
    setPendingAddRequest((prev) => ({ category, seq: (prev?.seq ?? 0) + 1 }));
  };

  return (
    <VoxWardShell
      activeNavId="integrations"
      channelId={params.channelId}
      showChannelSelector={false}
      requireAuth
      pageTitle={(locale) => pickLocale(INTEGRATIONS_COPY, locale).pageTitle}
      pageDescription={(locale) => pickLocale(INTEGRATIONS_COPY, locale).pageDescription}
      pageActions={(locale) => {
        const copy = pickLocale(INTEGRATIONS_COPY, locale);
        return (
          <div>
            <Button
              ref={addTriggerRef}
              variant="primary"
              size="sm"
              onClick={() => setAddMenuOpen((prev) => !prev)}
            >
              {copy.addButtonLabel}
            </Button>
            <Menu
              open={addMenuOpen}
              onOpenChange={setAddMenuOpen}
              triggerRef={addTriggerRef}
              placement="bottom-end"
              label={copy.addMenuLabel}
              items={[
                {
                  id: "add-live",
                  label: copy.menuLiveLabel,
                  description: copy.menuLiveDesc,
                  onSelect: () => requestAddFlow("LIVE_PLATFORM"),
                },
                {
                  id: "add-ai",
                  label: copy.menuAiLabel,
                  description: copy.menuAiDesc,
                  onSelect: () => requestAddFlow("AI_PROVIDER"),
                },
                {
                  id: "add-output",
                  label: copy.menuOutputLabel,
                  description: copy.menuOutputDesc,
                  onSelect: () => requestAddFlow("OUTPUT_TARGET"),
                },
              ]}
            />
          </div>
        );
      }}
    >
      <IntegrationsSurface
        channelIdParam={params.channelId}
        api={api}
        pendingAddRequest={pendingAddRequest}
      />
    </VoxWardShell>
  );
}
