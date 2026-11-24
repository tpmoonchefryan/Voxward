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
  Select,
  Switch,
  TableShell,
} from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { SectionTabs } from "../../components/section-tabs";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
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

function categoryLabel(category: AdapterCategory): string {
  return category === "LIVE_PLATFORM" ? "直播平台" : "AI 提供商";
}

function driverDefaults(driverId: AdapterDriverId): ConfigValues {
  switch (driverId) {
    case "youtube-live-v3":
      return {
        channelUrl: "",
        clientId: "",
        clientSecret: "",
        refreshToken: "",
        syncActions: true,
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
  }
}

export function IntegrationsPage({ api }: { readonly api?: IntegrationsApi }) {
  const params = useParams();
  const { activeChannelId } = useVoxWardShell();
  const channelId = params.channelId ?? activeChannelId;
  const client = useMemo(() => api ?? createIntegrationsApi(), [api]);

  const [catalog, setCatalog] = useState<readonly AdapterCatalogEntry[]>([]);
  const [adapters, setAdapters] = useState<readonly ChannelAdapterView[]>([]);
  const [outputs, setOutputs] = useState<OutputsSummaryView>({ grants: [], tokens: [] });

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addTriggerRef = useRef<HTMLButtonElement | null>(null);

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

  // Manual model add
  const [manualModelId, setManualModelId] = useState("");
  const [manualModelName, setManualModelName] = useState("");
  const [manualReasoning, setManualReasoning] = useState("medium");

  // Delete adapter & one-time credentials
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [lastActionResult, setLastActionResult] = useState<{
    readonly summary: string;
    readonly correlationId: string;
  } | null>(null);
  const [issuedSecret, setIssuedSecret] = useState<{
    readonly kindLabel: string;
    readonly secret: string;
  } | null>(null);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "positive" | "danger" | "warning"; text: string } | null>(null);

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
        text: error instanceof IntegrationsApiError ? `加载集成配置失败 (${error.code})` : "加载集成与输出配置失败。",
      });
    }
  }, [channelId, client]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const startAddFlow = (category: AdapterCategory) => {
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
  };

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
    setDraftConfig(driverDefaults(id));
  };

  const activeCatalogMeta = useMemo(
    () => catalog.find((c) => c.driverId === draftDriverId) ?? null,
    [catalog, draftDriverId],
  );

  const scopedCatalogOptions = useMemo(
    () => catalog.filter((c) => c.category === draftCategory),
    [catalog, draftCategory],
  );

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
        setNotice({ tone: "positive", text: "适配器实例已接入；现在可在模型池拉取远端模型或执行控制动作。" });
      } else if (editingAdapterId !== null) {
        const updated = await client.updateAdapter(channelId, editingAdapterId, {
          displayName: draftDisplayName.trim(),
          enabled: draftEnabled,
          config: draftConfig,
          models: draftModels,
        });
        await loadAll();
        startEditFlow(updated);
        setNotice({ tone: "positive", text: "适配器配置已保存；已启用的 AI 模型已同步至计分策略下拉列表。" });
      }
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof IntegrationsApiError ? `保存适配器失败 (${error.code})` : "保存适配器失败。",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRunAction = async (action: string) => {
    if (editingAdapterId === null) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await client.runAdapterAction(channelId, editingAdapterId, action);
      setLastActionResult({ summary: res.summary, correlationId: res.correlationId });
      setDraftModels([...res.adapter.models]);
      await loadAll();
      setNotice({ tone: "positive", text: res.summary });
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof IntegrationsApiError ? `运维动作失败 (${error.code})` : "执行动作失败。",
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
      setNotice({ tone: "positive", text: "已移除该适配器实例。" });
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof IntegrationsApiError ? `删除适配器失败 (${error.code})` : "删除适配器失败。",
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

  const handleIssueToken = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await client.issueOutputToken(channelId);
      if (res.token) {
        setIssuedSecret({ kindLabel: "OBS 投屏单向连接令牌", secret: res.token });
      }
      await loadAll();
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof IntegrationsApiError ? `签发令牌失败 (${error.code})` : "签发 OBS 令牌失败。",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleIssueGrant = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await client.issueOutputGrant(channelId);
      if (res.credential) {
        setIssuedSecret({ kindLabel: "桌面插件（blivechat / 原生应用）连接凭据", secret: res.credential });
      }
      await loadAll();
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof IntegrationsApiError ? `签发凭据失败 (${error.code})` : "签发桌面端凭据失败。",
      });
    } finally {
      setBusy(false);
    }
  };

  const updateConfigField = (key: string, value: string | boolean) => {
    setDraftConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <VoxWardShell
      activeNavId="integrations"
      channelId={channelId}
      showChannelSelector
      requireAuth
      pageTitle="系统集成"
      pageDescription="接入直播平台拉流、AI 推理服务并签发 OBS 与桌面输出客户端只读连接凭据。"
      pageActions={
        <div>
          <Button
            ref={addTriggerRef}
            variant="primary"
            size="sm"
            onClick={() => setAddMenuOpen((prev) => !prev)}
          >
            + 接入新适配器 ▾
          </Button>
          <Menu
            open={addMenuOpen}
            onOpenChange={setAddMenuOpen}
            triggerRef={addTriggerRef}
            placement="bottom-end"
            label="选择要接入的适配器类别"
            items={[
              {
                id: "add-live",
                label: "直播平台适配器",
                description: "YouTube 直播聊天接入与平台删禁联动",
                onSelect: () => startAddFlow("LIVE_PLATFORM"),
              },
              {
                id: "add-ai",
                label: "AI 提供商适配器",
                description: "Kiro CLI 本地运行时、OpenAI / Anthropic 基础协议",
                onSelect: () => startAddFlow("AI_PROVIDER"),
              },
            ]}
          />
        </div>
      }
    >
      <div className="vw-stack-lg">
        {notice ? <BannerNotice tone={notice.tone}>{notice.text}</BannerNotice> : null}

        {editorMode === "list" ? (
          <section className="vw-panel-card" aria-label="已配置适配器列表">
            <div className="vw-row-between">
              <strong>已接入适配器实例 ({adapters.length})</strong>
            </div>
            <TableShell
              label="适配器实例一览"
              columns={[
                { key: "name", label: "实例名称" },
                { key: "category", label: "分类" },
                { key: "driver", label: "具体驱动" },
                { key: "status", label: "启用状态" },
                { key: "lastStatus", label: "最近运维状态" },
                { key: "actions", label: "操作", align: "end" },
              ]}
              rows={adapters.map((a) => ({
                name: <UntrustedText text={a.displayName} />,
                category: <Badge tone="neutral">{categoryLabel(a.category)}</Badge>,
                driver: catalog.find((c) => c.driverId === a.driverId)?.displayName ?? a.driverId,
                status: (
                  <Badge tone={a.enabled ? "positive" : "neutral"}>
                    {a.enabled ? "已启用" : "已停用"}
                  </Badge>
                ),
                lastStatus: a.lastStatus,
                actions: (
                  <div className="vw-table-actions">
                    <Button size="sm" variant="secondary" onClick={() => startEditFlow(a)}>
                      配置与控制
                    </Button>
                  </div>
                ),
              }))}
              emptyState={
                <EmptyState
                  title="尚未接入任何适配器"
                  description="点击页面右上角「+ 接入新适配器」，接入直播平台拉流或 AI 模型提供商。"
                />
              }
            />
          </section>
        ) : (
          <section className="vw-panel-card" aria-label="适配器配置视图">
            <div className="vw-row-between">
              <strong>
                {editorMode === "add"
                  ? `接入新${categoryLabel(draftCategory)}适配器`
                  : `编辑适配器：${draftDisplayName}`}
              </strong>
              <Button size="sm" variant="quiet" onClick={() => setEditorMode("list")}>
                返回适配器列表
              </Button>
            </div>

            {editorMode === "add" && draftDriverId === "" ? (
              <div className="vw-stack-md">
                <div className="vw-field-col">
                  <label className="vw-field-label" htmlFor="adapter-driver-pick">
                    选择系统内置具体驱动
                  </label>
                  <Select
                    id="adapter-driver-pick"
                    value={draftDriverId}
                    onChange={(event) => handleSelectNewDriver(event.target.value)}
                    options={[
                      { value: "", label: "请选择要接入的具体适配器驱动…" },
                      ...scopedCatalogOptions.map((c) => ({
                        value: c.driverId,
                        label: c.displayName,
                      })),
                    ]}
                  />
                </div>
                <span className="vw-muted">
                  先选择具体驱动类型，再展开对应凭据表单、AI 模型池与连接控制操作。
                </span>
              </div>
            ) : (
              <div className="vw-stack-md">
                <SectionTabs
                  label="适配器详情选项卡"
                  selectedId={editorTab}
                  onSelect={setEditorTab}
                  items={[
                    { id: "basic", label: "基础配置" },
                    { id: "control", label: "控制" },
                  ]}
                >
                  {editorTab === "basic" ? (
                    <div className="vw-stack-md">
                      {editorMode === "edit" ? (
                        <KeyValueList
                          items={[
                            {
                              key: "driver",
                              label: "绑定具体驱动（不可更改）",
                              value: activeCatalogMeta?.displayName ?? draftDriverId,
                            },
                            {
                              key: "category",
                              label: "适配器分类",
                              value: categoryLabel(draftCategory),
                            },
                          ]}
                        />
                      ) : (
                        <div className="vw-row-between">
                          <Badge tone="accent">
                            已选驱动：{activeCatalogMeta?.displayName ?? draftDriverId}
                          </Badge>
                          <Button
                            size="sm"
                            variant="quiet"
                            onClick={() => handleSelectNewDriver("")}
                          >
                            重新选择驱动
                          </Button>
                        </div>
                      )}

                      <div className="vw-field-col">
                        <label className="vw-field-label" htmlFor="adp-display-name">
                          显示名称
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
                              YouTube 直播间 / 频道地址
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
                                OAuth Client ID
                              </label>
                              <Input
                                id="yt-client-id"
                                value={String(draftConfig.clientId ?? "")}
                                onChange={(e) => updateConfigField("clientId", e.target.value)}
                              />
                            </div>
                            <div className="vw-field-col--compact">
                              <label className="vw-field-label" htmlFor="yt-client-secret">
                                Client Secret（保存后脱敏隐藏）
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
                                Refresh Token（保存后脱敏隐藏）
                              </label>
                              <Input
                                id="yt-refresh-token"
                                type="password"
                                value={String(draftConfig.refreshToken ?? "")}
                                onChange={(e) => updateConfigField("refreshToken", e.target.value)}
                              />
                            </div>
                          </div>
                          <Switch
                            label="启用平台联动删帖与封禁同步"
                            checked={draftConfig.syncActions !== false}
                            onChange={(e) => updateConfigField("syncActions", e.target.checked)}
                          />
                        </div>
                      ) : draftDriverId === "kiro-cli" ? (
                        <div className="vw-row-wrap">
                          <div className="vw-field-col--compact">
                            <label className="vw-field-label" htmlFor="kiro-path">
                              可执行文件路径
                            </label>
                            <Input
                              id="kiro-path"
                              value={String(draftConfig.cliPath ?? "kiro-cli")}
                              onChange={(e) => updateConfigField("cliPath", e.target.value)}
                            />
                          </div>
                          <div className="vw-field-col">
                            <label className="vw-field-label" htmlFor="kiro-workdir">
                              受限一次性运行根目录
                            </label>
                            <Input
                              id="kiro-workdir"
                              value={String(draftConfig.workDir ?? "")}
                              onChange={(e) => updateConfigField("workDir", e.target.value)}
                            />
                          </div>
                          <div className="vw-field-col--compact">
                            <label className="vw-field-label" htmlFor="kiro-key">
                              Kiro Token / Key（可选）
                            </label>
                            <Input
                              id="kiro-key"
                              type="password"
                              value={String(draftConfig.kiroApiKey ?? "")}
                              onChange={(e) => updateConfigField("kiroApiKey", e.target.value)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="vw-row-wrap">
                          <div className="vw-field-col">
                            <label className="vw-field-label" htmlFor="ai-base-url">
                              基础请求端点（Base Endpoint）
                            </label>
                            <Input
                              id="ai-base-url"
                              value={String(draftConfig.baseEndpoint ?? "")}
                              onChange={(e) => updateConfigField("baseEndpoint", e.target.value)}
                              placeholder="https://api.openai.com/v1"
                            />
                          </div>
                          <div className="vw-field-col--compact">
                            <label className="vw-field-label" htmlFor="ai-api-key">
                              API Key（保存后脱敏）
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
                              协议版本头
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
                            <strong>AI 模型池（供「系统设置 › 计分与运行策略」选取）</strong>
                            {editorMode === "edit" ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={busy}
                                onClick={() => void handleRunAction("fetch-models")}
                              >
                                拉取远端可用模型
                              </Button>
                            ) : (
                              <span className="vw-caption">保存后支持自动拉取远端模型</span>
                            )}
                          </div>

                          <div className="vw-row-wrap">
                            <div className="vw-field-col--compact">
                              <label className="vw-field-label" htmlFor="manual-model-id">
                                手动添加模型标识
                              </label>
                              <Input
                                id="manual-model-id"
                                value={manualModelId}
                                onChange={(e) => setManualModelId(e.target.value)}
                                placeholder="例如：gpt-4.1-mini"
                              />
                            </div>
                            <div className="vw-field-col--compact">
                              <label className="vw-field-label" htmlFor="manual-model-name">
                                显示名称
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
                                默认推理挡位
                              </label>
                              <Select
                                id="manual-reasoning"
                                value={manualReasoning}
                                onChange={(e) => setManualReasoning(e.target.value)}
                                options={[
                                  { value: "low", label: "低（low）" },
                                  { value: "medium", label: "中（medium）" },
                                  { value: "high", label: "高（high）" },
                                  { value: "none", label: "无额外参数" },
                                ]}
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={!manualModelId.trim()}
                              onClick={handleAddManualModel}
                            >
                              加入模型池
                            </Button>
                          </div>

                          <TableShell
                            label="已注册模型列表"
                            columns={[
                              { key: "modelId", label: "模型标识" },
                              { key: "displayName", label: "展示名称" },
                              { key: "reasoning", label: "支持推理强度" },
                              { key: "source", label: "来源" },
                              { key: "actions", label: "操作", align: "end" },
                            ]}
                            rows={draftModels.map((m) => ({
                              modelId: <span className="vw-mono">{m.modelId}</span>,
                              displayName: <UntrustedText text={m.displayName} />,
                              reasoning:
                                m.reasoningLevels.length > 0 ? m.reasoningLevels.join(" / ") : "默认",
                              source: m.source === "remote" ? "远端拉取" : "人工登记",
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
                                  移除
                                </Button>
                              ),
                            }))}
                            emptyState={<EmptyState title="模型池暂无条目" />}
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
                          {editorMode === "add" ? "创建并接入适配器" : "保存基础配置"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="vw-stack-md">
                      <Switch
                        label="启用此适配器实例"
                        description="停用后将暂停拉流/调用，并自动从 AI 策略可选模型列表摘除。"
                        checked={draftEnabled}
                        onChange={(e) => setDraftEnabled(e.target.checked)}
                      />

                      <div className="vw-row-wrap">
                        <Button variant="primary" loading={busy} onClick={() => void handleSaveAdapter()}>
                          应用启停状态
                        </Button>
                      </div>

                      {editorMode === "edit" && activeCatalogMeta ? (
                        <div className="vw-panel-card vw-panel-card--quiet">
                          <strong>驱动专属运维动作（请求自动记入集成日志）</strong>
                          <div className="vw-row-wrap">
                            {activeCatalogMeta.controlActions.map((act) => (
                              <Button
                                key={act.action}
                                size="sm"
                                variant="secondary"
                                disabled={busy}
                                onClick={() => void handleRunAction(act.action)}
                              >
                                {act.label}
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
                                  查看集成日志记录
                                </Link>
                              }
                            >
                              {lastActionResult.summary}
                            </BannerNotice>
                          ) : null}
                        </div>
                      ) : null}

                      {editorMode === "edit" ? (
                        <div>
                          <Button
                            variant="danger"
                            disabled={busy}
                            onClick={() => setConfirmDeleteOpen(true)}
                          >
                            删除此适配器实例
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

        <section className="vw-panel-card" aria-label="下游投屏与桌面应用凭据管理">
          <div className="vw-row-between">
            <strong>下游输出与单向只读连接凭据</strong>
            <div className="vw-row-wrap">
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => void handleIssueToken()}>
                签发 OBS 投屏令牌
              </Button>
              <Button size="sm" variant="primary" disabled={busy} onClick={() => void handleIssueGrant()}>
                签发桌面插件凭据
              </Button>
            </div>
          </div>

          {issuedSecret ? (
            <BannerNotice
              tone="positive"
              title={`已签发${issuedSecret.kindLabel}（仅展示这一次）`}
              actions={
                <ClipboardCopyButton
                  text={issuedSecret.secret}
                  ariaLabel="复制一次性输出凭据"
                  idleLabel="复制凭据"
                  copiedLabel="已复制"
                />
              }
            >
              请立即复制并填入 OBS 浏览器面板或桌面助手配置中；出于安全原则，平台不再次回显明文。
            </BannerNotice>
          ) : null}

          <div className="vw-grid-2">
            <div className="vw-panel-card vw-panel-card--quiet">
              <strong>OBS 投屏单向令牌 ({outputs.tokens.length})</strong>
              <TableShell
                label="OBS 令牌列表"
                columns={[
                  { key: "id", label: "令牌编号" },
                  { key: "createdAt", label: "签发时间" },
                  { key: "actions", label: "操作", align: "end" },
                ]}
                rows={outputs.tokens.map((t) => ({
                  id: <span className="vw-mono">{t.tokenId}</span>,
                  createdAt: new Date(t.createdAt).toLocaleString(),
                  actions: (
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onClick={() =>
                        void client.revokeOutputToken(channelId, t.tokenId).then(loadAll)
                      }
                    >
                      吊销
                    </Button>
                  ),
                }))}
                emptyState={<EmptyState title="暂无有效 OBS 令牌" />}
              />
            </div>

            <div className="vw-panel-card vw-panel-card--quiet">
              <strong>原生应用授权凭据 ({outputs.grants.length})</strong>
              <TableShell
                label="桌面输出授权列表"
                columns={[
                  { key: "id", label: "授权编号" },
                  { key: "kind", label: "输出目标" },
                  { key: "actions", label: "操作", align: "end" },
                ]}
                rows={outputs.grants.map((g) => ({
                  id: <span className="vw-mono">{g.grantId}</span>,
                  kind: g.outputKind === "blivechat" ? "blivechat 桌面插件" : g.outputKind,
                  actions: (
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onClick={() =>
                        void client.revokeOutputGrant(channelId, g.grantId).then(loadAll)
                      }
                    >
                      吊销
                    </Button>
                  ),
                }))}
                emptyState={<EmptyState title="暂无桌面输出授权" />}
              />
            </div>
          </div>
        </section>

        <ConfirmActionDialog
          open={confirmDeleteOpen}
          onOpenChange={setConfirmDeleteOpen}
          title="删除适配器确认"
          message={`确定永久删除「${draftDisplayName}」适配器实例吗？`}
          confirmLabel="确认删除"
          cancelLabel="取消"
          tone="danger"
          onConfirm={() => void handleDeleteAdapter()}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      </div>
    </VoxWardShell>
  );
}
