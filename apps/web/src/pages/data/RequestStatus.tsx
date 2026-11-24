import { Badge, Button, Card, EmptyState, KeyValueList } from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import type { RequestView, VerificationInput } from "./api";

export const KIND_LABEL: Readonly<Record<string, string>> = {
  ACCESS: "访问请求",
  CORRECTION: "更正请求",
  DELETE: "删除请求",
  STOP_SCORING: "停止计分请求",
};

export const MODE_LABEL: Readonly<Record<string, string>> = {
  DELETE_DATA_ONLY: "仅删除数据",
  DELETE_AND_EXCEPT: "删除并加入记分例外名单",
};

export const METHOD_LABEL: Readonly<Record<string, string>> = {
  ACCOUNT_OWNERSHIP: "确认账号归属",
  REQUEST_AUTHORIZATION: "确认请求授权",
};

/** What each stage means for the page. The server sends the stage code only. */
export const STAGE_TEXT: Readonly<Record<string, string>> = {
  AWAITING_VERIFICATION: "待核验，尚未执行。",
  REJECTED: "核验未通过，不会执行。",
  AWAITING_EXECUTION: "已核验，等待执行。本页面不执行删除。",
  NOT_EXECUTED_HERE: "本实例暂不执行此类请求，停留在待处理。",
  EXECUTING: "执行中。",
  COMPLETED: "执行完成。",
  PARTIAL_FAILED: "部分失败，见下列条目。",
  CANCELLED: "已取消，不会执行。",
};

/** The notices the server sends with a subject. Each code maps to one fixed sentence. */
export const NOTICE_TEXT: Readonly<Record<string, string>> = {
  PROVIDER_COPY_NOT_CONTROLLED: "YouTube 原始内容与平台侧副本不由本实例删除，外部处理状态本实例无法查询。",
};

export interface RequestStatusProps {
  readonly requests: readonly RequestView[];
  readonly canVerify: boolean;
  readonly onVerify: (requestId: string, input: VerificationInput) => void;
}

function verificationStateLabel(state: string): string {
  switch (state) {
    case "VERIFIED":
      return "已核验通过";
    case "REJECTED":
      return "核验未通过";
    default:
      return "待核验";
  }
}

export function RequestStatus({ requests, canVerify, onVerify }: RequestStatusProps) {
  if (requests.length === 0) {
    return (
      <section aria-label="请求状态">
        <EmptyState title="这个主体还没有请求。" />
      </section>
    );
  }

  return (
    <section aria-label="请求状态" className="vw-stack-md">
      <h2>请求状态</h2>
      <div className="vw-stack-sm">
        {requests.map((request) => (
          <Card key={request.requestId}>
            <div className="vw-stack-sm">
              <div className="vw-row-between">
                <strong>
                  {KIND_LABEL[request.kind] ?? "请求"}
                  {request.mode !== null ? `：${MODE_LABEL[request.mode] ?? ""}` : null}
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
                  {verificationStateLabel(request.verification.state)}
                </Badge>
              </div>

              <KeyValueList
                items={[
                  {
                    key: "id",
                    label: "编号",
                    value: (
                      <bdi>
                        <UntrustedText text={request.requestId} />
                      </bdi>
                    ),
                  },
                  {
                    key: "stage",
                    label: "当前阶段",
                    value: STAGE_TEXT[request.stage] ?? request.stage,
                  },
                  ...(request.verification.method
                    ? [
                        {
                          key: "method",
                          label: "核验方式",
                          value: METHOD_LABEL[request.verification.method] ?? request.verification.method,
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
                          ? "处理完毕"
                          : target.state === "FAILED"
                            ? "部分失败"
                            : "队列处理中"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : null}

              {request.counts.pending > 0 ? (
                <BannerNotice tone="warning">
                  尚有 {request.counts.pending} 项后台处理任务处于队列中，尚未全部完成清理。
                </BannerNotice>
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
                    核验通过：确认账号归属
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
                    核验通过：确认请求授权
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
                    拒绝核验
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
