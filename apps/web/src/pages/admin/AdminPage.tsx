import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  Icon,
  Input,
  Menu,
  NumberInput,
  SearchInput,
  Select,
  SettingsLayout,
  Switch,
  TableShell,
  Textarea,
} from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import { useVoxWardShell, VoxWardShell } from "../../shell";
import {
  AdminApiFailure,
  createAdminApi,
  type AdminApi,
  type AdminSettingsView,
  type ExtendedTermEntryView,
  type ModelSelectionView,
  type ModelSettingsResponseView,
  type ModelSettingsView,
  type TermCategoryView,
} from "./api";

type SettingsSectionId = "blacklist" | "whitelist" | "scoring" | "retention";

function matchKindLabel(kind: string): string {
  switch (kind) {
    case "EXACT":
      return "精确匹配";
    case "CONTAINS":
      return "包含子串";
    case "REGEX":
      return "受限正则";
    case "NORMALIZED":
      return "归一化匹配";
    default:
      return "精确匹配";
  }
}

function TermRowActions({
  entry,
  onEdit,
  onDelete,
}: {
  readonly entry: ExtendedTermEntryView;
  readonly onEdit: (entry: ExtendedTermEntryView) => void;
  readonly onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="vw-table-actions">
      <Button
        ref={triggerRef}
        aria-label="词条操作"
        size="sm"
        variant="quiet"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Icon name="more-horizontal" size="sm" />
      </Button>
      <Menu
        open={open}
        onOpenChange={setOpen}
        triggerRef={triggerRef}
        placement="bottom-end"
        label="词条操作菜单"
        items={[
          { id: "edit", label: "编辑词条", onSelect: () => onEdit(entry) },
          { id: "delete", label: "删除词条", danger: true, onSelect: () => onDelete(entry.id) },
        ]}
      />
    </div>
  );
}

export interface AdminPageProps {
  readonly api?: AdminApi;
}

