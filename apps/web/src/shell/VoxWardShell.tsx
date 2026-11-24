import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Button,
  ProductShell,
  Select,
  useProductShellController,
  type PageHeaderBreadcrumb,
  type ShellThemeMode,
} from "@tcrn/ui-react/approved";
import { BannerNotice } from "../components/banner-notice";
import {
  buildVoxWardNavModel,
  DEFAULT_LEFT_PINS,
  DEFAULT_RIGHT_PINS,
  VOXWARD_LOCALES,
  type VoxWardNavId,
} from "./navigation-model";
import {
  createShellPreferencesClient,
  type SessionInfo,
  type ShellChannelSummary,
  type ShellPreferencesClient,
  type VoxWardLocale,
} from "./shell-preferences-api";

export interface VoxWardShellContextValue {
  readonly session: SessionInfo | null;
  readonly sessionLoading: boolean;
  readonly channels: readonly ShellChannelSummary[];
  readonly activeChannelId: string;
  readonly activeChannel: ShellChannelSummary | null;
  readonly locale: VoxWardLocale;
  readonly theme: ShellThemeMode;
  readonly openLoginDialog: () => void;
  readonly reloadSession: () => Promise<void>;
}

const VoxWardShellContext = createContext<VoxWardShellContextValue>({
  session: null,
  sessionLoading: false,
  channels: [],
  activeChannelId: "ch_demo_1",
  activeChannel: null,
  locale: "zh-CN",
  theme: "light",
  openLoginDialog: () => {},
  reloadSession: async () => {},
});

export function useVoxWardShell(): VoxWardShellContextValue {
  return useContext(VoxWardShellContext);
}

export interface VoxWardShellProps {
  readonly activeNavId: VoxWardNavId;
  readonly pageTitle: string;
  readonly pageDescription?: ReactNode;
  readonly pageMeta?: ReactNode;
  readonly pageActions?: ReactNode;
  readonly breadcrumbs?: readonly PageHeaderBreadcrumb[];
  readonly channelId?: string;
  readonly showChannelSelector?: boolean;
  readonly onSelectChannel?: (channelId: string) => void;
  readonly requireAuth?: boolean;
  readonly topBanner?: ReactNode;
  readonly overrideDisabledIds?: Partial<Record<VoxWardNavId, string>>;
  readonly notificationsCount?: number;
  readonly client?: ShellPreferencesClient;
  readonly children: ReactNode;
}

function applyThemeAttribute(theme: ShellThemeMode): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.tcrnTheme = theme;
  }
}

