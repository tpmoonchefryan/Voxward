import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Button, Card, StatCard, StatusBadge } from "@tcrn/ui-react/approved";
import type { CopyStateInput } from "@tcrn/ui-copy-state";
import { VoxWardShell, useVoxWardShell } from "../../shell";

type HealthState = "checking" | "normal" | "degraded" | "offline";

function badgeStateFor(health: HealthState): CopyStateInput {
  switch (health) {
    case "normal":
      return { state: "ready", label: "服务健康正常" };
    case "checking":
      return { state: "local_only", label: "正在探测服务" };
    case "degraded":
      return { state: "review_required", label: "依赖组件降级" };
    default:
      return { state: "blocked", label: "服务暂不可达" };
  }
}

export function HomePage() {
  const { activeChannelId } = useVoxWardShell();
  const [health, setHealth] = useState<HealthState>("checking");
  const [checkedAt, setCheckedAt] = useState<string>("");

  const probeHealth = useCallback(async () => {
    setHealth("checking");
    try {
      const response = await fetch("/healthz", {
        method: "GET",
        headers: { accept: "application/json" },
      });
      if (response.ok) {
        const body = (await response.json().catch(() => ({}))) as { status?: string; degraded?: boolean };
        if (body.degraded === true || body.status === "degraded") {
          setHealth("degraded");
        } else {
          setHealth("normal");
        }
      } else {
        setHealth("degraded");
      }
    } catch {
      setHealth("offline");
    } finally {
      setCheckedAt(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => {
    void probeHealth();
  }, [probeHealth]);

  const encodedChannel = encodeURIComponent(activeChannelId);

  const launchers = [
    {
      title: "实时审核工作台",
      desc: "双栏处理待裁决队列、旁路实时流与 AI 候选词入库确认。",
      to: `/moderation/${encodedChannel}`,
    },
    {
      title: "拦截管理与黑名单",
      desc: "评分重判历史拦截（绝不重发投屏），维护人工封禁与平台同步。",
      to: `/channels/${encodedChannel}/blocked`,
    },
    {
      title: "数据合规与清理",
      desc: "依据隐私权限检索观众积分档案、登记及核验清理申请。",
      to: `/data/${encodedChannel}`,
    },
    {
      title: "系统设置",
      desc: "全局外观偏号、词库分类增修、CSV 导入、SC 精翻及计分策略。",
      to: `/settings/${encodedChannel}`,
    },
    {
      title: "系统集成与输出",
      desc: "配置直播平台、AI 模型池并签发 OBS 与桌面插件只读凭据。",
      to: `/integrations/${encodedChannel}`,
    },
    {
      title: "成员与三态权限",
      desc: "配置多角色叠加，实时预览显式拒绝 > 授予 > 未设置的最终权限。",
      to: `/users/${encodedChannel}`,
    },
    {
      title: "日志与集成链路",
      desc: "技术日志、变更日志、HTTP 集成脱敏报文及全链路管线视图。",
      to: `/logs/${encodedChannel}`,
    },
    {
      title: "交互演练沙盒",
      desc: "零风险合成演示环境，支持一键场景与四角色权限验证。",
      to: "/sandbox",
    },
    {
      title: "接入指南与排障",
      desc: "平台支持矩阵、桌面回环拓扑以及常见错误恢复指引。",
      to: "/guides",
    },
  ];

  return (
    <VoxWardShell
      activeNavId="overview"
      showChannelSelector={false}
      pageTitle="VoxWard 总览"
      pageDescription="低打扰直播弹幕过滤、Super Chat 精翻与合规审计工作台。"
      pageActions={
        <Button size="sm" variant="secondary" onClick={() => void probeHealth()}>
          重新检测服务健康
        </Button>
      }
    >
      <div className="vw-stack-lg">
        <div className="vw-grid-3">
          <StatCard
            label="后端核心运行态"
            value={<StatusBadge state={badgeStateFor(health)} locale="zh-CN" />}
            note={checkedAt ? `最近探测：${checkedAt}` : "正在探测"}
            tone={health === "normal" ? "positive" : health === "offline" ? "danger" : "warning"}
          />
          <StatCard
            label="默认活动频道"
            value={activeChannelId}
            note="可在具体业务工作台顶部切换频道"
          />
          <StatCard
            label="纯享投屏窗口"
            value="双输出模式就绪"
            note="透明无头 OBS 投屏 + 双栏主播侧边栏"
            tone="accent"
          />
        </div>

        <section className="vw-stack-sm" aria-label="快捷功能入口">
          <strong>工作台与辅助工具入口</strong>
          <div className="vw-grid-3">
            {launchers.map((card) => (
              <Link key={card.to} to={card.to} className="vw-nav-card-link">
                <Card interactive>
                  <div className="vw-stack-sm">
                    <strong>{card.title}</strong>
                    <span className="vw-muted">{card.desc}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section className="vw-panel-card" aria-label="独立无头播控窗口预览入口">
          <div className="vw-row-between">
            <strong>播控独立展示窗口（新窗口打开）</strong>
            <div className="vw-row-wrap">
              <a href={`/dock/${encodedChannel}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="primary">
                  打开纯享主播侧边栏 ↗
                </Button>
              </a>
              <a
                href={`/overlay/${encodedChannel}?preview=1`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="secondary">
                  预览 OBS 透明投屏舞台 ↗
                </Button>
              </a>
            </div>
          </div>
        </section>
      </div>
    </VoxWardShell>
  );
}
