import type { DeleteMode } from "@voxward/contracts";
import { Button, Card, InlineConfirmBar } from "@tcrn/ui-react/approved";
import { BannerNotice } from "../../components/banner-notice";
import { UntrustedText } from "../../components/untrusted-text/UntrustedText";
import { ERROR_TEXT } from "./api";
import type { DeleteFlow } from "./flow";

/** Each option's label and what it does. The text says plainly what registration does and does not change. */
export const MODE_COPY: Readonly<Record<DeleteMode, { readonly label: string; readonly effect: string }>> = {
  DELETE_DATA_ONLY: {
    label: "仅删除数据",
    effect: "删除该主体现有的数据。不新增、也不撤销记分例外；之后的发言仍按现有规则计分。",
  },
  DELETE_AND_EXCEPT: {
    label: "删除并加入记分例外名单",
    effect:
      "删除该主体现有的数据，并在执行时加入记分例外名单：之后不再计分，每条新消息进入审核。登记时尚未生效，执行完成前仍会计分。",
  },
};

export const MINIMAL_PREFERENCE_NOTE =
  "加入名单需要保留一条最小偏好记录：频道范围的主体标记和偏好类型。不保存旧分数或昵称历史。之后的发言仍会进入审核。";

const MODES: readonly DeleteMode[] = ["DELETE_DATA_ONLY", "DELETE_AND_EXCEPT"];

export interface DeleteActionsProps {
  readonly flow: DeleteFlow;
  readonly onChoose: (mode: DeleteMode) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function DeleteActions({ flow, onChoose, onConfirm, onCancel }: DeleteActionsProps) {
  if (flow.phase === "registered") {
    return (
      <section aria-label="删除与数据清理请求" className="vw-stack-md">
        <h2>删除操作</h2>
        <BannerNotice tone="positive">
          已登记请求，状态：待核验。尚未删除任何数据。（编号：
          <bdi>
            <UntrustedText text={flow.requestId} />
          </bdi>
          ）
        </BannerNotice>
      </section>
    );
  }

  return (
    <section aria-label="删除与数据清理请求" className="vw-stack-md">
      <h2>删除操作</h2>
      <p className="vw-caption">登记本身不删除任何数据，需经人工核验后由异步队列执行清理。</p>

      <div className="vw-grid-2">
        {MODES.map((mode) => (
          <Card key={mode}>
            <div className="vw-stack-sm">
              <strong>{MODE_COPY[mode].label}</strong>
              <p className="vw-muted">{MODE_COPY[mode].effect}</p>
              {mode === "DELETE_AND_EXCEPT" ? (
                <p className="vw-caption">{MINIMAL_PREFERENCE_NOTE}</p>
              ) : null}
              <div>
                <Button
                  size="sm"
                  variant={mode === "DELETE_AND_EXCEPT" ? "danger" : "secondary"}
                  disabled={flow.phase === "submitting"}
                  onClick={() => onChoose(mode)}
                >
                  {MODE_COPY[mode].label}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {flow.phase === "confirming" && flow.errorCode !== null ? (
        <BannerNotice tone="danger">
          {ERROR_TEXT[flow.errorCode] ?? `登记失败 (${flow.errorCode})`}
        </BannerNotice>
      ) : null}

      {flow.phase === "confirming" || flow.phase === "submitting" ? (
        <InlineConfirmBar
          open
          tone="danger"
          title={`将登记：${MODE_COPY[flow.mode].label}`}
          message={
            flow.mode === "DELETE_AND_EXCEPT"
              ? MINIMAL_PREFERENCE_NOTE
              : MODE_COPY[flow.mode].effect
          }
          confirmLabel={flow.phase === "submitting" ? "正在登记…" : "确认登记删除请求"}
          cancelLabel="取消"
          disabled={flow.phase === "submitting"}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      ) : null}
    </section>
  );
}
