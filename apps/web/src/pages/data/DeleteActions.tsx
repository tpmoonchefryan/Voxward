import type { DeleteMode } from "@voxward/contracts";
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

/**
 * The two deletion entries. Registration only: the page never claims that data is deleted. A user who lacks
 * data.handle never reaches this component, because the panel does not render it for them.
 */
export function DeleteActions({ flow, onChoose, onConfirm, onCancel }: DeleteActionsProps) {
  if (flow.phase === "registered") {
    return (
      <section aria-label="删除请求">
        <p role="status">已登记请求，状态：待核验。尚未删除任何数据。</p>
      </section>
    );
  }
  const busy = flow.phase === "submitting";
  return (
    <section aria-label="删除请求">
      <h2>登记删除请求</h2>
      <p>登记后需要核验，核验通过后才会执行。登记本身不删除任何数据。</p>
      {MODES.map((mode) => (
        <div key={mode}>
          <button type="button" disabled={busy} onClick={() => onChoose(mode)}>
            {MODE_COPY[mode].label}
          </button>
          <p>{MODE_COPY[mode].effect}</p>
        </div>
      ))}
      <p>{MINIMAL_PREFERENCE_NOTE}</p>
      {flow.phase === "confirming" || flow.phase === "submitting" ? (
        <div role="group" aria-label="确认登记">
          <p>将登记：{MODE_COPY[flow.mode].label}</p>
          <button type="button" disabled={busy} onClick={onConfirm}>
            确认登记
          </button>
          <button type="button" disabled={busy} onClick={onCancel}>
            取消
          </button>
          {flow.phase === "confirming" && flow.errorCode !== null ? (
            <p role="alert">{ERROR_TEXT[flow.errorCode] ?? "登记没有完成，请稍后再试。"}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
