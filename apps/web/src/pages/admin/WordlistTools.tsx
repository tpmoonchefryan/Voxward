import { useState } from "react";
import { Button, Input, Select, Textarea } from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import type { VoxWardLocale } from "../../i18n";
import { formatDateTime, formatNumber } from "../../i18n/format";
import type { AdminApi, ExtendedTermEntryView } from "./api";

const copy = {
  "en": ["Wordlist history and preview","Test message","Language tag (optional)","Preview matches","No matching blacklist entries","Load version history","Wordlist version","Restore selected version","Restored as a new version","Wordlist operation failed","Existing wordlist"],
  "zh-CN": ["词表历史与预览","测试消息","语言标签（可选）","预览匹配","没有匹配的黑名单词条","加载版本历史","词表版本","恢复所选版本","已恢复并创建新版本","词表操作失败","原有词表"],
  "ja": ["用語リストの履歴とプレビュー","テストメッセージ","言語タグ（任意）","一致を確認","ブラックリストに一致しません","履歴を読み込む","用語リストのバージョン","選択した版を復元","新しい版として復元しました","用語リストの操作に失敗","既存の用語リスト"],
  "ko": ["단어 목록 기록 및 미리보기","테스트 메시지","언어 태그(선택 사항)","일치 항목 미리보기","일치하는 차단 단어 없음","버전 기록 불러오기","단어 목록 버전","선택한 버전 복원","새 버전으로 복원했습니다","단어 목록 작업 실패","기존 단어 목록"],
  "fr": ["Historique et aperçu du lexique","Message de test","Code de langue (facultatif)","Aperçu des correspondances","Aucun terme bloqué correspondant","Charger l’historique","Version du lexique","Restaurer la version sélectionnée","Restauré dans une nouvelle version","Échec de l’opération sur le lexique","Lexique existant"],
} as const;

export function WordlistTools({ api, channelId, entries, locale, onRestore }: {
  readonly api: AdminApi;
  readonly channelId: string;
  readonly entries: readonly ExtendedTermEntryView[];
  readonly locale: VoxWardLocale;
  readonly onRestore: (entries: readonly ExtendedTermEntryView[]) => void;
}) {
  const labels = copy[locale];
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("");
  const [hits, setHits] = useState<readonly string[] | null>(null);
  const [versions, setVersions] = useState<Awaited<ReturnType<AdminApi["listTermListVersions"]>>>([]);
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

  return (
    <section className="vw-panel-card vw-panel-card--quiet" aria-label={labels[0]}>
      <strong>{labels[0]}</strong>
      <div className="vw-field-col--wide">
        <label className="vw-field-label" htmlFor="wordlist-sample">{labels[1]}</label>
        <Textarea id="wordlist-sample" rows={2} maxLength={500} value={text} onChange={(e) => { setText(e.target.value); setHits(null); }} />
      </div>
      <div className="vw-row-wrap">
        <div className="vw-field-col--compact">
          <label className="vw-field-label" htmlFor="wordlist-language">{labels[2]}</label>
          <Input id="wordlist-language" placeholder="fr" maxLength={63} value={language} onChange={(e) => { setLanguage(e.target.value); setHits(null); }} />
        </div>
        <Button size="sm" variant="secondary" disabled={busy || !text.trim()} onClick={() => void run(async () => {
          setHits((await api.previewTermList(channelId, text, language.trim() || undefined)).hits);
        })}>{labels[3]}</Button>
      </div>
      {hits !== null ? <div aria-live="polite">{hits.length === 0 ? labels[4] : (
        <ul>{entries.filter((entry) => hits.includes(entry.id)).map((entry) => <li key={entry.id}><UntrustedText text={entry.term} /></li>)}</ul>
      )}</div> : null}
      <div className="vw-row-wrap">
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void run(refreshVersions)}>{labels[5]}</Button>
        {versions.length > 0 ? (
          <>
            <div className="vw-field-col--compact">
              <label className="vw-field-label" htmlFor="wordlist-version">{labels[6]}</label>
              <Select id="wordlist-version" value={selected} onChange={(e) => setSelected(e.target.value)} options={versions.map(({ version, createdAt }) => ({
                value: String(version),
                label: createdAt === null ? labels[10] : `#${formatNumber(version, locale)} · ${formatDateTime(createdAt, locale)}`,
              }))} />
            </div>
            <Button size="sm" variant="secondary" disabled={busy || !selected || selected === String(versions[0]?.version)} onClick={() => void run(async () => {
              const restored = await api.restoreTermList(channelId, Number(selected));
              onRestore(restored.entries);
              setHits(null);
              setStatus("restored");
              await refreshVersions();
            })}>{labels[7]}</Button>
          </>
        ) : null}
      </div>
      {status !== null ? <BannerNotice tone={status === "error" ? "danger" : "positive"}>{status === "error" ? labels[9] : labels[8]}</BannerNotice> : null}
    </section>
  );
}
