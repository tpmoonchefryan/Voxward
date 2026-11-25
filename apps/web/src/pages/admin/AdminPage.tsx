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
import { ADMIN_COPY, formatBuiltInTermCategory, pickLocale, type AdminCopy } from "../../i18n";
import { useVoxWardShell, VoxWardShell } from "../../shell";
import {
  decodeCsvBuffer,
  previewTermCsv,
  type CsvDelimiter,
  type CsvEncoding,
} from "./csv";
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
import { ScLanguageSelects } from "./ScLanguageSelects";
import { languageOptions, WordlistTools } from "./WordlistTools";

type SettingsSectionId = "blacklist" | "whitelist" | "scoring" | "retention";

type NoticeState = {
  readonly tone: "positive" | "danger" | "warning";
  readonly resolve: (copy: AdminCopy) => string;
} | null;

function matchKindLabel(kind: string, copy: AdminCopy): string {
  switch (kind) {
    case "EXACT":
      return copy.matchKinds.EXACT;
    case "CONTAINS":
      return copy.matchKinds.CONTAINS;
    case "REGEX":
      return copy.matchKinds.REGEX;
    case "NORMALIZED":
      return copy.matchKinds.NORMALIZED;
    default:
      return copy.matchKinds.EXACT;
  }
}

function TermRowActions({
  entry,
  copy,
  onEdit,
  onDelete,
}: {
  readonly entry: ExtendedTermEntryView;
  readonly copy: AdminCopy;
  readonly onEdit: (entry: ExtendedTermEntryView) => void;
  readonly onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="vw-table-actions">
      <Button
        ref={triggerRef}
        aria-label={copy.termActionsAria}
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
        label={copy.termMenuLabel}
        items={[
          { id: "edit", label: copy.editTermItem, onSelect: () => onEdit(entry) },
          { id: "delete", label: copy.deleteTermItem, danger: true, onSelect: () => onDelete(entry.id) },
        ]}
      />
    </div>
  );
}

export function buildTermCsvTemplate(
  listKind: "BLACKLIST" | "WHITELIST",
  categories: readonly TermCategoryView[],
): { readonly filename: string; readonly content: string } {
  const scoped = categories.filter((c) => c.listKind === listKind);
  if (listKind === "WHITELIST") {
    const primaryCat = scoped[0]?.code ?? "friendly";
    return {
      filename: "voxward-whitelist-template.csv",
      content: [
        "term,category,matchKind",
        `Tonight setlist is great,${primaryCat},EXACT`,
        `encore,${primaryCat},CONTAINS`,
      ].join("\n"),
    };
  }
  const primaryCat = scoped[0]?.code ?? "spam";
  const secondaryCat =
    scoped.find((c) => c.code === "sensitive")?.code ?? scoped[1]?.code ?? primaryCat;
  return {
    filename: "voxward-blacklist-template.csv",
    content: [
      "term,category,matchKind",
      `free-nitro-scam,${primaryCat},EXACT`,
      `join-rebate-group,${primaryCat},CONTAINS`,
      `promo[vV]chat?\\d{6},${secondaryCat},REGEX`,
    ].join("\n"),
  };
}

export interface AdminPageProps {
  readonly api?: AdminApi;
}

