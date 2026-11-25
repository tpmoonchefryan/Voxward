import { useState } from "react";
import { Button, Select, Textarea } from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import type { AdminCopy, VoxWardLocale } from "../../i18n";
import type { AdminApi, ExtendedTermEntryView, WordlistPreviewView, WordlistVersionView } from "./api";

export const TERM_LANGUAGE_PRESETS = ["en", "zh-Hans", "ja", "ko", "fr"] as const;

export function languageOptions(locale: VoxWardLocale, anyLabel: string) {
  const names = new Intl.DisplayNames(locale, { type: "language", languageDisplay: "standard" });
  return [
    { value: "und", label: anyLabel },
    ...TERM_LANGUAGE_PRESETS.map((tag) => ({ value: tag, label: names.of(tag) ?? tag })),
  ];
}

export function WordlistTools({
  api,
  channelId,
  entries,
  copy,
  locale,
  onRestore,
}: {
  readonly api: AdminApi;
  readonly channelId: string;
  readonly entries: readonly ExtendedTermEntryView[];
  readonly copy: AdminCopy;
  readonly locale: VoxWardLocale;
  readonly onRestore: (entries: readonly ExtendedTermEntryView[]) => void;
}) {
  const t = copy.wordlistTools;
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("und");
  const [preview, setPreview] = useState<WordlistPreviewView | null>(null);
  const [versions, setVersions] = useState<readonly WordlistVersionView[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"error" | "restored" | null>(null);

  async function run(action: () => Promise<void>) {
    setStatus(null);
    setBusy(true);
    try {
      await action();
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  async function refreshVersions() {
    const next = await api.listTermListVersions(channelId);
    setVersions(next);
    setSelected(next[0] === undefined ? "" : String(next[0].version));
  }

  const hitEntries = preview === null ? [] : entries.filter((entry) => preview.hits.includes(entry.id));
  const wlEntries = preview === null ? [] : entries.filter((entry) => preview.whitelistMatches.includes(entry.id));

  return (
    <section className="vw-panel-card vw-panel-card--quiet" aria-label={t.heading}>
      <strong>{t.heading}</strong>
      <div className="vw-field-col--wide">
        <label className="vw-field-label" htmlFor="wordlist-sample">
          {t.sampleLabel}
        </label>
        <Textarea
          id="wordlist-sample"
          rows={2}
          maxLength={500}
          placeholder={t.samplePlaceholder}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreview(null);
          }}
        />
      </div>
      <div className="vw-row-wrap">
        <div className="vw-field-col--compact">
          <label className="vw-field-label" htmlFor="wordlist-language">
            {t.languageLabel}
          </label>
          <Select
            id="wordlist-language"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              setPreview(null);
            }}
            options={languageOptions(locale, copy.termLanguageAny)}
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || !text.trim()}
          onClick={() =>
            void run(async () => {
              setPreview(await api.previewTermList(channelId, text, language === "und" ? undefined : language));
            })
          }
        >
          {t.previewBtn}
        </Button>
      </div>
      {preview !== null ? (
        <div className="vw-stack-sm" aria-live="polite">
          {hitEntries.length === 0 && wlEntries.length === 0 ? (
            <span>{t.noMatches}</span>
          ) : (
            <>
              {hitEntries.length > 0 ? (
                <div>
                  <strong>{t.blacklistHitsHeading}</strong>
                  <ul>
                    {hitEntries.map((entry) => (
                      <li key={entry.id}>
                        <UntrustedText text={entry.term} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {wlEntries.length > 0 ? (
                <div>
                  <strong>{t.whitelistMatchesHeading}</strong>
                  <ul>
                    {wlEntries.map((entry) => (
                      <li key={entry.id}>
                        <UntrustedText text={entry.term} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      <div className="vw-row-wrap">
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void run(refreshVersions)}>
          {t.loadVersionsBtn}
        </Button>
        {versions.length > 0 ? (
          <>
            <div className="vw-field-col--compact">
              <label className="vw-field-label" htmlFor="wordlist-version">
                {t.versionLabel}
              </label>
              <Select
                id="wordlist-version"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                options={versions.map(({ version, createdAt }) => ({
                  value: String(version),
                  label: `#${version} · ${new Date(createdAt).toLocaleString(locale)}`,
                }))}
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || !selected || selected === String(versions[0]?.version)}
              onClick={() =>
                void run(async () => {
                  const restored = await api.restoreTermList(channelId, Number(selected));
                  onRestore(restored.entries);
                  setPreview(null);
                  setStatus("restored");
                  await refreshVersions();
                })
              }
            >
              {t.restoreBtn}
            </Button>
          </>
        ) : null}
      </div>
      {status !== null ? (
        <BannerNotice tone={status === "error" ? "danger" : "positive"}>
          {status === "error" ? t.failedNotice : t.restoredNotice}
        </BannerNotice>
      ) : null}
    </section>
  );
}
