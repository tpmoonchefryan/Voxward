import type { DeleteMode } from "@voxward/contracts";
import { Button, Card, InlineConfirmBar } from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import {
  DATA_COPY,
  DEFAULT_VOXWARD_LOCALE,
  DELETE_ACTIONS_COPY,
  pickLocale,
  type VoxWardLocale,
} from "../../i18n";
import type { DeleteFlow } from "./flow";

export const MODE_COPY = DELETE_ACTIONS_COPY.en.modes;
export const MINIMAL_PREFERENCE_NOTE = DELETE_ACTIONS_COPY.en.minimalPreferenceNote;

const MODES: readonly DeleteMode[] = ["DELETE_DATA_ONLY", "DELETE_AND_EXCEPT"];

export interface DeleteActionsProps {
  readonly flow: DeleteFlow;
  readonly locale?: VoxWardLocale;
  readonly onChoose: (mode: DeleteMode) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function DeleteActions({
  flow,
  locale = DEFAULT_VOXWARD_LOCALE,
  onChoose,
  onConfirm,
  onCancel,
}: DeleteActionsProps) {
  const copy = pickLocale(DELETE_ACTIONS_COPY, locale);
  const errors = pickLocale(DATA_COPY, locale).errors;

  if (flow.phase === "registered") {
    return (
      <section aria-label={copy.sectionAria} className="vw-stack-md">
        <h2>{copy.heading}</h2>
        <BannerNotice tone="positive">
          {copy.registeredPrefix}
          <bdi>
            <UntrustedText text={flow.requestId} />
          </bdi>
          {locale === "zh-CN" || locale === "ja" ? "）" : ")"}
        </BannerNotice>
      </section>
    );
  }

  return (
    <section aria-label={copy.sectionAria} className="vw-stack-md">
      <h2>{copy.heading}</h2>
      <p className="vw-caption">{copy.disclaimer}</p>

      <div className="vw-grid-2">
        {MODES.map((mode) => (
          <Card key={mode}>
            <div className="vw-stack-sm">
              <strong>{copy.modes[mode].label}</strong>
              <p className="vw-muted">{copy.modes[mode].effect}</p>
              {mode === "DELETE_AND_EXCEPT" ? (
                <p className="vw-caption">{copy.minimalPreferenceNote}</p>
              ) : null}
              <div>
                <Button
                  size="sm"
                  variant={mode === "DELETE_AND_EXCEPT" ? "danger" : "secondary"}
                  disabled={flow.phase === "submitting"}
                  onClick={() => onChoose(mode)}
                >
                  {copy.modes[mode].label}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {flow.phase === "confirming" && flow.errorCode !== null ? (
        <BannerNotice tone="danger">
          {errors[flow.errorCode] ?? copy.failedFallback(flow.errorCode)}
        </BannerNotice>
      ) : null}

      {flow.phase === "confirming" || flow.phase === "submitting" ? (
        <InlineConfirmBar
          open
          tone="danger"
          title={`${copy.confirmTitlePrefix}${copy.modes[flow.mode].label}`}
          message={
            flow.mode === "DELETE_AND_EXCEPT"
              ? copy.minimalPreferenceNote
              : copy.modes[flow.mode].effect
          }
          confirmLabel={flow.phase === "submitting" ? copy.submittingLabel : copy.confirmLabel}
          cancelLabel={copy.cancelLabel}
          disabled={flow.phase === "submitting"}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      ) : null}
    </section>
  );
}
