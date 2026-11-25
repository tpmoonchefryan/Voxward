import { parseTermLanguage, SUPPORTED_LANGUAGES, type TermLanguage } from "@voxward/contracts";
import { Select } from "@tcrn/ui-react/approved";
import { ADMIN_COPY, type VoxWardLocale } from "../../i18n";

export const DEFAULT_TERM_LANGUAGE = "und";

export function supportedLanguageOptions(locale: VoxWardLocale) {
  const names = new Intl.DisplayNames(locale, { type: "language", languageDisplay: "standard" });
  return SUPPORTED_LANGUAGES.map((language) => ({
    value: language,
    label: names.of(language === "zh-CN" ? "zh-Hans" : language) ?? language,
  }));
}

export function TermLanguageSelect({ id, label, locale, value, onSelect }: {
  readonly id: string;
  readonly label?: string;
  readonly locale: VoxWardLocale;
  readonly value: TermLanguage;
  readonly onSelect: (language: TermLanguage) => void;
}) {
  const copy = ADMIN_COPY[locale];
  return (
    <div className="vw-field-col--compact">
      <label className="vw-field-label" htmlFor={id}>{label ?? copy.termLanguageLabel}</label>
      <Select id={id} value={value} onChange={(event) => {
        const language = parseTermLanguage(event.target.value);
        if (language !== null) onSelect(language);
      }} options={[
        { value: DEFAULT_TERM_LANGUAGE, label: copy.termLanguageAny },
        ...supportedLanguageOptions(locale),
      ]} />
    </div>
  );
}