export function AdminPage({ api }: AdminPageProps) {
  const params = useParams();
  const { activeChannelId } = useVoxWardShell();
  const channelId = params.channelId ?? activeChannelId;
  const adminClient = useMemo(() => api ?? createAdminApi(), [api]);

  const [section, setSection] = useState<SettingsSectionId>("blacklist");

  // Term categories & entries state
  const [categories, setCategories] = useState<readonly TermCategoryView[]>([]);
  const [entries, setEntries] = useState<readonly ExtendedTermEntryView[]>([]);
  const [catCode, setCatCode] = useState("");
  const [catLabel, setCatLabel] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [termSearch, setTermSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [showAddTermForm, setShowAddTermForm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [newTermText, setNewTermText] = useState("");
  const [newTermCategory, setNewTermCategory] = useState("");
  const [newTermMatchKind, setNewTermMatchKind] = useState<"EXACT" | "CONTAINS" | "REGEX">("EXACT");
  const [csvText, setCsvText] = useState("");
  const [editingEntry, setEditingEntry] = useState<ExtendedTermEntryView | null>(null);

  // Scoring, model, retention state
  const [modelResp, setModelResp] = useState<ModelSettingsResponseView | null>(null);
  const [modelForm, setModelForm] = useState<ModelSettingsView | null>(null);
  const [adminForm, setAdminForm] = useState<AdminSettingsView | null>(null);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "positive" | "danger" | "warning"; text: string } | null>(null);

  const loadChannelConfig = useCallback(async () => {
    try {
      const [cats, entList, mod, adm] = await Promise.all([
        adminClient.listTermCategories(channelId),
        adminClient.listTermEntries(channelId),
        adminClient.getModelSettings(channelId),
        adminClient.getAdminSettings(channelId),
      ]);
      setCategories(cats);
      setEntries(entList);
      setModelResp(mod);
      setModelForm(mod.settings);
      setAdminForm(adm);
    } catch (error) {
      if (error instanceof AdminApiFailure && error.status === 401) {
        return;
      }
      setNotice({
        tone: "danger",
        text: error instanceof AdminApiFailure ? `加载设置失败 (${error.code})` : "加载频道设置失败。",
      });
    }
  }, [adminClient, channelId]);

  useEffect(() => {
    void loadChannelConfig();
  }, [loadChannelConfig]);

  const activeListKind: "BLACKLIST" | "WHITELIST" =
    section === "whitelist" ? "WHITELIST" : "BLACKLIST";

  const scopedCategories = useMemo(
    () => categories.filter((c) => c.listKind === activeListKind),
    [categories, activeListKind],
  );

  const defaultCatForList = scopedCategories[0]?.code ?? (activeListKind === "WHITELIST" ? "friendly" : "spam");
  const effectiveNewCategory =
    scopedCategories.some((c) => c.code === newTermCategory) ? newTermCategory : defaultCatForList;

  const filteredEntries = useMemo(() => {
    const q = termSearch.trim().toLowerCase();
    return entries.filter((entry) => {
      if (entry.listKind !== activeListKind) return false;
      if (categoryFilter !== "ALL" && entry.categoryCode !== categoryFilter) return false;
      if (!q) return true;
      return entry.term.toLowerCase().includes(q) || entry.categoryCode.toLowerCase().includes(q);
    });
  }, [entries, activeListKind, categoryFilter, termSearch]);

  const handleAddCategory = async () => {
    if (!catCode.trim() || !catLabel.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const next = await adminClient.createTermCategory(channelId, {
        code: catCode.trim(),
        label: catLabel.trim(),
        listKind: activeListKind,
        description: catDesc.trim(),
      });
      setCategories(next);
      setCatCode("");
      setCatLabel("");
      setCatDesc("");
      setNotice({ tone: "positive", text: "新词库分类已追加（分类代码创建后不可删除）。" });
    } catch (error) {
      setNotice({
        tone: "danger",
        text:
          error instanceof AdminApiFailure && error.status === 409
            ? "该分类代码已存在，请使用唯一标识。"
            : error instanceof AdminApiFailure
              ? `新增分类失败 (${error.code})`
              : "新增分类失败。",
      });
    } finally {
      setBusy(false);
    }
  };

  const persistEntries = async (next: readonly ExtendedTermEntryView[], successText: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const saved = await adminClient.saveTermEntries(channelId, next);
      setEntries(saved);
      setNotice({ tone: "positive", text: successText });
    } catch (error) {
      if (error instanceof AdminApiFailure && error.issues && error.issues.length > 0) {
        const first = error.issues[0];
        if (first !== undefined) {
          setNotice({
            tone: "danger",
            text: first.hint ?? `词条规则校验失败 (${first.code})`,
          });
        }
      } else {
        setNotice({
          tone: "danger",
          text: error instanceof AdminApiFailure ? `保存词条失败 (${error.code})` : "保存词条失败。",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleAddTerm = async () => {
    const trimmed = newTermText.trim();
    if (!trimmed) return;
    const item: ExtendedTermEntryView = {
      id: `term-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      listKind: activeListKind,
      term: trimmed,
      categoryCode: effectiveNewCategory,
      matchKind: newTermMatchKind,
      enabled: true,
    };
    await persistEntries([item, ...entries], "词条已添加到当前词库。");
    setNewTermText("");
    setShowAddTermForm(false);
  };

  const handleCsvImport = async () => {
    if (!csvText.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminClient.importTermEntriesCsv(channelId, activeListKind, csvText);
      setEntries(res.entries);
      setCsvText("");
      setShowCsvImport(false);
      const firstErr = res.errors[0];
      if (firstErr !== undefined) {
        setNotice({
          tone: "warning",
          text: `已导入 ${res.imported} 条词条，另有 ${res.errors.length} 行格式或正则校验未通过（如第 ${firstErr.line} 行：${firstErr.message}）。`,
        });
      } else {
        setNotice({ tone: "positive", text: `成功批量导入 ${res.imported} 条词条。` });
      }
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof AdminApiFailure ? `CSV 导入失败 (${error.code})` : "CSV 导入失败。",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveModels = async () => {
    if (modelForm === null) return;
    setBusy(true);
    setNotice(null);
    try {
      const saved = await adminClient.saveModelSettings(channelId, modelForm);
      setModelResp(saved);
      setModelForm(saved.settings);
      setNotice({ tone: "positive", text: "SC 精翻开关与 AI 推理模型策略已保存。" });
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof AdminApiFailure ? `保存模型设置失败 (${error.code})` : "保存模型设置失败。",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAdminSettings = async (okMessage: string) => {
    if (adminForm === null) return;
    setBusy(true);
    setNotice(null);
    try {
      const saved = await adminClient.saveAdminSettings(channelId, adminForm);
      setAdminForm(saved);
      setNotice({ tone: "positive", text: okMessage });
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof AdminApiFailure ? `保存策略失败 (${error.code})` : "保存策略失败。",
      });
    } finally {
      setBusy(false);
    }
  };

  const modelChoices = modelResp?.capabilities.models ?? [];

  const renderModelPicker = (
    idPrefix: string,
    label: string,
    value: ModelSelectionView | null,
    onChange: (next: ModelSelectionView | null) => void,
  ) => {
    const selectedModel = modelChoices.find((m) => m.modelId === value?.modelId);
    const levels = selectedModel?.reasoningLevels ?? [];
    return (
      <div className="vw-row-wrap">
        <div className="vw-field-col">
          <label className="vw-field-label" htmlFor={`${idPrefix}-model`}>
            {label}
          </label>
          <Select
            id={`${idPrefix}-model`}
            value={value?.modelId ?? ""}
            onChange={(event) => {
              const chosenId = event.target.value;
              if (!chosenId) {
                onChange(null);
                return;
              }
              const cap = modelChoices.find((m) => m.modelId === chosenId);
              onChange({
                modelId: chosenId,
                reasoning: cap?.reasoningLevels[0] ?? null,
              });
            }}
            options={[
              { value: "", label: "暂未绑定模型" },
              ...modelChoices.map((m) => ({
                value: m.modelId,
                label: "displayName" in m && typeof m.displayName === "string" ? m.displayName : m.modelId,
              })),
            ]}
          />
        </div>
        {levels.length > 0 ? (
          <div className="vw-field-col--compact">
            <label className="vw-field-label" htmlFor={`${idPrefix}-reasoning`}>
              推理强度
            </label>
            <Select
              id={`${idPrefix}-reasoning`}
              value={value?.reasoning ?? levels[0]}
              onChange={(event) =>
                onChange({
                  modelId: value?.modelId ?? "",
                  reasoning: event.target.value,
                })
              }
              options={levels.map((lv) => ({ value: lv, label: lv }))}
            />
          </div>
        ) : null}
      </div>
    );
  };

  const localNavigation = (
    <nav className="vw-settings-nav" aria-label="系统设置导航">
      <div className="vw-settings-group-title">规则与词库</div>
      <button
        type="button"
        className={
          section === "blacklist"
            ? "vw-settings-nav-item vw-settings-nav-item--sub vw-settings-nav-item--active"
            : "vw-settings-nav-item vw-settings-nav-item--sub"
        }
        onClick={() => {
          setSection("blacklist");
          setCategoryFilter("ALL");
          setShowAddTermForm(false);
          setShowCsvImport(false);
        }}
      >
        黑名单词条
      </button>
      <button
        type="button"
        className={
          section === "whitelist"
            ? "vw-settings-nav-item vw-settings-nav-item--sub vw-settings-nav-item--active"
            : "vw-settings-nav-item vw-settings-nav-item--sub"
        }
        onClick={() => {
          setSection("whitelist");
          setCategoryFilter("ALL");
          setShowAddTermForm(false);
          setShowCsvImport(false);
        }}
      >
        白名单词条
      </button>

      <hr className="vw-divider-rule" />

      <button
        type="button"
        className={
          section === "scoring"
            ? "vw-settings-nav-item vw-settings-nav-item--active"
            : "vw-settings-nav-item"
        }
        onClick={() => setSection("scoring")}
      >
        计分与运行策略
      </button>
      <button
        type="button"
        className={
          section === "retention"
            ? "vw-settings-nav-item vw-settings-nav-item--active"
            : "vw-settings-nav-item"
        }
        onClick={() => setSection("retention")}
      >
        数据保留策略
      </button>
    </nav>
  );

  return (
    <VoxWardShell
      activeNavId="settings"
      channelId={channelId}
      showChannelSelector
      requireAuth
      pageTitle="系统设置"
      pageDescription="维护当前选中频道的词库分类、规则词条、计分策略、AI 模型池绑定及数据保留周期（个人主题与语言偏好已迁至右上角头像「用户偏好」）。"
    >
      <div className="vw-stack-md">
        {notice ? <BannerNotice tone={notice.tone}>{notice.text}</BannerNotice> : null}

        <SettingsLayout
          navigation={localNavigation}
          navigationLabel="系统设置栏目"
          contentLabel="系统设置配置区"
        >
          {section === "blacklist" || section === "whitelist" ? (
            <div className="vw-stack-md">
              <section className="vw-panel-card" aria-label="词库分类管理（只增不删）">
                <div className="vw-row-between">
                  <strong>
                    {activeListKind === "BLACKLIST" ? "黑名单分类字典" : "白名单分类字典"}
                  </strong>
                  <Badge tone="neutral">只增不删，保障审计引用稳定</Badge>
                </div>
                <TableShell
                  label="词库分类列表"
                  columns={[
                    { key: "code", label: "分类代码" },
                    { key: "label", label: "分类名称" },
                    { key: "description", label: "说明" },
                  ]}
                  rows={scopedCategories.map((c) => ({
                    code: <span className="vw-mono">{c.code}</span>,
                    label: c.label,
                    description: c.description || <span className="vw-muted">无说明</span>,
                  }))}
                  emptyState={<EmptyState title="暂无分类" />}
                />
                <div className="vw-input-action-row">
                  <div className="vw-field-col--compact">
                    <label className="vw-field-label" htmlFor="cat-code">
                      新分类代码
                    </label>
                    <Input
                      id="cat-code"
                      value={catCode}
                      onChange={(event) => setCatCode(event.target.value)}
                      placeholder="例如：ad_links"
                    />
                  </div>
                  <div className="vw-field-col--compact">
                    <label className="vw-field-label" htmlFor="cat-label">
                      分类名称
                    </label>
                    <Input
                      id="cat-label"
                      value={catLabel}
                      onChange={(event) => setCatLabel(event.target.value)}
                      placeholder="例如：导流外链"
                    />
                  </div>
                  <div className="vw-field-col">
                    <label className="vw-field-label" htmlFor="cat-desc">
                      备注说明（可选）
                    </label>
                    <Input
                      id="cat-desc"
                      value={catDesc}
                      onChange={(event) => setCatDesc(event.target.value)}
                      placeholder="说明此类词汇适用的拦截或豁免场景"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    disabled={busy || !catCode.trim() || !catLabel.trim()}
                    onClick={() => void handleAddCategory()}
                  >
                    + 新增归类
                  </Button>
                </div>
              </section>

              <section className="vw-panel-card" aria-label="合并词条管理卡片">
                <div className="vw-row-between">
                  <strong>
                    {activeListKind === "BLACKLIST"
                      ? `黑名单词条库 (${filteredEntries.length})`
                      : `白名单词条库 (${filteredEntries.length})`}
                  </strong>
                  <div className="vw-row-wrap">
                    <Button
                      size="sm"
                      variant={showCsvImport ? "primary" : "secondary"}
                      onClick={() => {
                        setShowCsvImport((prev) => !prev);
                        setShowAddTermForm(false);
                      }}
                    >
                      {showCsvImport ? "收起 CSV 导入" : "CSV 导入"}
                    </Button>
                    <Button
                      size="sm"
                      variant={showAddTermForm ? "secondary" : "primary"}
                      onClick={() => {
                        setShowAddTermForm((prev) => !prev);
                        setShowCsvImport(false);
                      }}
                    >
                      {showAddTermForm ? "取消增添" : "+ 手动增添词条"}
                    </Button>
                  </div>
                </div>

                <div className="vw-input-action-row">
                  <div className="vw-field-col">
                    <label className="vw-field-label" htmlFor="term-search">
                      搜索词条或分类
                    </label>
                    <SearchInput
                      id="term-search"
                      fill
                      value={termSearch}
                      onChange={(event) => setTermSearch(event.target.value)}
                      placeholder="按关键字筛选现有词条…"
                    />
                  </div>
                  <div className="vw-field-col--compact">
                    <label className="vw-field-label" htmlFor="term-cat-filter">
                      按分类过滤
                    </label>
                    <Select
                      id="term-cat-filter"
                      value={categoryFilter}
                      onChange={(event) => setCategoryFilter(event.target.value)}
                      options={[
                        { value: "ALL", label: "全部分类" },
                        ...scopedCategories.map((c) => ({ value: c.code, label: c.label })),
                      ]}
                    />
                  </div>
                </div>

                {showAddTermForm ? (
                  <div className="vw-panel-card vw-panel-card--quiet">
                    <strong>手动增添词条</strong>
                    <div className="vw-input-action-row">
                      <div className="vw-field-col">
                        <label className="vw-field-label" htmlFor="new-term-text">
                          词条内容 / 正则模式
                        </label>
                        <Input
                          id="new-term-text"
                          value={newTermText}
                          onChange={(event) => setNewTermText(event.target.value)}
                          placeholder={
                            newTermMatchKind === "REGEX"
                              ? "例如：加微[vV]信?\\d{4,10}（禁止回溯量词与零宽断言）"
                              : "输入触发拦截或放行的词条文本"
                          }
                        />
                      </div>
                      <div className="vw-field-col--compact">
                        <label className="vw-field-label" htmlFor="new-term-cat">
                          所属分类
                        </label>
                        <Select
                          id="new-term-cat"
                          value={effectiveNewCategory}
                          onChange={(event) => setNewTermCategory(event.target.value)}
                          options={
                            scopedCategories.length > 0
                              ? scopedCategories.map((c) => ({ value: c.code, label: c.label }))
                              : [{ value: defaultCatForList, label: defaultCatForList }]
                          }
                        />
                      </div>
                      <div className="vw-field-col--compact">
                        <label className="vw-field-label" htmlFor="new-term-kind">
                          匹配模式
                        </label>
                        <Select
                          id="new-term-kind"
                          value={newTermMatchKind}
                          onChange={(event) =>
                            setNewTermMatchKind(
                              event.target.value as "EXACT" | "CONTAINS" | "REGEX",
                            )
                          }
                          options={[
                            { value: "EXACT", label: "精确匹配" },
                            { value: "CONTAINS", label: "包含子串" },
                            { value: "REGEX", label: "受限正则" },
                          ]}
                        />
                      </div>
                      <Button
                        variant="primary"
                        disabled={busy || !newTermText.trim()}
                        onClick={() => void handleAddTerm()}
                      >
                        确认增添
                      </Button>
                    </div>
                    {newTermMatchKind === "REGEX" ? (
                      <span className="vw-caption">
                        安全规范（受限正则）：支持基础字符组、固定次数量词及线性选择；不允许环视断言（如前瞻/后顾）、反向引用或嵌套量词导致回溯爆炸。
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {showCsvImport ? (
                  <div className="vw-panel-card vw-panel-card--quiet">
                    <strong>CSV 批量导入（格式：term,category,matchKind）</strong>
                    <div className="vw-field-col--wide">
                      <label className="vw-field-label" htmlFor="term-csv-box">
                        每行一条规则
                      </label>
                      <Textarea
                        id="term-csv-box"
                        rows={4}
                        value={csvText}
                        onChange={(event) => setCsvText(event.target.value)}
                        placeholder={`term,category,matchKind\n引流加群,${defaultCatForList},CONTAINS`}
                      />
                    </div>
                    <div className="vw-row-wrap">
                      <Button
                        variant="primary"
                        disabled={busy || !csvText.trim()}
                        onClick={() => void handleCsvImport()}
                      >
                        校验并导入 CSV
                      </Button>
                      <Button variant="quiet" onClick={() => setShowCsvImport(false)}>
                        取消
                      </Button>
                    </div>
                  </div>
                ) : null}

                <TableShell
                  label="词条列表"
                  columns={[
                    { key: "term", label: "词条内容" },
                    { key: "category", label: "分类" },
                    { key: "matchKind", label: "匹配模式" },
                    { key: "enabled", label: "启用状态" },
                    { key: "actions", label: "操作", align: "end" },
                  ]}
                  rows={filteredEntries.map((entry) => ({
                    term: <UntrustedText text={entry.term} />,
                    category:
                      categories.find((c) => c.code === entry.categoryCode)?.label ??
                      entry.categoryCode,
                    matchKind: <Badge tone="neutral">{matchKindLabel(entry.matchKind)}</Badge>,
                    enabled: (
                      <Switch
                        label={entry.enabled ? "已启用" : "已停用"}
                        checked={entry.enabled}
                        onChange={(event) =>
                          void persistEntries(
                            entries.map((item) =>
                              item.id === entry.id
                                ? { ...item, enabled: event.target.checked }
                                : item,
                            ),
                            "词条启用状态已更新。",
                          )
                        }
                      />
                    ),
                    actions: (
                      <TermRowActions
                        entry={entry}
                        onEdit={(item) => setEditingEntry(item)}
                        onDelete={(id) =>
                          void persistEntries(
                            entries.filter((item) => item.id !== id),
                            "已删除该词条。",
                          )
                        }
                      />
                    ),
                  }))}
                  emptyState={
                    <EmptyState
                      title="暂无词条"
                      description="可通过上方表单添加单条词条，或粘贴 CSV 文本批量导入。"
                    />
                  }
                />
              </section>
            </div>
          ) : section === "scoring" ? (
            <div className="vw-stack-md">
              <section className="vw-panel-card" aria-label="SC 精翻开关与模型池策略">
                <strong>Super Chat 精翻与 AI 模型策略</strong>
                {modelForm !== null ? (
                  <>
                    <Switch
                      label="开启 Super Chat 精翻（全局唯一开关）"
                      description="启用后，付费醒目留言将先由 AI 精翻再呈现至 OBS 投屏与纯净弹幕姬（审核控制台只读展示此状态）。"
                      checked={modelForm.scTranslationEnabled}
                      onChange={(event) =>
                        setModelForm({
                          ...modelForm,
                          scTranslationEnabled: event.target.checked,
                        })
                      }
                    />
                    {modelResp?.modelFault ? (
                      <BannerNotice tone="warning">{modelResp.modelFault.message}</BannerNotice>
                    ) : null}
                    {renderModelPicker(
                      "mod-realtime",
                      "实时审核主模型",
                      modelForm.realtimeModeration,
                      (next) => setModelForm({ ...modelForm, realtimeModeration: next }),
                    )}
                    {renderModelPicker(
                      "mod-sc",
                      "Super Chat 精翻模型",
                      modelForm.scTranslation,
                      (next) => setModelForm({ ...modelForm, scTranslation: next }),
                    )}
                    {renderModelPicker(
                      "mod-review",
                      "待审复核辅助模型",
                      modelForm.review,
                      (next) => setModelForm({ ...modelForm, review: next }),
                    )}
                    <div>
                      <Button
                        variant="primary"
                        loading={busy}
                        onClick={() => void handleSaveModels()}
                      >
                        保存模型与 SC 精翻策略
                      </Button>
                    </div>
                  </>
                ) : (
                  <EmptyState title="正在加载模型策略…" />
                )}
              </section>

              <section className="vw-panel-card" aria-label="观众信任计分与并发队列参数">
                <strong>信任分阈值与队列调度参数</strong>
                {adminForm !== null ? (
                  <>
                    <div className="vw-row-wrap">
                      <div className="vw-field-col--compact">
                        <label className="vw-field-label" htmlFor="sc-init">
                          观众初始基础分
                        </label>
                        <NumberInput
                          id="sc-init"
                          value={adminForm.scoring.initialScore}
                          onChange={(e) =>
                            setAdminForm({
                              ...adminForm,
                              scoring: {
                                ...adminForm.scoring,
                                initialScore: Number(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="vw-field-col--compact">
                        <label className="vw-field-label" htmlFor="sc-min">
                          信任分下限
                        </label>
                        <NumberInput
                          id="sc-min"
                          value={adminForm.scoring.minScore}
                          onChange={(e) =>
                            setAdminForm({
                              ...adminForm,
                              scoring: {
                                ...adminForm.scoring,
                                minScore: Number(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="vw-field-col--compact">
                        <label className="vw-field-label" htmlFor="sc-max">
                          信任分上限
                        </label>
                        <NumberInput
                          id="sc-max"
                          value={adminForm.scoring.maxScore}
                          onChange={(e) =>
                            setAdminForm({
                              ...adminForm,
                              scoring: {
                                ...adminForm.scoring,
                                maxScore: Number(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="vw-field-col--compact">
                        <label className="vw-field-label" htmlFor="sc-reward">
                          放行加分步长
                        </label>
                        <NumberInput
                          id="sc-reward"
                          value={adminForm.scoring.rewardDelta}
                          onChange={(e) =>
                            setAdminForm({
                              ...adminForm,
                              scoring: {
                                ...adminForm.scoring,
                                rewardDelta: Number(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="vw-field-col--compact">
                        <label className="vw-field-label" htmlFor="sc-penalty">
                          拦截扣分步长
                        </label>
                        <NumberInput
                          id="sc-penalty"
                          value={adminForm.scoring.penaltyDelta}
                          onChange={(e) =>
                            setAdminForm({
                              ...adminForm,
                              scoring: {
                                ...adminForm.scoring,
                                penaltyDelta: Number(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="vw-row-wrap">
                      <div className="vw-field-col--compact">
                        <label className="vw-field-label" htmlFor="q-rt">
                          实时并发窗口
                        </label>
                        <NumberInput
                          id="q-rt"
                          value={adminForm.queue.realtimeConcurrency}
                          onChange={(e) =>
                            setAdminForm({
                              ...adminForm,
                              queue: {
                                ...adminForm.queue,
                                realtimeConcurrency: Number(e.target.value) || 1,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="vw-field-col--compact">
                        <label className="vw-field-label" htmlFor="q-sc">
                          SC 并发窗口
                        </label>
                        <NumberInput
                          id="q-sc"
                          value={adminForm.queue.scConcurrency}
                          onChange={(e) =>
                            setAdminForm({
                              ...adminForm,
                              queue: {
                                ...adminForm.queue,
                                scConcurrency: Number(e.target.value) || 1,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="vw-field-col--compact">
                        <label className="vw-field-label" htmlFor="q-batch">
                          人工批审上限
                        </label>
                        <NumberInput
                          id="q-batch"
                          value={adminForm.queue.reviewBatchSize}
                          onChange={(e) =>
                            setAdminForm({
                              ...adminForm,
                              queue: {
                                ...adminForm.queue,
                                reviewBatchSize: Number(e.target.value) || 1,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="vw-field-col--compact">
                        <label className="vw-field-label" htmlFor="q-deadline">
                          审阅超时（毫秒）
                        </label>
                        <NumberInput
                          id="q-deadline"
                          value={adminForm.queue.taskDeadlineMs}
                          onChange={(e) =>
                            setAdminForm({
                              ...adminForm,
                              queue: {
                                ...adminForm.queue,
                                taskDeadlineMs: Number(e.target.value) || 1000,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Button
                        variant="primary"
                        loading={busy}
                        onClick={() => void handleSaveAdminSettings("计分与队列运行策略已更新。")}
                      >
                        保存计分与运行策略
                      </Button>
                    </div>
                  </>
                ) : (
                  <EmptyState title="正在加载计分策略…" />
                )}
              </section>
            </div>
          ) : (
            <section className="vw-panel-card" aria-label="数据保留周期设置">
              <strong>数据与审计日志保留策略</strong>
              {adminForm !== null ? (
                <>
                  <div className="vw-row-wrap">
                    <div className="vw-field-col--compact">
                      <label className="vw-field-label" htmlFor="ret-change">
                        变更日志保留天数
                      </label>
                      <NumberInput
                        id="ret-change"
                        value={adminForm.retention.changeLogDays}
                        onChange={(e) =>
                          setAdminForm({
                            ...adminForm,
                            retention: {
                              ...adminForm.retention,
                              changeLogDays: Number(e.target.value) || 1,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="vw-field-col--compact">
                      <label className="vw-field-label" htmlFor="ret-tech">
                        技术链路日志保留天数
                      </label>
                      <NumberInput
                        id="ret-tech"
                        value={adminForm.retention.technicalLogDays}
                        onChange={(e) =>
                          setAdminForm({
                            ...adminForm,
                            retention: {
                              ...adminForm.retention,
                              technicalLogDays: Number(e.target.value) || 1,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="vw-field-col--compact">
                      <label className="vw-field-label" htmlFor="ret-evidence">
                        观众证据归档天数
                      </label>
                      <NumberInput
                        id="ret-evidence"
                        value={adminForm.retention.evidenceDays}
                        onChange={(e) =>
                          setAdminForm({
                            ...adminForm,
                            retention: {
                              ...adminForm.retention,
                              evidenceDays: Number(e.target.value) || 1,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Button
                      variant="primary"
                      loading={busy}
                      onClick={() => void handleSaveAdminSettings("数据保留周期已保存。")}
                    >
                      保存保留策略
                    </Button>
                  </div>
                </>
              ) : (
                <EmptyState title="正在加载保留策略…" />
              )}
            </section>
          )}
        </SettingsLayout>

        <Dialog
          open={editingEntry !== null}
          onOpenChange={(open) => {
            if (!open) setEditingEntry(null);
          }}
          title="编辑规则词条"
        >
          {editingEntry !== null ? (
            <div className="vw-stack-md">
              <div className="vw-field-col">
                <label className="vw-field-label" htmlFor="edit-term-input">
                  词条文本
                </label>
                <Input
                  id="edit-term-input"
                  value={editingEntry.term}
                  onChange={(e) => setEditingEntry({ ...editingEntry, term: e.target.value })}
                />
              </div>
              <div className="vw-field-col--compact">
                <label className="vw-field-label" htmlFor="edit-term-kind">
                  匹配模式
                </label>
                <Select
                  id="edit-term-kind"
                  value={editingEntry.matchKind}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
                      matchKind: e.target.value as ExtendedTermEntryView["matchKind"],
                    })
                  }
                  options={[
                    { value: "EXACT", label: "精确匹配" },
                    { value: "CONTAINS", label: "包含子串" },
                    { value: "REGEX", label: "受限正则" },
                  ]}
                />
              </div>
              <div className="vw-row-wrap">
                <Button
                  variant="primary"
                  onClick={() => {
                    const saved = editingEntry;
                    setEditingEntry(null);
                    void persistEntries(
                      entries.map((item) => (item.id === saved.id ? saved : item)),
                      "词条修改已保存。",
                    );
                  }}
                >
                  保存修改
                </Button>
                <Button variant="quiet" onClick={() => setEditingEntry(null)}>
                  取消
                </Button>
              </div>
            </div>
          ) : null}
        </Dialog>
      </div>
    </VoxWardShell>
  );
}
