import type {
  ProductShellNavGroup,
  ProductShellNavItem,
} from "@tcrn/ui-react/approved";
import { NAV_COPY, SHELL_LOCALES, pickLocale, type VoxWardLocale } from "../i18n";
import type { ShellChannelSummary } from "./shell-preferences-api";

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

export const VOXWARD_LOCALES = SHELL_LOCALES;

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
  const copy = pickLocale(NAV_COPY, locale);
  const cid = encodeURIComponent(channelId || "ch_demo_1");

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
    label: copy.items[id].label,
    href,
    iconName,
    align,
    selected: activeId === id,
    description: copy.items[id].description,
    external: extra?.external,
    disabled: extra?.disabledReason !== undefined,
    disabledReason: extra?.disabledReason,
  });

  const leftItems: ProductShellNavItem[] = [
    makeItem("moderation", `/moderation/${cid}`, "shield-check", "start", {
      disabledReason: disabledReasonFor(
        "moderation",
        hasCapability(channel, "queue.read"),
        copy.disabledReasons.moderation,
      ),
    }),
    makeItem("blocked", `/channels/${cid}/blocked`, "alert-triangle", "start", {
      disabledReason: disabledReasonFor(
        "blocked",
        hasCapability(channel, "queue.read") ||
          hasCapability(channel, "list.edit") ||
          hasCapability(channel, "review.decide"),
        copy.disabledReasons.blocked,
      ),
    }),
    makeItem("data", `/data/${cid}`, "database", "start", {
      disabledReason: disabledReasonFor(
        "data",
        canHandleData(channel),
        copy.disabledReasons.data,
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
        copy.disabledReasons.logs,
      ),
    }),
    makeItem("integrations", `/integrations/${cid}`, "package", "end", {
      disabledReason: disabledReasonFor(
        "integrations",
        canManageIntegrations(channel),
        copy.disabledReasons.integrations,
      ),
    }),
    makeItem("users", `/users/${cid}`, "users", "end", {
      disabledReason: disabledReasonFor(
        "users",
        canManageUsers(channel),
        copy.disabledReasons.users,
      ),
    }),
    makeItem("settings", `/settings/${cid}`, "settings", "end", {
      disabledReason: disabledReasonFor(
        "settings",
        canManageSettings(channel),
        copy.disabledReasons.settings,
      ),
    }),
  ];

  const navGroups: ProductShellNavGroup[] = [
    {
      id: "workspace-group",
      label: copy.workspaceGroup,
      description: copy.workspaceDescription,
      iconName: "layout-grid",
      align: "start",
      selected: leftItems.some((item) => item.selected),
      items: leftItems,
    },
  ];

  const rightNavGroups: ProductShellNavGroup[] = [
    {
      id: "backoffice-group",
      label: copy.backofficeGroup,
      description: copy.backofficeDescription,
      iconName: "settings",
      align: "end",
      selected: rightItems.some((item) => item.selected),
      items: rightItems,
    },
  ];

  return {
    navGroups,
    rightNavGroups,
    currentLabel: copy.items[activeId].label,
    defaultGroupLabel: copy.workspaceGroup,
  };
}
