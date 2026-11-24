import { useState } from "react";
import { Link } from "react-router";
import {
  Button,
  Card,
  CollapsibleRegion,
  StatusBadge,
  TableShell,
} from "@tcrn/ui-react/approved";
import type { CopyStateInput } from "@tcrn/ui-copy-state";
import { VoxWardShell, useVoxWardShell } from "../../shell";
import { INTEGRATION_SUPPORT_MATRIX, TROUBLESHOOTING_ITEMS, type SupportMatrixEntry } from "./api";

function supportBadgeInput(entry: SupportMatrixEntry): CopyStateInput {
  switch (entry.status) {
    case "SUPPORTED":
      return { state: "ready", label: entry.statusLabel };
    case "VERIFIED_LOOPBACK":
      return { state: "local_only", label: entry.statusLabel };
    default:
      return { state: "unavailable", label: entry.statusLabel };
  }
}

export function GuidesPage() {
  const { activeChannelId } = useVoxWardShell();
  const [expandedCodes, setExpandedCodes] = useState<readonly string[]>([
    TROUBLESHOOTING_ITEMS[0]?.code ?? "WS_4403",
  ]);

  const toggleCode = (code: string) => {
    setExpandedCodes((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  };

  return (
    <VoxWardShell
      activeNavId="guides"
      showChannelSelector={false}
      pageTitle="接入指南"
      pageDescription="查看各直播平台、OBS 投屏源与本机桌面助手支持程度、网络回环拓扑以及常见故障排查步骤。"
    >
      <div className="vw-stack-lg">
        <section className="vw-panel-card" aria-label="集成支持程度矩阵">
          <strong>集成与输出支持矩阵</strong>
          <TableShell
            label="集成兼容性清单"
            columns={[
              { key: "target", label: "对接端 / 协议" },
              { key: "status", label: "支持级别" },
              { key: "entry", label: "管理入口位置" },
              { key: "summary", label: "适用说明" },
            ]}
            rows={INTEGRATION_SUPPORT_MATRIX.map((entry) => ({
              target: <strong>{entry.target}</strong>,
              status: <StatusBadge state={supportBadgeInput(entry)} locale="zh-CN" />,
              entry: entry.endpointOrDocs,
              summary: entry.summary,
            }))}
          />
        </section>

        <div className="vw-grid-2">
          <Card>
            <div className="vw-stack-sm">
              <strong>云端至本机 PC 回环拓扑</strong>
              <p className="vw-muted">
                VoxWard 控制台部署在云端或播控服务器；主播电脑上的桌面输出端通过出站加密长连接凭据接入云端只读队列，再经本地回环地址交付给 OBS 或 blivechat。
              </p>
              <div className="vw-panel-card vw-panel-card--quiet vw-mono">
                YouTube 直播聊天 → VoxWard 审核与精翻服务 → 只读出站隧道 → 本机回环连接器 → OBS 投屏 / blivechat
              </div>
              <span className="vw-caption">
                安全原则：所有下游输出端仅持单向读凭据，不具备写入黑名单或变更系统配置的权力。
              </span>
            </div>
          </Card>

          <Card>
            <div className="vw-stack-sm">
              <strong>开播前 3 步快速自检</strong>
              <ol>
                <li>在「集成管理」配置 YouTube 拉流凭据及 AI 推理服务，并确认测试连接通过。</li>
                <li>在「集成管理 › 下游输出凭据」签发一次性 OBS 令牌或桌面插件连接凭据。</li>
                <li>进入「演练沙盒」验证无头 OBS 投屏与主播纯享侧边栏效果符合预期。</li>
              </ol>
              <div className="vw-row-wrap">
                <Link to={`/integrations/${encodeURIComponent(activeChannelId)}`}>
                  <Button size="sm" variant="primary">
                    前往集成管理签发凭据
                  </Button>
                </Link>
                <Link to="/sandbox">
                  <Button size="sm" variant="secondary">
                    打开演练沙盒
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        <section className="vw-panel-card" aria-label="常见故障排查手风琴">
          <strong>常见问题与排障清单</strong>
          <div className="vw-stack-sm">
            {TROUBLESHOOTING_ITEMS.map((item) => {
              const expanded = expandedCodes.includes(item.code);
              return (
                <article key={item.code} className="vw-ward-line">
                  <div className="vw-row-between">
                    <strong>{item.symptom}</strong>
                    <Button size="sm" variant="quiet" onClick={() => toggleCode(item.code)}>
                      {expanded ? "收起排查步骤" : "展开排查步骤"}
                    </Button>
                  </div>
                  <CollapsibleRegion expanded={expanded}>
                    <p className="vw-muted">{item.resolution}</p>
                  </CollapsibleRegion>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </VoxWardShell>
  );
}
