import { UntrustedText } from "../../components/untrusted-text";
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

/** One request per list item. Identifiers are shown as untrusted text, isolated for bidirectional text. */
export function RequestStatus({ requests, canVerify, onVerify }: RequestStatusProps) {
  if (requests.length === 0) return <p>这个主体还没有请求。</p>;
  return (
    <section aria-label="请求状态">
      <h2>请求状态</h2>
      <ul>
        {requests.map((request) => (
          <li key={request.requestId}>
            <p>
              {KIND_LABEL[request.kind] ?? "请求"}
              {request.mode !== null ? `：${MODE_LABEL[request.mode] ?? ""}` : null}
            </p>
            <p>
              编号 <bdi>
                <UntrustedText text={request.requestId} />
              </bdi>
            </p>
            <p>核验：{request.verification.method !== null ? METHOD_LABEL[request.verification.method] : "尚未核验"}</p>
            <p>{STAGE_TEXT[request.stage] ?? "状态未知。"}</p>
            {request.counts.done + request.counts.failed + request.counts.pending > 0 ? (
              <p>
                范围：完成 {request.counts.done}，失败 {request.counts.failed}，待处理 {request.counts.pending}
              </p>
            ) : null}
            {request.targets
              .filter((target) => target.state === "FAILED")
              .map((target, index) => (
                <p key={index}>
                  失败条目：{target.targetKind}（{target.errorCode ?? "未知原因"}）
                </p>
              ))}
            {canVerify && request.stage === "AWAITING_VERIFICATION" ? (
              <div role="group" aria-label="核验">
                <button
                  type="button"
                  onClick={() => onVerify(request.requestId, { verdict: "VERIFIED", method: "ACCOUNT_OWNERSHIP" })}
                >
                  核验通过：确认账号归属
                </button>
                <button
                  type="button"
                  onClick={() => onVerify(request.requestId, { verdict: "VERIFIED", method: "REQUEST_AUTHORIZATION" })}
                >
                  核验通过：确认请求授权
                </button>
                <button type="button" onClick={() => onVerify(request.requestId, { verdict: "REJECTED", method: null })}>
                  拒绝核验
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
