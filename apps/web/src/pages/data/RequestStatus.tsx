import { Badge, Button, Card, EmptyState, KeyValueList } from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import {
  DEFAULT_VOXWARD_LOCALE,
  pickLocale,
  REQUEST_STATUS_COPY,
  type RequestStatusCopy,
  type VoxWardLocale,
} from "../../i18n";
import type { RequestView, VerificationInput } from "./api";

export const KIND_LABEL = REQUEST_STATUS_COPY.en.kinds;
export const MODE_LABEL = REQUEST_STATUS_COPY.en.modes;
export const METHOD_LABEL = REQUEST_STATUS_COPY.en.methods;
export const STAGE_TEXT = REQUEST_STATUS_COPY.en.stages;

export interface RequestStatusProps {
  readonly requests: readonly RequestView[];
  readonly canVerify: boolean;
  readonly locale?: VoxWardLocale;
  readonly onVerify: (requestId: string, input: VerificationInput) => void;
  readonly onExecute?: (requestId: string) => void;
}

function verificationStateLabel(state: string, copy: RequestStatusCopy): string {
  switch (state) {
    case "VERIFIED":
      return copy.verStates.VERIFIED;
    case "REJECTED":
      return copy.verStates.REJECTED;
    default:
      return copy.verStates.PENDING;
  }
}

export function RequestStatus({
  requests,
  canVerify,
  locale = DEFAULT_VOXWARD_LOCALE,
  onVerify,
  onExecute,
}: RequestStatusProps) {
  const copy = pickLocale(REQUEST_STATUS_COPY, locale);

  if (requests.length === 0) {
    return (
      <section aria-label={copy.sectionAria}>
        <EmptyState title={copy.emptyTitle} />
      </section>
    );
  }

  return (
    <section aria-label={copy.sectionAria} className="vw-stack-md">
      <h2>{copy.heading}</h2>
      <div className="vw-stack-sm">
        {requests.map((request) => (
          <Card key={request.requestId}>
            <div className="vw-stack-sm">
              <div className="vw-row-between">
                <strong>
                  {copy.kinds[request.kind] ?? copy.kindFallback}
                  {request.mode !== null
                    ? `${locale === "zh-CN" || locale === "ja" ? "：" : ": "}${copy.modes[request.mode] ?? ""}`
                    : null}
                </strong>
                <Badge
                  tone={
                    request.verification.state === "VERIFIED"
                      ? "positive"
                      : request.verification.state === "REJECTED"
                        ? "danger"
                        : "warning"
                  }
                >
                  {verificationStateLabel(request.verification.state, copy)}
                </Badge>
              </div>

              <KeyValueList
                items={[
                  {
                    key: "id",
                    label: copy.labelId,
                    value: (
                      <bdi>
                        <UntrustedText text={request.requestId} />
                      </bdi>
                    ),
                  },
                  {
                    key: "stage",
                    label: copy.labelStage,
                    value: copy.stages[request.stage] ?? request.stage,
                  },
                  ...(request.verification.method
                    ? [
                        {
                          key: "method",
                          label: copy.labelMethod,
                          value: copy.methods[request.verification.method] ?? request.verification.method,
                        },
                      ]
                    : []),
                ]}
              />

              {request.targets.length > 0 ? (
                <div className="vw-stack-sm">
                  {request.targets.map((target, idx) => (
                    <div key={`${target.targetKind}-${idx}`} className="vw-row-between">
                      <span>{target.targetKind}</span>
                      <Badge tone={target.state === "FAILED" ? "danger" : "neutral"}>
                        {target.state === "DONE"
                          ? copy.targetDone
                          : target.state === "FAILED"
                            ? copy.targetFailed
                            : copy.targetPending}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : null}

              {request.counts.pending > 0 ? (
                <BannerNotice tone="warning">{copy.pendingBanner(request.counts.pending)}</BannerNotice>
              ) : null}

              {canVerify && request.verification.state === "PENDING" ? (
                <div className="vw-row-wrap">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      onVerify(request.requestId, {
                        verdict: "VERIFIED",
                        method: "ACCOUNT_OWNERSHIP",
                      })
                    }
                  >
                    {copy.verifyOwnership}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      onVerify(request.requestId, {
                        verdict: "VERIFIED",
                        method: "REQUEST_AUTHORIZATION",
                      })
                    }
                  >
                    {copy.verifyAuthorization}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      onVerify(request.requestId, {
                        verdict: "REJECTED",
                        method: "ACCOUNT_OWNERSHIP",
                      })
                    }
                  >
                    {copy.rejectVerify}
                  </Button>
                </div>
              ) : null}

              {canVerify &&
              onExecute !== undefined &&
              (request.stage === "AWAITING_EXECUTION" || request.stage === "PARTIAL_FAILED") ? (
                <div className="vw-row-wrap">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onExecute(request.requestId)}
                  >
                    {copy.executeBtn}
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