export function VoxWardShell({
  activeNavId,
  pageTitle,
  pageDescription,
  pageMeta,
  pageActions,
  breadcrumbs,
  channelId,
  showChannelSelector = false,
  onSelectChannel,
  requireAuth = false,
  topBanner,
  overrideDisabledIds,
  notificationsCount = 0,
  client,
  children,
}: VoxWardShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const shellClient = useMemo(() => client ?? createShellPreferencesClient(), [client]);
  const loginHref = useMemo(
    () => `/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`,
    [location.pathname, location.search],
  );

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [channels, setChannels] = useState<readonly ShellChannelSummary[]>([]);
  const [rightPins, setRightPins] = useState<readonly string[]>(DEFAULT_RIGHT_PINS);
  const [prefsSeed, setPrefsSeed] = useState<{
    theme?: ShellThemeMode;
    locale?: VoxWardLocale;
    pins?: readonly string[];
  }>({});

  const hydratingRef = useRef(false);
  const sessionRef = useRef<SessionInfo | null>(null);
  sessionRef.current = session;
  const rightPinsRef = useRef<readonly string[]>(rightPins);
  rightPinsRef.current = rightPins;
  const pinsRef = useRef<readonly string[]>(DEFAULT_LEFT_PINS);
  const themeRef = useRef<ShellThemeMode>("light");
  const localeRef = useRef<VoxWardLocale>("zh-CN");

  const persistPreferences = useCallback(
    async (partial: {
      pins?: readonly string[];
      rightPins?: readonly string[];
      theme?: ShellThemeMode;
      locale?: VoxWardLocale;
    }) => {
      if (hydratingRef.current || sessionRef.current === null) {
        return;
      }
      try {
        await shellClient.saveShellPreferences({
          pins: partial.pins ?? pinsRef.current,
          rightPins: partial.rightPins ?? rightPinsRef.current,
          theme: partial.theme ?? themeRef.current,
          locale: partial.locale ?? localeRef.current,
        });
      } catch {
        // Keep current interactive state cleanly even if background preference write fails.
      }
    },
    [shellClient],
  );

  const controller = useProductShellController<VoxWardLocale>({
    initialTheme: "light",
    seasonalThemes: ["halloween"],
    initialLocale: "zh-CN",
    initialPins: DEFAULT_LEFT_PINS,
    requestPreferences: {
      theme: prefsSeed.theme,
      locale: prefsSeed.locale,
      pins: prefsSeed.pins,
    },
    onPinsChange: (nextPins) => {
      pinsRef.current = nextPins;
      void persistPreferences({ pins: nextPins });
    },
    onThemeChange: (nextTheme) => {
      themeRef.current = nextTheme;
      applyThemeAttribute(nextTheme);
      void persistPreferences({ theme: nextTheme });
    },
    onLocaleChange: (nextLocale) => {
      const resolved: VoxWardLocale = nextLocale === "en" ? "en" : "zh-CN";
      localeRef.current = resolved;
      void persistPreferences({ locale: resolved });
    },
  });

  pinsRef.current = controller.pins;
  themeRef.current = controller.theme;
  localeRef.current = controller.locale;

  useEffect(() => {
    applyThemeAttribute(controller.theme);
    if (typeof document !== "undefined") {
      document.documentElement.lang = controller.locale;
    }
  }, [controller.theme, controller.locale]);

  const reloadSession = useCallback(async () => {
    setSessionLoading(true);
    try {
      const currentSession = await shellClient.getSession();
      setSession(currentSession);
      if (currentSession === null) {
        setChannels([]);
        hydratingRef.current = true;
        try {
          setRightPins(DEFAULT_RIGHT_PINS);
          controller.setPins(DEFAULT_LEFT_PINS);
          controller.setTheme("light");
          controller.setLocale("zh-CN");
          applyThemeAttribute("light");
        } finally {
          hydratingRef.current = false;
        }
        return;
      }
      const [loadedChannels, loadedPrefs] = await Promise.all([
        shellClient.listChannels(),
        shellClient.getShellPreferences(),
      ]);
      setChannels(loadedChannels);
      hydratingRef.current = true;
      try {
        const nextLeft =
          loadedPrefs !== null && loadedPrefs.pins.length > 0
            ? loadedPrefs.pins
            : [...DEFAULT_LEFT_PINS];
        const nextRight =
          loadedPrefs?.rightPins !== undefined && loadedPrefs.rightPins.length > 0
            ? loadedPrefs.rightPins
            : [...DEFAULT_RIGHT_PINS];
        const nextTheme = loadedPrefs?.theme ?? "light";
        const nextLocale = loadedPrefs?.locale ?? "zh-CN";
        setPrefsSeed({
          theme: nextTheme,
          locale: nextLocale,
          pins: nextLeft,
        });
        setRightPins(nextRight);
        controller.setPins(nextLeft);
        controller.setTheme(nextTheme);
        controller.setLocale(nextLocale);
        applyThemeAttribute(nextTheme);
      } finally {
        hydratingRef.current = false;
      }
    } finally {
      setSessionLoading(false);
    }
  }, [shellClient]);

  useEffect(() => {
    void reloadSession();
  }, [reloadSession]);

  useEffect(() => {
    if (
      requireAuth &&
      !sessionLoading &&
      session === null &&
      !location.pathname.startsWith("/login") &&
      typeof window !== "undefined"
    ) {
      void navigate(loginHref, { replace: true });
    }
  }, [requireAuth, sessionLoading, session, location.pathname, navigate, loginHref]);

  const resolvedChannelId = channelId ?? channels[0]?.channelId ?? "ch_demo_1";
  const activeChannel =
    channels.find((ch) => ch.channelId === resolvedChannelId) ?? null;

  const navModel = useMemo(
    () =>
      buildVoxWardNavModel({
        locale: controller.locale,
        activeId: activeNavId,
        channelId: resolvedChannelId,
        channel: activeChannel,
        overrideDisabledIds,
      }),
    [controller.locale, activeNavId, resolvedChannelId, activeChannel, overrideDisabledIds],
  );

  const handleRightPinsReorder = useCallback(
    (orderedIds: readonly string[]) => {
      const next = [...orderedIds];
      setRightPins(next);
      rightPinsRef.current = next;
      void persistPreferences({ rightPins: next });
    },
    [persistPreferences],
  );

  const handleChannelChange = useCallback(
    (nextChannelId: string) => {
      if (onSelectChannel !== undefined) {
        onSelectChannel(nextChannelId);
        return;
      }
      const encoded = encodeURIComponent(nextChannelId);
      const routeMap: Partial<Record<VoxWardNavId, string>> = {
        moderation: `/moderation/${encoded}`,
        blocked: `/channels/${encoded}/blocked`,
        data: `/data/${encoded}`,
        logs: `/logs/${encoded}`,
        integrations: `/integrations/${encoded}`,
        users: `/users/${encoded}`,
        settings: `/settings/${encoded}`,
      };
      const target = routeMap[activeNavId];
      if (target !== undefined) {
        void navigate(target);
      }
    },
    [activeNavId, navigate, onSelectChannel],
  );

  const handleLogout = async () => {
    try {
      await shellClient.logout();
    } finally {
      setSession(null);
      setChannels([]);
      hydratingRef.current = true;
      try {
        setRightPins(DEFAULT_RIGHT_PINS);
        controller.setPins(DEFAULT_LEFT_PINS);
        controller.setTheme("light");
        controller.setLocale("zh-CN");
        applyThemeAttribute("light");
      } finally {
        hydratingRef.current = false;
      }
    }
  };

  const handleShellClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (anchor === null || anchor.target === "_blank" || anchor.hasAttribute("download")) {
      return;
    }
    const href = anchor.getAttribute("href");
    if (
      href === null ||
      !href.startsWith("/") ||
      href.startsWith("/auth") ||
      href.startsWith("/api") ||
      href.startsWith("/sandbox-api") ||
      href.startsWith("/output")
    ) {
      return;
    }
    event.preventDefault();
    void navigate(href);
  };

  const zh = controller.locale === "zh-CN";

  const composedPageActions =
    showChannelSelector && channels.length > 0 ? (
      <div className="vw-row-wrap">
        <div className="vw-field-col--compact">
          <Select
            aria-label={zh ? "当前频道" : "Active channel"}
            value={resolvedChannelId}
            onChange={(event) => handleChannelChange(event.target.value)}
            options={channels.map((ch) => ({
              value: ch.channelId,
              label: ch.displayName,
            }))}
          />
        </div>
        {pageActions}
      </div>
    ) : (
      pageActions
    );

  const headerActions = session ? (
    <Button variant="quiet" size="sm" onClick={() => void handleLogout()}>
      {zh ? "退出登录" : "Sign out"}
    </Button>
  ) : (
    <Button variant="primary" size="sm" onClick={() => void navigate(loginHref)}>
      {zh ? "登录账号" : "Sign in"}
    </Button>
  );

  const contextValue: VoxWardShellContextValue = {
    session,
    sessionLoading,
    channels,
    activeChannelId: resolvedChannelId,
    activeChannel,
    locale: controller.locale,
    theme: controller.theme,
    openLoginDialog: () => void navigate(loginHref),
    reloadSession,
  };

  return (
    <VoxWardShellContext.Provider value={contextValue}>
      <div className="vw-shell-host" onClickCapture={handleShellClickCapture}>
        <ProductShell
          productName="VoxWard"
          moduleName={navModel.currentLabel}
          brandProductId="voxward"
          currentRouteLabel={navModel.currentLabel}
          navGroups={navModel.navGroups}
          rightNavGroups={navModel.rightNavGroups}
          rightPinnedIds={rightPins}
          onRightPinsReorder={handleRightPinsReorder}
          topBanner={topBanner}
          locales={VOXWARD_LOCALES}
          seasonalThemes={["halloween"]}
          themeControl="menu"
          pinnedIds={controller.productShellControlProps.pinnedIds}
          onPinnedChange={controller.productShellControlProps.onPinnedChange}
          onPinsReorder={controller.productShellControlProps.onPinsReorder}
          currentTheme={controller.productShellControlProps.currentTheme}
          onThemeChange={controller.productShellControlProps.onThemeChange}
          currentLocale={controller.productShellControlProps.currentLocale}
          onLocaleChange={controller.productShellControlProps.onLocaleChange}
          localeMenuOpen={controller.productShellControlProps.localeMenuOpen}
          onLocaleMenuOpenChange={controller.productShellControlProps.onLocaleMenuOpenChange}
          availableThemes={controller.productShellControlProps.availableThemes}
          localeDefinition={controller.productShellControlProps.localeDefinition}
          onSearchQueryChange={controller.productShellControlProps.onSearchQueryChange}
          searchProvider={controller.productShellControlProps.searchProvider}
          headerActions={headerActions}
          account={
            session
              ? { name: session.displayName }
              : { name: zh ? "未登录" : "Guest", initials: "?" }
          }
          notifications={{ unread: notificationsCount }}
          pageHeader={{
            title: pageTitle,
            description: pageDescription,
            meta: pageMeta,
            breadcrumbs,
            actions: composedPageActions,
          }}
        >
          <div className="vw-content-wrap">
            {requireAuth && !sessionLoading && session === null ? (
              <div className="vw-panel-card">
                <BannerNotice
                  tone="warning"
                  title={zh ? "需要登录会话" : "Session required"}
                  actions={
                    <Button variant="primary" size="sm" onClick={() => void navigate(loginHref)}>
                      {zh ? "立即登录" : "Sign in"}
                    </Button>
                  }
                >
                  {zh
                    ? "请先登录操作员或频道管理员账号，再访问当前工作台内容。"
                    : "Sign in with an operator or channel admin account to continue."}
                </BannerNotice>
              </div>
            ) : (
              children
            )}
          </div>
        </ProductShell>
      </div>
    </VoxWardShellContext.Provider>
  );
}
