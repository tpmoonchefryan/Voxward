import type {
  ProductShellNavGroup,
  ProductShellNavItem,
  ShellLocaleOption,
} from "@tcrn/ui-react/approved";
import type { ShellChannelSummary, VoxWardLocale } from "./shell-preferences-api";

export type VoxWardNavId =
  | "overview"
  | "moderation"
  | "blocked"
  | "data"
  | "dock"
  | "sandbox"
  | "guides"
  | "logs"
  | "integrations"
  | "users"
  | "settings";

export const DEFAULT_LEFT_PINS: readonly VoxWardNavId[] = [
  "moderation",
  "blocked",
  "data",
  "dock",
];

export const DEFAULT_RIGHT_PINS: readonly VoxWardNavId[] = [
  "logs",
  "integrations",
  "users",
  "settings",
];

export const VOXWARD_LOCALES: readonly ShellLocaleOption[] = [
  { locale: "zh-CN", nativeName: "简体中文", lang: "zh-CN" },
  { locale: "en", nativeName: "English", lang: "en" },
];

export interface BuildNavModelOptions {
  readonly locale: VoxWardLocale;
  readonly activeId: VoxWardNavId;
  readonly channelId: string;
  readonly channel?: ShellChannelSummary | null;
  readonly overrideDisabledIds?: Partial<Record<VoxWardNavId, string>>;
}

export interface BuiltNavModel {
  readonly navGroups: readonly ProductShellNavGroup[];
  readonly rightNavGroups: readonly ProductShellNavGroup[];
  readonly currentLabel: string;
  readonly defaultGroupLabel: string;
}

function hasCapability(channel: ShellChannelSummary | null | undefined, cap: string): boolean {
  if (channel === null || channel === undefined) {
    return false;
  }
  return channel.capabilities.includes(cap);
}

function canViewLogs(channel: ShellChannelSummary | null | undefined): boolean {
  if (channel === null || channel === undefined) {
    return false;
  }
  return channel.logAccess || hasCapability(channel, "logs.view");
}

function canHandleData(channel: ShellChannelSummary | null | undefined): boolean {
  if (channel === null || channel === undefined) {
    return false;
  }
  return channel.dataAdmin || hasCapability(channel, "data.handle");
}

function canManageIntegrations(channel: ShellChannelSummary | null | undefined): boolean {
  if (channel === null || channel === undefined) {
    return false;
  }
  return (
    channel.role === "CHANNEL_OWNER" ||
    hasCapability(channel, "score.config") ||
    hasCapability(channel, "output.manage") ||
    hasCapability(channel, "tokens.manage")
  );
}

function canManageUsers(channel: ShellChannelSummary | null | undefined): boolean {
  if (channel === null || channel === undefined) {
    return false;
  }
  return channel.role === "CHANNEL_OWNER" || hasCapability(channel, "members.manage");
}

function canManageSettings(channel: ShellChannelSummary | null | undefined): boolean {
  if (channel === null || channel === undefined) {
    return false;
  }
  return (
    channel.role === "CHANNEL_OWNER" ||
    hasCapability(channel, "score.config") ||
    hasCapability(channel, "list.edit")
  );
}

