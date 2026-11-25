import { canonicalLanguageTag } from "@voxward/contracts";
import { Input, Select } from "@tcrn/ui-react/approved";
import type { AdminCopy, VoxWardLocale } from "../../i18n";

const COMMON_LANGUAGES = ["en", "fr", "ja", "ko", "zh", "zh-CN", "zh-TW"] as const;
export const DEFAULT_TERM_LANGUAGE = "und";

export function selectedTermLanguage(selection: string, tag: string): string | null {
  const language = canonicalLanguageTag(selection === "other" ? tag.trim() : selection);
  return language === "auto" ? null : language;
}

export function TermLanguageSelect({ copy, locale, selection, tag, onSelect, onTag }: {
  readonly copy: AdminCopy;
  readonly locale: VoxWardLocale;
  readonly selection: string;
  readonly tag: string;
  readonly onSelect: (selection: string) => void;
  readonly onTag: (tag: string) => void;
}) {
  const names = new Intl.DisplayNames(locale, { type: "language" });
  return (
    <>
      <div className="vw-field-col--compact">
        <label className="vw-field-label" htmlFor="new-term-language">{copy.termLanguageLabel}</label>
        <Select id="new-term-language" value={selection} onChange={(event) => onSelect(event.target.value)} options={[
          { value: DEFAULT_TERM_LANGUAGE, label: copy.termLanguageAny },
          ...COMMON_LANGUAGES.map((language) => ({ value: language, label: names.of(language) ?? language })),
          { value: "other", label: copy.termLanguageOther },
        ]} />
      </div>
      {selection === "other" ? (
        <div className="vw-field-col--compact">
          <label className="vw-field-label" htmlFor="new-term-language-tag">{copy.termLanguageTag}</label>
          <Input id="new-term-language-tag" value={tag} maxLength={63} placeholder="pt-BR"
            onChange={(event) => onTag(event.target.value)} />
        </div>
      ) : null}
    </>
  );
}
