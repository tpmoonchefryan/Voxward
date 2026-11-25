import { useState } from "react";
import { canonicalizeContentLanguage, SC_MAX_TARGET_LANGUAGES, type ScLanguagePolicy } from "@voxward/contracts";
import { Badge, Button, Input, Select } from "@tcrn/ui-react/approved";
import type { AdminCopy, VoxWardLocale } from "../../i18n";

const PRESET_LANGUAGE_TAGS = ["en", "zh-Hans", "zh-Hant", "ja", "ko", "fr", "es", "de", "pt-BR"] as const;

function displayLanguageName(tag: string, locale: VoxWardLocale): string {
  try {
    const names = new Intl.DisplayNames(locale, { type: "language", languageDisplay: "standard" });
    return names.of(tag) ?? tag;
  } catch {
    return tag;
  }
}

export function ScLanguageSelects({
  value,
  onChange,
  copy,
  locale,
}: {
  readonly value: ScLanguagePolicy;
  readonly onChange: (next: ScLanguagePolicy) => void;
  readonly copy: AdminCopy["scLanguages"];
  readonly locale: VoxWardLocale;
}) {
  const [selectedPreset, setSelectedPreset] = useState("zh-Hans");
  const [customTag, setCustomTag] = useState("");
  const [tagError, setTagError] = useState(false);

  const addTarget = (raw: string) => {
    const canonical = canonicalizeContentLanguage(raw);
    if (canonical === null || canonical === "und" || canonical === "mixed") {
      setTagError(true);
      return;
    }
    setTagError(false);
    if (value.targetLanguages.includes(canonical) || value.targetLanguages.length >= SC_MAX_TARGET_LANGUAGES) {
      return;
    }
    onChange({
      ...value,
      targetLanguages: [...value.targetLanguages, canonical],
    });
  };

  const removeTarget = (target: string) => {
    onChange({
      ...value,
      targetLanguages: value.targetLanguages.filter((item) => item !== target),
    });
  };

  const toggleSource = (tag: string) => {
    const exists = value.sourceLanguages.includes(tag);
    onChange({
      ...value,
      sourceLanguages: exists
        ? value.sourceLanguages.filter((item) => item !== tag)
        : [...value.sourceLanguages, tag],
    });
  };

  const atTargetLimit = value.targetLanguages.length >= SC_MAX_TARGET_LANGUAGES;

  return (
    <div className="vw-panel-card vw-panel-card--quiet">
      <strong>{copy.heading}</strong>
      <div className="vw-stack-xs">
        <span className="vw-field-label">{copy.sourceLabel}</span>
        <div className="vw-row-wrap">
          {PRESET_LANGUAGE_TAGS.map((tag) => {
            const active = value.sourceLanguages.includes(tag);
            return (
              <Button
                key={tag}
                size="sm"
                variant={active ? "primary" : "secondary"}
                aria-pressed={active}
                onClick={() => toggleSource(tag)}
              >
                {displayLanguageName(tag, locale)}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="vw-stack-xs">
        <span className="vw-field-label">
          {copy.targetLabel} ({value.targetLanguages.length}/{SC_MAX_TARGET_LANGUAGES})
        </span>
        <div className="vw-row-wrap">
          {value.targetLanguages.length === 0 ? (
            <span className="vw-caption">{copy.noTargetsHint}</span>
          ) : (
            value.targetLanguages.map((target) => (
              <Badge key={target} tone="neutral">
                {displayLanguageName(target, locale)} ({target}){" "}
                <Button
                  size="sm"
                  variant="quiet"
                  aria-label={`${copy.removeTargetLabel} ${target}`}
                  onClick={() => removeTarget(target)}
                >
                  ×
                </Button>
              </Badge>
            ))
          )}
        </div>
        <div className="vw-input-action-row">
          <div className="vw-field-col--compact">
            <Select
              aria-label={copy.presetSelectLabel}
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              options={PRESET_LANGUAGE_TAGS.map((tag) => ({
                value: tag,
                label: `${displayLanguageName(tag, locale)} (${tag})`,
              }))}
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={atTargetLimit}
            onClick={() => addTarget(selectedPreset)}
          >
            {copy.addTargetBtn}
          </Button>
          <div className="vw-field-col--compact">
            <Input
              aria-label={copy.customTagLabel}
              value={customTag}
              placeholder="pt-BR"
              onChange={(e) => {
                setCustomTag(e.target.value);
                setTagError(false);
              }}
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={atTargetLimit || !customTag.trim()}
            onClick={() => {
              addTarget(customTag);
              setCustomTag("");
            }}
          >
            {copy.addCustomBtn}
          </Button>
        </div>
        {tagError ? <span className="vw-caption">{copy.invalidTagHint}</span> : null}
      </div>
    </div>
  );
}