export function buildVoxWardNavModel(options: BuildNavModelOptions): BuiltNavModel {
  const { locale, activeId, channelId, channel, overrideDisabledIds = {} } = options;
  const zh = locale === "zh-CN";
  const cid = encodeURIComponent(channelId || "ch_demo_1");

  const labels: Record<VoxWardNavId, string> = {
    overview: zh ? "工作台概览" : "Overview",
    moderation: zh ? "审核后台" : "Moderation",
    blocked: zh ? "拦截管理" : "Blocked",
    data: zh ? "数据导出" : "Data Export",
    dock: zh ? "纯净弹幕姬" : "Pure Danmaku Dock",
    sandbox: zh ? "演练沙盒" : "Sandbox",
    guides: zh ? "接入指南" : "Guides",
    logs: zh ? "日志审计" : "Logs",
    integrations: zh ? "集成管理" : "Integrations",
    users: zh ? "成员权限" : "Users & RBAC",
    settings: zh ? "系统设置" : "Settings",
  };

  const descriptions: Record<VoxWardNavId, string> = {
    overview: zh ? "服务健康检查与快速工作台入口" : "Service health check and quick workspace launcher",
    moderation: zh ? "实时待审队列、AI 候选词确认与直播旁路流" : "Real-time moderation queue and AI candidate review",
    blocked: zh ? "已拦截记录评分重判与本地黑名单管理" : "Confirmed blocked records and channel blocklist",
    data: zh ? "用户记录核查、导出与匿名化删除" : "Data lookup, export, and subject anonymization",
    dock: zh ? "在新窗口打开 YouTube 风格单栏纯净弹幕姬" : "Open headerless single-column YouTube-style dock",
    sandbox: zh ? "预设演示场景与四角色权限演练环境" : "Preset demo scenarios and role-switch sandbox",
    guides: zh ? "平台兼容矩阵、桌面回环拓扑与排障清单" : "Compatibility matrix, loopback topology, and troubleshooting",
    logs: zh ? "技术日志、变更日志与第三方 HTTP 集成日志" : "Technical, change, and integration audit logs",
    integrations: zh ? "直播平台与 AI 提供商适配器及输出凭据" : "Platform/AI adapters and output credentials",
    users: zh ? "频道成员分配与 Deny > Grant > Not Set 权限模型" : "Users and three-state role permissions",
    settings: zh ? "外观、规则词库、计分与数据保留策略" : "Appearance, wordlists, scoring, and retention settings",
  };

  const disabledReasonFor = (
    id: VoxWardNavId,
    allowed: boolean,
    fallbackReason: string,
  ): string | undefined => {
    if (overrideDisabledIds[id] !== undefined) {
      return overrideDisabledIds[id];
    }
    if (channel === undefined || channel === null) {
      return undefined;
    }
    return allowed ? undefined : fallbackReason;
  };

  const makeItem = (
    id: VoxWardNavId,
    href: string,
    iconName: ProductShellNavItem["iconName"],
    align: "start" | "end",
    extra?: {
      external?: boolean;
      disabledReason?: string;
    },
  ): ProductShellNavItem => ({
    id,
    label: labels[id],
    href,
    iconName,
    align,
    selected: activeId === id,
    description: descriptions[id],
    external: extra?.external,
    disabled: extra?.disabledReason !== undefined,
    disabledReason: extra?.disabledReason,
  });

  const leftItems: ProductShellNavItem[] = [
    makeItem("moderation", `/moderation/${cid}`, "shield-check", "start", {
      disabledReason: disabledReasonFor(
        "moderation",
        hasCapability(channel, "queue.read"),
        zh ? "当前账号缺少实时审核权限" : "Missing moderation read permission",
      ),
    }),
    makeItem("blocked", `/channels/${cid}/blocked`, "alert-triangle", "start", {
      disabledReason: disabledReasonFor(
        "blocked",
        hasCapability(channel, "queue.read") ||
          hasCapability(channel, "list.edit") ||
          hasCapability(channel, "review.decide"),
        zh ? "当前账号缺少拦截管理权限" : "Missing blocked records management permission",
      ),
    }),
    makeItem("data", `/data/${cid}`, "database", "start", {
      disabledReason: disabledReasonFor(
        "data",
        canHandleData(channel),
        zh ? "需具备数据合规处理权限" : "Requires data handling permission",
      ),
    }),
    makeItem("dock", `/dock/${cid}`, "external-link", "start", {
      external: true,
    }),
    makeItem("overview", "/", "home", "start"),
    makeItem("sandbox", "/sandbox", "palette", "start"),
    makeItem("guides", "/guides", "book-open", "start"),
  ];

  const rightItems: ProductShellNavItem[] = [
    makeItem("logs", `/logs/${cid}`, "history", "end", {
      disabledReason: disabledReasonFor(
        "logs",
        canViewLogs(channel),
        zh ? "需获授日志审计访问权限" : "Requires log audit access",
      ),
    }),
    makeItem("integrations", `/integrations/${cid}`, "package", "end", {
      disabledReason: disabledReasonFor(
        "integrations",
        canManageIntegrations(channel),
        zh ? "需具备系统集成与输出配置权限" : "Requires integrations permission",
      ),
    }),
    makeItem("users", `/users/${cid}`, "users", "end", {
      disabledReason: disabledReasonFor(
        "users",
        canManageUsers(channel),
        zh ? "需具备成员与权限管理职责" : "Requires member & role management permission",
      ),
    }),
    makeItem("settings", `/settings/${cid}`, "settings", "end", {
      disabledReason: disabledReasonFor(
        "settings",
        canManageSettings(channel),
        zh ? "需具备系统设置与词库维护权限" : "Requires settings permission",
      ),
    }),
  ];

  const navGroups: ProductShellNavGroup[] = [
    {
      id: "workspace-group",
      label: zh ? "直播工作台" : "Workspace",
      description: zh ? "审核、拦截管理、数据合规与现场视图" : "Moderation, blocked records, data, and live views",
      iconName: "layout-grid",
      align: "start",
      selected: leftItems.some((item) => item.selected),
      items: leftItems,
    },
  ];

  const rightNavGroups: ProductShellNavGroup[] = [
    {
      id: "backoffice-group",
      label: zh ? "系统管理" : "Administration",
      description: zh ? "日志审计、适配器集成、成员权限与设置" : "Logs, integrations, RBAC, and settings",
      iconName: "settings",
      align: "end",
      selected: rightItems.some((item) => item.selected),
      items: rightItems,
    },
  ];

  return {
    navGroups,
    rightNavGroups,
    currentLabel: labels[activeId],
    defaultGroupLabel: zh ? "直播工作台" : "Workspace",
  };
}
