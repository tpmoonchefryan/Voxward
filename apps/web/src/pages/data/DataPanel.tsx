import type { DeleteMode } from "@voxward/contracts";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { UntrustedText } from "../../components/untrusted-text";
import { ApiFailure, createDataApi, messageFor, type DataApi, type SubjectPanel, type VerificationInput } from "./api";
import { DeleteActions } from "./DeleteActions";
import { IDLE_FLOW, deleteRequestInput, reduceDeleteFlow, type DeleteFlow, type DeleteFlowEvent } from "./flow";
import { NOTICE_TEXT, RequestStatus } from "./RequestStatus";

const IDENTITY_LABEL: Readonly<Record<string, string>> = {
  CHANNEL_OWNER: "主播",
  MODERATOR: "房管",
  PAID_MEMBER: "付费会员",
  VERIFIED_ACCOUNT: "已验证账号",
  UNKNOWN: "未知",
};

const LIST_LABEL: Readonly<Record<string, string>> = { BLACKLIST: "黑名单", WHITELIST: "白名单" };

const CATEGORY_LABEL: Readonly<Record<string, string>> = {
  TECHNICAL_LOG: "技术日志",
  EVIDENCE: "证据正文",
  CHANGE_LOG: "变更日志",
};

export interface DataPanelViewProps {
  readonly channelId: string;
  /** Null while the capability is being read. False hides every data action. */
  readonly dataHandle: boolean | null;
  readonly query: string;
  readonly subject: SubjectPanel | null;
  readonly flow: DeleteFlow;
  readonly message: string | null;
  readonly onQueryChange: (value: string) => void;
  readonly onLookup: () => void;
  readonly onChoose: (mode: DeleteMode) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly onVerify: (requestId: string, input: VerificationInput) => void;
}

function SubjectSummary({ subject }: { readonly subject: SubjectPanel }) {
  return (
    <section aria-label="主体概况">
      <h2>主体概况</h2>
      <p>
        主体 <bdi>
          <UntrustedText text={subject.subjectRef} />
        </bdi>
      </p>
      <p>当前评分：{subject.currentScore === null ? "无记录" : subject.currentScore}</p>
      <p>身份来源：{subject.identity === null ? "无记录" : (IDENTITY_LABEL[subject.identity.kind] ?? "未知")}</p>
      <p>名单：{subject.list === null ? "无" : LIST_LABEL[subject.list]}</p>
      <p>记分例外：{subject.exception?.active === true ? "有效" : "无"}</p>
      <p>评分记录：{subject.ledgerEntryCount} 条</p>
      <h3>保留的数据</h3>
      <ul>
        {subject.retention.map((item) => (
          <li key={item.category}>
            {CATEGORY_LABEL[item.category] ?? "其他"}：{item.count} 条，保留 {item.retentionDays} 天（自创建起算，到期后删除）
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The panel as a pure view. Without data.handle it shows the refusal and nothing else, so the lookup, the subject, and
 * every deletion or verification action stay out of the page.
 */
export function DataPanelView(props: DataPanelViewProps) {
  const { channelId, dataHandle, query, subject, flow, message } = props;
  return (
    <main>
      <h1>用户数据面板</h1>
      <p>
        频道 <bdi>
          <UntrustedText text={channelId} />
        </bdi>
      </p>
      {dataHandle === null ? <p>正在检查权限…</p> : null}
      {dataHandle === false ? (
        <p role="alert">当前账号没有数据管理权限，无法查看或操作本频道的数据请求。</p>
      ) : null}
      {dataHandle === true ? (
        <>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              props.onLookup();
            }}
          >
            <label>
              主体引用（稳定 ID）
              <input value={query} onChange={(event) => props.onQueryChange(event.target.value)} />
            </label>
            <button type="submit">查询</button>
          </form>
          <p>按稳定 ID 定位主体，不按昵称查找。</p>
          {message !== null ? <p role="alert">{message}</p> : null}
          {subject !== null ? (
            <>
              <SubjectSummary subject={subject} />
              <RequestStatus requests={subject.requests} canVerify onVerify={props.onVerify} />
              <DeleteActions
                flow={flow}
                onChoose={props.onChoose}
                onConfirm={props.onConfirm}
                onCancel={props.onCancel}
              />
              <ul>
                {subject.notices.map((code) => (
                  <li key={code}>{NOTICE_TEXT[code] ?? ""}</li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

function codeOf(error: unknown): string {
  return error instanceof ApiFailure ? error.code : "INTERNAL_ERROR";
}

/** The page: loads the capability, looks a subject up by its stable reference, and drives the deletion flow. */
export function DataPanelPage() {
  const { channelId = "" } = useParams();
  const api = useMemo<DataApi>(() => createDataApi(), []);
  const [dataHandle, setDataHandle] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<SubjectPanel | null>(null);
  const [flow, setFlow] = useState<DeleteFlow>(IDLE_FLOW);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .capabilities(channelId)
      .then((capabilities) => {
        if (active) setDataHandle(capabilities.dataHandle);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setDataHandle(false);
        setMessage(messageFor(error));
      });
    return () => {
      active = false;
    };
  }, [api, channelId]);

  async function refresh(subjectRef: string): Promise<void> {
    try {
      setSubject(await api.subject(channelId, subjectRef));
    } catch (error) {
      setSubject(null);
      setMessage(messageFor(error));
    }
  }

  function dispatch(event: DeleteFlowEvent): void {
    setFlow((state) => reduceDeleteFlow(state, event));
  }

  async function lookup(): Promise<void> {
    const subjectRef = query.trim();
    if (subjectRef === "") {
      setMessage("请输入主体引用。");
      return;
    }
    setMessage(null);
    setFlow(IDLE_FLOW);
    await refresh(subjectRef);
  }

  async function confirm(): Promise<void> {
    if (subject === null || flow.phase !== "confirming") return;
    const input = deleteRequestInput(subject.subjectRef, flow.mode);
    dispatch({ type: "confirm" });
    try {
      const registered = await api.register(channelId, input);
      dispatch({ type: "registered", requestId: registered.requestId });
      await refresh(subject.subjectRef);
    } catch (error) {
      dispatch({ type: "failed", code: codeOf(error) });
    }
  }

  async function verify(requestId: string, input: VerificationInput): Promise<void> {
    if (subject === null) return;
    try {
      await api.decideVerification(channelId, requestId, input);
      await refresh(subject.subjectRef);
    } catch (error) {
      setMessage(messageFor(error));
    }
  }

  return (
    <DataPanelView
      channelId={channelId}
      dataHandle={dataHandle}
      query={query}
      subject={subject}
      flow={flow}
      message={message}
      onQueryChange={setQuery}
      onLookup={() => void lookup()}
      onChoose={(mode) => dispatch({ type: "choose", mode })}
      onConfirm={() => void confirm()}
      onCancel={() => dispatch({ type: "cancel" })}
      onVerify={(requestId, input) => void verify(requestId, input)}
    />
  );
}