function AdminSurface({
  channelIdParam,
  api,
}: {
  readonly channelIdParam?: string;
  readonly api?: AdminApi;
}) {
  const { activeChannelId, locale } = useVoxWardShell();
  const channelId = channelIdParam ?? activeChannelId;
  const copy = pickLocale(ADMIN_COPY, locale);
  const adminClient = useMemo(() => api ?? createAdminApi(), [api]);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

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
  const [newTermMatchKind, setNewTermMatchKind] = useState<"EXACT" | "CONTAINS" | "REGEX" | "NORMALIZED">("EXACT");
  const [newTermLanguage, setNewTermLanguage] = useState("und");
  const [newTermAction, setNewTermAction] = useState<"REVIEW" | "BLOCK">("REVIEW");
  const [csvText, setCsvText] = useState("");
  const [csvFileBuffer, setCsvFileBuffer] = useState<ArrayBuffer | null>(null);
  const [csvEncoding, setCsvEncoding] = useState<CsvEncoding>("utf-8");
  const [csvDelimiter, setCsvDelimiter] = useState<CsvDelimiter>(",");
  const [editingEntry, setEditingEntry] = useState<ExtendedTermEntryView | null>(null);

  // Scoring, model, retention state
  const [modelResp, setModelResp] = useState<ModelSettingsResponseView | null>(null);
  const [modelForm, setModelForm] = useState<ModelSettingsView | null>(null);
  const [adminForm, setAdminForm] = useState<AdminSettingsView | null>(null);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

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
        resolve: (c) =>
          error instanceof AdminApiFailure
            ? c.messages.loadFailedCode(error.code)
            : c.messages.loadFailed,
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
      setNotice({ tone: "positive", resolve: (c) => c.messages.catAdded });
    } catch (error) {
      setNotice({
        tone: "danger",
        resolve: (c) =>
          error instanceof AdminApiFailure && error.status === 409
            ? c.messages.catDuplicate
            : error instanceof AdminApiFailure
              ? c.messages.catFailedCode(error.code)
              : c.messages.catFailed,
      });
    } finally {
      setBusy(false);
    }
  };

  const persistEntries = async (
    next: readonly ExtendedTermEntryView[],
    resolveSuccess: (c: AdminCopy) => string,
  ) => {
    setBusy(true);
    setNotice(null);
    try {
      const saved = await adminClient.saveTermEntries(channelId, next);
      setEntries(saved);
      setNotice({ tone: "positive", resolve: resolveSuccess });
    } catch (error) {
      if (error instanceof AdminApiFailure && error.issues && error.issues.length > 0) {
        const first = error.issues[0];
        if (first !== undefined) {
          setNotice({
            tone: "danger",
            resolve: (c) => first.hint ?? c.messages.ruleFailedCode(first.code),
          });
        }
      } else {
        setNotice({
          tone: "danger",
          resolve: (c) =>
            error instanceof AdminApiFailure
              ? c.messages.saveTermFailedCode(error.code)
              : c.messages.saveTermFailed,
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
      language: newTermLanguage,
      ...(activeListKind === "BLACKLIST" ? { action: newTermAction } : {}),
    };
    await persistEntries([item, ...entries], (c) => c.messages.termAdded);
    setNewTermText("");
    setNewTermLanguage("und");
    setNewTermAction("REVIEW");
    setShowAddTermForm(false);
  };

  const handleDownloadCsvTemplate = () => {
    const { filename, content } = buildTermCsvTemplate(activeListKind, categories);
    if (typeof document !== "undefined" && typeof URL.createObjectURL === "function") {
      const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    }
    const kindSnapshot = activeListKind;
    setNotice({
      tone: "positive",
      resolve: (c) => c.messages.csvDownloaded(kindSnapshot, filename),
    });
  };

  const handleCsvFileSelected = async (file: File | null) => {
    if (file === null) return;
    if (typeof file.arrayBuffer === "function") {
      const buffer = await file.arrayBuffer();
      setCsvFileBuffer(buffer);
      setCsvText(decodeCsvBuffer(buffer, csvEncoding));
    } else {
      const text = (await file.text()).replace(/^\uFEFF/, "");
      setCsvFileBuffer(null);
      setCsvText(text);
    }
    setNotice({
      tone: "positive",
      resolve: (c) => c.messages.csvFileLoaded(file.name),
    });
  };

  const handleCsvEncodingChange = (nextEncoding: CsvEncoding) => {
    setCsvEncoding(nextEncoding);
    if (csvFileBuffer !== null) {
      setCsvText(decodeCsvBuffer(csvFileBuffer, nextEncoding));
    }
  };

  const handleCsvImport = async () => {
    const normalized = csvText.replace(/^\uFEFF/, "");
    if (!normalized.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminClient.importTermEntriesCsv(
        channelId,
        activeListKind,
        normalized,
        csvDelimiter,
      );
      setEntries(res.entries);
      setCsvText("");
      setCsvFileBuffer(null);
      setShowCsvImport(false);
      const firstErr = res.errors[0];
      if (firstErr !== undefined) {
        setNotice({
          tone: "warning",
          resolve: (c) => {
            const codeKey = firstErr.code as keyof AdminCopy["csvErrorCodes"] | undefined;
            const localizedMsg =
              codeKey && codeKey in c.csvErrorCodes
                ? c.csvErrorCodes[codeKey]
                : firstErr.message;
            return c.messages.csvPartial(res.imported, res.errors.length, firstErr.line, localizedMsg);
          },
        });
      } else {
        setNotice({
          tone: "positive",
          resolve: (c) => c.messages.csvDone(res.imported),
        });
      }
    } catch (error) {
      setNotice({
        tone: "danger",
        resolve: (c) =>
          error instanceof AdminApiFailure
            ? c.messages.csvFailedCode(error.code)
            : c.messages.csvFailed,
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
      setNotice({ tone: "positive", resolve: (c) => c.messages.modelsSaved });
    } catch (error) {
      setNotice({
        tone: "danger",
        resolve: (c) =>
          error instanceof AdminApiFailure
            ? c.messages.modelsFailedCode(error.code)
            : c.messages.modelsFailed,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAdminSettings = async (resolveOk: (c: AdminCopy) => string) => {
    if (adminForm === null) return;
    setBusy(true);
    setNotice(null);
    try {
      const saved = await adminClient.saveAdminSettings(channelId, adminForm);
      setAdminForm(saved);
      setNotice({ tone: "positive", resolve: resolveOk });
    } catch (error) {
      setNotice({
        tone: "danger",
        resolve: (c) =>
          error instanceof AdminApiFailure
            ? c.messages.policyFailedCode(error.code)
            : c.messages.policyFailed,
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
              { value: "", label: copy.unboundModelOption },
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
              {copy.reasoningLabel}
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
    <nav className="vw-settings-nav" aria-label={copy.navAria}>
      <div className="vw-settings-group-title">{copy.navGroupRules}</div>
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
        {copy.navBlacklist}
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
        {copy.navWhitelist}
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
        {copy.navScoring}
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
        {copy.navRetention}
      </button>
    </nav>
  );

  return (
    <div className="vw-stack-md">
      {notice ? <BannerNotice tone={notice.tone}>{notice.resolve(copy)}</BannerNotice> : null}

      <SettingsLayout
        navigation={localNavigation}
        navigationLabel={copy.settingsNavLabel}
        contentLabel={copy.settingsContentLabel}
      >
        {section === "blacklist" || section === "whitelist" ? (
          <div className="vw-stack-md">
            <section className="vw-panel-card" aria-label={copy.categoriesAria}>
              <div className="vw-row-between">
                <strong>
                  {activeListKind === "BLACKLIST" ? copy.blacklistCatTitle : copy.whitelistCatTitle}
                </strong>
                <Badge tone="neutral">{copy.appendOnlyBadge}</Badge>
              </div>
              <TableShell
                label={copy.catTableLabel}
                columns={[
                  { key: "code", label: copy.colCatCode },
                  { key: "label", label: copy.colCatLabel },
                  { key: "description", label: copy.colCatDesc },
                ]}
                rows={scopedCategories.map((c) => {
                  const formatted = formatBuiltInTermCategory(c, locale);
                  return {
                    code: <span className="vw-mono">{c.code}</span>,
                    label: formatted.label,
                    description: formatted.description || <span className="vw-muted">{copy.noDesc}</span>,
                  };
                })}
                emptyState={<EmptyState title={copy.emptyCatTitle} />}
              />
              <div className="vw-input-action-row">
                <div className="vw-field-col--compact">
                  <label className="vw-field-label" htmlFor="cat-code">
                    {copy.newCatCodeLabel}
                  </label>
                  <Input
                    id="cat-code"
                    value={catCode}
                    onChange={(event) => setCatCode(event.target.value)}
                    placeholder={copy.newCatCodePlaceholder}
                  />
                </div>
                <div className="vw-field-col--compact">
                  <label className="vw-field-label" htmlFor="cat-label">
                    {copy.newCatLabelLabel}
                  </label>
                  <Input
                    id="cat-label"
                    value={catLabel}
                    onChange={(event) => setCatLabel(event.target.value)}
                    placeholder={copy.newCatLabelPlaceholder}
                  />
                </div>
                <div className="vw-field-col">
                  <label className="vw-field-label" htmlFor="cat-desc">
                    {copy.newCatDescLabel}
                  </label>
                  <Input
                    id="cat-desc"
                    value={catDesc}
                    onChange={(event) => setCatDesc(event.target.value)}
                    placeholder={copy.newCatDescPlaceholder}
                  />
                </div>
                <Button
                  variant="secondary"
                  disabled={busy || !catCode.trim() || !catLabel.trim()}
                  onClick={() => void handleAddCategory()}
                >
                  {copy.addCatBtn}
                </Button>
              </div>
            </section>

            <section className="vw-panel-card" aria-label={copy.termsAria}>
              <div className="vw-row-between">
                <strong>
                  {activeListKind === "BLACKLIST"
                    ? copy.blacklistTermsHeading(filteredEntries.length)
                    : copy.whitelistTermsHeading(filteredEntries.length)}
                </strong>
                <div className="vw-row-wrap">
                  <Button
                    size="sm"
                    variant="quiet"
                    data-download-csv-template=""
                    onClick={handleDownloadCsvTemplate}
                  >
                    {copy.downloadTemplateBtn}
                  </Button>
                  <Button
                    size="sm"
                    variant={showCsvImport ? "primary" : "secondary"}
                    onClick={() => {
                      setShowCsvImport((prev) => !prev);
                      setShowAddTermForm(false);
                    }}
                  >
                    {showCsvImport ? copy.closeCsvBtn : copy.csvImportBtn}
                  </Button>
                  <Button
                    size="sm"
                    variant={showAddTermForm ? "secondary" : "primary"}
                    onClick={() => {
                      setShowAddTermForm((prev) => !prev);
                      setShowCsvImport(false);
                    }}
                  >
                    {showAddTermForm ? copy.cancelAddTermBtn : copy.addTermBtn}
                  </Button>
                </div>
              </div>

              <div className="vw-input-action-row">
                <div className="vw-field-col">
                  <label className="vw-field-label" htmlFor="term-search">
                    {copy.searchTermLabel}
                  </label>
                  <SearchInput
                    id="term-search"
                    fill
                    value={termSearch}
                    onChange={(event) => setTermSearch(event.target.value)}
                    placeholder={copy.searchTermPlaceholder}
                  />
                </div>
                <div className="vw-field-col--compact">
                  <label className="vw-field-label" htmlFor="term-cat-filter">
                    {copy.filterCatLabel}
                  </label>
                  <Select
                    id="term-cat-filter"
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    options={[
                      { value: "ALL", label: copy.allCatsOption },
                      ...scopedCategories.map((c) => ({
                        value: c.code,
                        label: formatBuiltInTermCategory(c, locale).label,
                      })),
                    ]}
                  />
                </div>
              </div>

              {showAddTermForm ? (
                <div className="vw-panel-card vw-panel-card--quiet">
                  <strong>{copy.addTermHeading}</strong>
                  <div className="vw-input-action-row">
                    <div className="vw-field-col">
                      <label className="vw-field-label" htmlFor="new-term-text">
                        {copy.newTermContentLabel}
                      </label>
                      <Input
                        id="new-term-text"
                        value={newTermText}
                        onChange={(event) => setNewTermText(event.target.value)}
                        placeholder={
                          newTermMatchKind === "REGEX"
                            ? copy.newTermRegexPlaceholder
                            : copy.newTermPlainPlaceholder
                        }
                      />
                    </div>
                    <div className="vw-field-col--compact">
                      <label className="vw-field-label" htmlFor="new-term-cat">
                        {copy.newTermCatLabel}
                      </label>
                      <Select
                        id="new-term-cat"
                        value={effectiveNewCategory}
                        onChange={(event) => setNewTermCategory(event.target.value)}
                        options={
                          scopedCategories.length > 0
                            ? scopedCategories.map((c) => ({
                                value: c.code,
                                label: formatBuiltInTermCategory(c, locale).label,
                              }))
                            : [{ value: defaultCatForList, label: defaultCatForList }]
                        }
                      />
                    </div>
                    <div className="vw-field-col--compact">
                      <label className="vw-field-label" htmlFor="new-term-kind">
                        {copy.matchKindLabel}
                      </label>
                      <Select
                        id="new-term-kind"
                        value={newTermMatchKind}
                        onChange={(event) =>
                          setNewTermMatchKind(
                            event.target.value as "EXACT" | "CONTAINS" | "REGEX" | "NORMALIZED",
                          )
                        }
                        options={[
                          { value: "EXACT", label: copy.matchKinds.EXACT },
                          { value: "CONTAINS", label: copy.matchKinds.CONTAINS },
                          { value: "NORMALIZED", label: copy.matchKinds.NORMALIZED },
                          { value: "REGEX", label: copy.matchKinds.REGEX },
                        ]}
                      />
                    </div>
                    <div className="vw-field-col--compact">
                      <label className="vw-field-label" htmlFor="new-term-language">
                        {copy.termLanguageLabel}
                      </label>
                      <Select
                        id="new-term-language"
                        value={newTermLanguage}
                        onChange={(event) => setNewTermLanguage(event.target.value)}
                        options={languageOptions(locale, copy.termLanguageAny)}
                      />
                    </div>
                    {activeListKind === "BLACKLIST" ? (
                      <div className="vw-field-col--compact">
                        <label className="vw-field-label" htmlFor="new-term-action">
                          {copy.termActionLabel}
                        </label>
                        <Select
                          id="new-term-action"
                          value={newTermAction}
                          onChange={(event) => setNewTermAction(event.target.value as "REVIEW" | "BLOCK")}
                          options={[
                            { value: "REVIEW", label: copy.termActions.REVIEW },
                            { value: "BLOCK", label: copy.termActions.BLOCK },
                          ]}
                        />
                      </div>
                    ) : null}
                    <Button
                      variant="primary"
                      disabled={busy || !newTermText.trim()}
                      onClick={() => void handleAddTerm()}
                    >
                      {copy.confirmAddTermBtn}
                    </Button>
                  </div>
                  {newTermMatchKind === "REGEX" ? (
                    <span className="vw-caption">{copy.regexNote}</span>
                  ) : null}
                </div>
              ) : null}

              {showCsvImport ? (
                <div className="vw-panel-card vw-panel-card--quiet">
                  <div className="vw-row-between">
                    <strong>{copy.csvHeading}</strong>
                    <div className="vw-row-wrap">
                      <Button size="sm" variant="secondary" onClick={handleDownloadCsvTemplate}>
                        {copy.downloadTemplateBtn}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => csvFileInputRef.current?.click()}
                      >
                        {copy.pickCsvFileBtn}
                      </Button>
                      <input
                        ref={csvFileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        hidden
                        aria-label={copy.csvFileInputAria}
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          event.target.value = "";
                          void handleCsvFileSelected(file);
                        }}
                      />
                    </div>
                  </div>
                  <span className="vw-caption">{copy.csvColumnsHint(defaultCatForList)}</span>
                  <div className="vw-input-action-row">
                    <div className="vw-field-col--compact">
                      <label className="vw-field-label" htmlFor="term-csv-encoding">
                        {copy.csvEncodingLabel}
                      </label>
                      <Select
                        id="term-csv-encoding"
                        value={csvEncoding}
                        onChange={(event) => handleCsvEncodingChange(event.target.value as CsvEncoding)}
                        options={[
                          { value: "utf-8", label: "UTF-8" },
                          { value: "gb18030", label: "GB18030" },
                          { value: "shift_jis", label: "Shift_JIS" },
                          { value: "euc-kr", label: "EUC-KR" },
                        ]}
                      />
                    </div>
                    <div className="vw-field-col--compact">
                      <label className="vw-field-label" htmlFor="term-csv-delimiter">
                        {copy.csvDelimiterLabel}
                      </label>
                      <Select
                        id="term-csv-delimiter"
                        value={csvDelimiter}
                        onChange={(event) => setCsvDelimiter(event.target.value as CsvDelimiter)}
                        options={[
                          { value: ",", label: copy.csvDelimiters.comma },
                          { value: ";", label: copy.csvDelimiters.semicolon },
                          { value: "\t", label: copy.csvDelimiters.tab },
                        ]}
                      />
                    </div>
                  </div>
                  <div className="vw-field-col--wide">
                    <label className="vw-field-label" htmlFor="term-csv-box">
                      {copy.csvRowsLabel}
                    </label>
                    <Textarea
                      id="term-csv-box"
                      rows={4}
                      value={csvText}
                      onChange={(event) => {
                        setCsvFileBuffer(null);
                        setCsvText(event.target.value);
                      }}
                      placeholder={copy.csvPlaceholder(defaultCatForList)}
                    />
                  </div>
                  {csvText.trim()
                    ? (() => {
                        const preview = previewTermCsv(csvText, csvDelimiter, 5);
                        return (
                          <div className="vw-stack-sm">
                            <span className="vw-caption">
                              {copy.csvPreviewHeading(preview.rows.length, preview.totalRows)}
                            </span>
                            {preview.unterminatedQuote ? (
                              <BannerNotice tone="warning">{copy.csvUnterminatedQuote}</BannerNotice>
                            ) : null}
                            <TableShell
                              label={copy.csvPreviewTableLabel}
                              columns={[
                                { key: "term", label: copy.colTerm },
                                { key: "category", label: copy.colCategory },
                                { key: "matchKind", label: copy.colMatchKind },
                                { key: "language", label: copy.colLanguage },
                              ]}
                              rows={preview.rows.map((cols) => ({
                                term: <UntrustedText text={cols[0] ?? ""} />,
                                category: cols[1] ?? defaultCatForList,
                                matchKind: cols[2] ?? "EXACT",
                                language: cols[3] ?? "und",
                              }))}
                              emptyState={<EmptyState title={copy.csvPreviewEmpty} />}
                            />
                          </div>
                        );
                      })()
                    : null}
                  <div className="vw-row-wrap">
                    <Button
                      variant="primary"
                      disabled={busy || !csvText.trim()}
                      onClick={() => void handleCsvImport()}
                    >
                      {copy.validateImportCsvBtn}
                    </Button>
                    <Button variant="quiet" onClick={() => setShowCsvImport(false)}>
                      {copy.cancelBtn}
                    </Button>
                  </div>
                </div>
              ) : null}

              <WordlistTools
                key={channelId}
                api={adminClient}
                channelId={channelId}
                entries={entries}
                copy={copy}
                locale={locale}
                onRestore={setEntries}
              />

              <TableShell
                label={copy.termsTableLabel}
                columns={[
                  { key: "term", label: copy.colTerm },
                  { key: "category", label: copy.colCategory },
                  { key: "matchKind", label: copy.colMatchKind },
                  { key: "language", label: copy.colLanguage },
                  ...(activeListKind === "BLACKLIST" ? [{ key: "action", label: copy.colAction }] : []),
                  { key: "enabled", label: copy.colEnabled },
                  { key: "actions", label: copy.colActions, align: "end" },
                ]}
                rows={filteredEntries.map((entry) => {
                  const matchedCat = categories.find((c) => c.code === entry.categoryCode);
                  return {
                    term: <UntrustedText text={entry.term} />,
                    category: matchedCat
                      ? formatBuiltInTermCategory(matchedCat, locale).label
                      : entry.categoryCode,
                  matchKind: <Badge tone="neutral">{matchKindLabel(entry.matchKind, copy)}</Badge>,
                  language: <Badge tone="neutral">{entry.language ?? "und"}</Badge>,
                  action: (
                    <Badge tone={entry.action === "BLOCK" ? "danger" : "warning"}>
                      {entry.action === "BLOCK" ? copy.termActions.BLOCK : copy.termActions.REVIEW}
                    </Badge>
                  ),
                  enabled: (
                    <Switch
                      label={entry.enabled ? copy.enabledSwitchLabel : copy.disabledSwitchLabel}
                      checked={entry.enabled}
                      onChange={(event) =>
                        void persistEntries(
                          entries.map((item) =>
                            item.id === entry.id
                              ? { ...item, enabled: event.target.checked }
                              : item,
                          ),
                          (c) => c.messages.termToggled,
                        )
                      }
                    />
                  ),
                  actions: (
                    <TermRowActions
                      entry={entry}
                      copy={copy}
                      onEdit={(item) => setEditingEntry(item)}
                      onDelete={(id) =>
                        void persistEntries(
                          entries.filter((item) => item.id !== id),
                          (c) => c.messages.termDeleted,
                        )
                      }
                    />
                  ),
                };
              })}
                emptyState={
                  <EmptyState
                    title={copy.emptyTermsTitle}
                    description={copy.emptyTermsDesc}
                  />
                }
              />
            </section>
          </div>
        ) : section === "scoring" ? (
          <div className="vw-stack-md">
            <section className="vw-panel-card" aria-label={copy.modelsAria}>
              <strong>{copy.modelsHeading}</strong>
              {modelForm !== null ? (
                <>
                  <Switch
                    label={copy.scToggleLabel}
                    description={copy.scToggleDesc}
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
                    copy.modelRealtimeLabel,
                    modelForm.realtimeModeration,
                    (next) => setModelForm({ ...modelForm, realtimeModeration: next }),
                  )}
                  {renderModelPicker(
                    "mod-sc",
                    copy.modelScLabel,
                    modelForm.scTranslation,
                    (next) => setModelForm({ ...modelForm, scTranslation: next }),
                  )}
                  {renderModelPicker(
                    "mod-review",
                    copy.modelReviewLabel,
                    modelForm.review,
                    (next) => setModelForm({ ...modelForm, review: next }),
                  )}
                  <ScLanguageSelects
                    value={modelForm.scLanguages ?? { sourceLanguages: [], targetLanguages: [] }}
                    onChange={(scLanguages) => setModelForm({ ...modelForm, scLanguages })}
                    copy={copy.scLanguages}
                    locale={locale}
                  />
                  <div>
                    <Button
                      variant="primary"
                      loading={busy}
                      onClick={() => void handleSaveModels()}
                    >
                      {copy.saveModelsBtn}
                    </Button>
                  </div>
                </>
              ) : (
                <EmptyState title={copy.loadingModelsTitle} />
              )}
            </section>

            <section className="vw-panel-card" aria-label={copy.scoringAria}>
              <strong>{copy.scoringHeading}</strong>
              {adminForm !== null ? (
                <>
                  <div className="vw-row-wrap">
                    <div className="vw-field-col--compact">
                      <label className="vw-field-label" htmlFor="sc-init">
                        {copy.scoreInitLabel}
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
                        {copy.scoreMinLabel}
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
                        {copy.scoreMaxLabel}
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
                        {copy.scoreRewardLabel}
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
                        {copy.scorePenaltyLabel}
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
                        {copy.queueRtLabel}
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
                        {copy.queueScLabel}
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
                        {copy.queueBatchLabel}
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
                        {copy.queueDeadlineLabel}
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
                      onClick={() => void handleSaveAdminSettings((c) => c.messages.scoringSaved)}
                    >
                      {copy.saveScoringBtn}
                    </Button>
                  </div>
                </>
              ) : (
                <EmptyState title={copy.loadingScoringTitle} />
              )}
            </section>
          </div>
        ) : (
          <section className="vw-panel-card" aria-label={copy.retentionAria}>
            <strong>{copy.retentionHeading}</strong>
            {adminForm !== null ? (
              <>
                <div className="vw-row-wrap">
                  <div className="vw-field-col--compact">
                    <label className="vw-field-label" htmlFor="ret-change">
                      {copy.retChangeLabel}
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
                      {copy.retTechLabel}
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
                      {copy.retEvidenceLabel}
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
                    onClick={() => void handleSaveAdminSettings((c) => c.messages.retentionSaved)}
                  >
                    {copy.saveRetentionBtn}
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState title={copy.loadingRetentionTitle} />
            )}
          </section>
        )}
      </SettingsLayout>

      <Dialog
        open={editingEntry !== null}
        onOpenChange={(open) => {
          if (!open) setEditingEntry(null);
        }}
        title={copy.editDialogTitle}
      >
        {editingEntry !== null ? (
          <div className="vw-stack-md">
            <div className="vw-field-col">
              <label className="vw-field-label" htmlFor="edit-term-input">
                {copy.editTermTextLabel}
              </label>
              <Input
                id="edit-term-input"
                value={editingEntry.term}
                onChange={(e) => setEditingEntry({ ...editingEntry, term: e.target.value })}
              />
            </div>
            <div className="vw-field-col--compact">
              <label className="vw-field-label" htmlFor="edit-term-kind">
                {copy.matchKindLabel}
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
                  { value: "EXACT", label: copy.matchKinds.EXACT },
                  { value: "CONTAINS", label: copy.matchKinds.CONTAINS },
                  { value: "NORMALIZED", label: copy.matchKinds.NORMALIZED },
                  { value: "REGEX", label: copy.matchKinds.REGEX },
                ]}
              />
            </div>
            <div className="vw-field-col--compact">
              <label className="vw-field-label" htmlFor="edit-term-language">
                {copy.termLanguageLabel}
              </label>
              <Select
                id="edit-term-language"
                value={editingEntry.language ?? "und"}
                onChange={(e) => setEditingEntry({ ...editingEntry, language: e.target.value })}
                options={languageOptions(locale, copy.termLanguageAny)}
              />
            </div>
            {editingEntry.listKind === "BLACKLIST" ? (
              <div className="vw-field-col--compact">
                <label className="vw-field-label" htmlFor="edit-term-action">
                  {copy.termActionLabel}
                </label>
                <Select
                  id="edit-term-action"
                  value={editingEntry.action ?? "REVIEW"}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
                      action: e.target.value as "REVIEW" | "BLOCK",
                    })
                  }
                  options={[
                    { value: "REVIEW", label: copy.termActions.REVIEW },
                    { value: "BLOCK", label: copy.termActions.BLOCK },
                  ]}
                />
              </div>
            ) : null}
            <div className="vw-row-wrap">
              <Button
                variant="primary"
                onClick={() => {
                  const saved = editingEntry;
                  setEditingEntry(null);
                  void persistEntries(
                    entries.map((item) => (item.id === saved.id ? saved : item)),
                    (c) => c.messages.termUpdated,
                  );
                }}
              >
                {copy.saveEditBtn}
              </Button>
              <Button variant="quiet" onClick={() => setEditingEntry(null)}>
                {copy.cancelBtn}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

export function AdminPage({ api }: AdminPageProps) {
  const params = useParams();

  return (
    <VoxWardShell
      activeNavId="settings"
      channelId={params.channelId}
      showChannelSelector
      requireAuth
      pageTitle={(locale) => pickLocale(ADMIN_COPY, locale).pageTitle}
      pageDescription={(locale) => pickLocale(ADMIN_COPY, locale).pageDescription}
    >
      <AdminSurface channelIdParam={params.channelId} api={api} />
    </VoxWardShell>
  );
}
