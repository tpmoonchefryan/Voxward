import { parseSupportedLanguage, SC_MAX_TARGET_LANGUAGES, type ScSourceLanguage, type SupportedLanguage } from "@voxward/contracts";
import { Button, Select } from "@tcrn/ui-react/approved";
import { ADMIN_COPY, type VoxWardLocale } from "../../i18n";
import { supportedLanguageOptions } from "./TermLanguageSelect";

export function moveScTarget(targets: readonly SupportedLanguage[], from: number, to: number): readonly SupportedLanguage[] {
  const target = targets[from];
  if (target === undefined || to < 0 || to >= targets.length) return targets;
  const next = [...targets];
  next.splice(from, 1);
  next.splice(to, 0, target);
  return next;
}

export function ScLanguageSelects({ locale, source, targets, onSource, onTargets }: {
  readonly locale: VoxWardLocale;
  readonly source: ScSourceLanguage;
  readonly targets: readonly SupportedLanguage[];
  readonly onSource: (source: ScSourceLanguage) => void;
  readonly onTargets: (targets: readonly SupportedLanguage[]) => void;
}) {
  const copy = ADMIN_COPY[locale];
  const options = supportedLanguageOptions(locale);
  const available = options.filter(({ value }) => !targets.includes(value));
  const nextTarget = available[0]?.value;
  return (
    <div className="vw-stack-sm">
      <div className="vw-field-col--compact">
        <label className="vw-field-label" htmlFor="sc-source-language">{copy.scSourceLanguage}</label>
        <Select id="sc-source-language" value={source} options={[{ value: "auto", label: copy.scSourceAuto }, ...options]}
          onChange={(event) => {
            const next = event.target.value === "auto" ? "auto" : parseSupportedLanguage(event.target.value);
            if (next !== null) onSource(next);
          }} />
      </div>
      <div role="group" aria-label={copy.scTargetLanguages} aria-describedby="sc-language-help" className="vw-stack-sm">
        <strong>{copy.scTargetLanguages}</strong>
        {targets.map((target, index) => (
          <div key={index} className="vw-row-wrap">
            <div className="vw-field-col--compact">
              <label className="vw-field-label" htmlFor={`sc-target-language-${index}`}>{copy.scTargetItem(index + 1)}</label>
              <Select id={`sc-target-language-${index}`} value={target}
                options={options.filter(({ value }) => value === target || !targets.includes(value))}
                onChange={(event) => {
                  const next = parseSupportedLanguage(event.target.value);
                  if (next !== null && !targets.includes(next)) onTargets(targets.map((item, position) => position === index ? next : item));
                }} />
            </div>
            <Button size="sm" variant="secondary" disabled={index === 0}
              onClick={() => onTargets(moveScTarget(targets, index, index - 1))}>{copy.scTargetUp}</Button>
            <Button size="sm" variant="secondary" disabled={index === targets.length - 1}
              onClick={() => onTargets(moveScTarget(targets, index, index + 1))}>{copy.scTargetDown}</Button>
            <Button size="sm" variant="quiet"
              onClick={() => onTargets(targets.filter((_, position) => position !== index))}>{copy.scTargetRemove}</Button>
          </div>
        ))}
        <div>
          <Button size="sm" variant="secondary" disabled={nextTarget === undefined || targets.length >= SC_MAX_TARGET_LANGUAGES}
            onClick={() => { if (nextTarget !== undefined) onTargets([...targets, nextTarget]); }}>{copy.scTargetAdd}</Button>
        </div>
      </div>
      <p id="sc-language-help">{copy.scLanguageHelp}</p>
    </div>
  );
}
