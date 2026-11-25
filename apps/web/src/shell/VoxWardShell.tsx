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
  DEFAULT_VOXWARD_LOCALE,
  DEFAULT_VOXWARD_THEME,
  normalizeVoxWardLocale,
  pickLocale,
  SHELL_CHROME_COPY,
} from "../i18n";
import { useVoxWardGuestPrefs } from "./guest-prefs-context";
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

export type LocaleAware<T> = T | ((locale: VoxWardLocale) => T);

function resolveLocaleAware<T>(value: LocaleAware<T>, locale: VoxWardLocale): T {
  return typeof value === "function" ? (value as (loc: VoxWardLocale) => T)(locale) : value;
}

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
  locale: DEFAULT_VOXWARD_LOCALE,
  theme: DEFAULT_VOXWARD_THEME,
  openLoginDialog: () => {},
  reloadSession: async () => {},
});

export function useVoxWardShell(): VoxWardShellContextValue {
  return useContext(VoxWardShellContext);
}

export interface VoxWardShellProps {
  readonly activeNavId: VoxWardNavId;
  readonly pageTitle: LocaleAware<string>;
  readonly pageDescription?: LocaleAware<ReactNode>;
  readonly pageMeta?: LocaleAware<ReactNode>;
  readonly pageActions?: LocaleAware<ReactNode>;
  readonly breadcrumbs?: LocaleAware<readonly PageHeaderBreadcrumb[]>;
  readonly channelId?: string;
  readonly showChannelSelector?: boolean;
  readonly onSelectChannel?: (channelId: string) => void;
  readonly requireAuth?: boolean;
  readonly topBanner?: LocaleAware<ReactNode>;
  readonly overrideDisabledIds?: LocaleAware<Partial<Record<VoxWardNavId, string>>>;
  readonly notificationsCount?: number;
  readonly client?: ShellPreferencesClient;
  readonly children: ReactNode;
}

function applyThemeAttribute(theme: ShellThemeMode): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.tcrnTheme = theme;
  }
}

function isLoginPath(): boolean {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/login");
}

function canApplyShellTheme(requireAuth: boolean, session: SessionInfo | null): boolean {
  if (isLoginPath()) {
    return false;
  }
  if (requireAuth && session === null) {
    return false;
  }
  return true;
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
  const guestPrefs = useVoxWardGuestPrefs();
  const guestPrefsRef = useRef(guestPrefs);
  guestPrefsRef.current = guestPrefs;

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
  }>(() => ({
    theme: guestPrefs.theme,
    locale: guestPrefs.locale,
  }));

  const hydratingRef = useRef(false);
  const mountedRef = useRef(true);
  const requireAuthRef = useRef(requireAuth);
  requireAuthRef.current = requireAuth;
  const pendingHydratedThemeRef = useRef<ShellThemeMode | null>(null);
  const sessionRef = useRef<SessionInfo | null>(null);
  sessionRef.current = session;
  const rightPinsRef = useRef<readonly string[]>(rightPins);
  rightPinsRef.current = rightPins;
  const pinsRef = useRef<readonly string[]>(DEFAULT_LEFT_PINS);
  const themeRef = useRef<ShellThemeMode>(guestPrefs.theme);
  const localeRef = useRef<VoxWardLocale>(guestPrefs.locale);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
    initialTheme: guestPrefs.theme,
    seasonalThemes: ["halloween"],
    initialLocale: guestPrefs.locale,
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
      if (!mountedRef.current) {
        return;
      }
      themeRef.current = nextTheme;
      if (canApplyShellTheme(requireAuthRef.current, sessionRef.current)) {
        applyThemeAttribute(nextTheme);
      }
      if (pendingHydratedThemeRef.current === nextTheme) {
        pendingHydratedThemeRef.current = null;
        return;
      }
      if (sessionRef.current === null) {
        guestPrefsRef.current.setGuestTheme(nextTheme);
      }
      void persistPreferences({ theme: nextTheme });
    },
    onLocaleChange: (nextLocale) => {
      const resolved = normalizeVoxWardLocale(nextLocale);
      localeRef.current = resolved;
      if (sessionRef.current === null) {
        guestPrefsRef.current.setGuestLocale(resolved);
      }
      void persistPreferences({ locale: resolved });
    },
  });

  pinsRef.current = controller.pins;
  themeRef.current = controller.theme;
  localeRef.current = controller.locale;

  useEffect(() => {
    if (location.pathname.startsWith("/login") || !canApplyShellTheme(requireAuth, session)) {
      return;
    }
    applyThemeAttribute(controller.theme);
    if (typeof document !== "undefined") {
      document.documentElement.lang = VOXWARD_LOCALES.find((item) => item.locale === controller.locale)?.lang ?? controller.locale;
    }
  }, [controller.theme, controller.locale, location.pathname, requireAuth, session]);

  const reloadSession = useCallback(async () => {
    setSessionLoading(true);
    try {
      const currentSession = await shellClient.getSession();
      if (!mountedRef.current) {
        return;
      }
      sessionRef.current = currentSession;
      setSession(currentSession);
      if (currentSession === null) {
        setChannels([]);
        hydratingRef.current = true;
        try {
          const guestTheme = guestPrefsRef.current.theme;
          const guestLocale = guestPrefsRef.current.locale;
          setRightPins(DEFAULT_RIGHT_PINS);
          controller.setPins(DEFAULT_LEFT_PINS);
          controller.setLocale(guestLocale);
          if (!requireAuth) {
            if (themeRef.current !== guestTheme) {
              pendingHydratedThemeRef.current = guestTheme;
              controller.setTheme(guestTheme);
            }
            if (canApplyShellTheme(false, null)) {
              applyThemeAttribute(guestTheme);
            }
          }
        } finally {
          hydratingRef.current = false;
        }
        return;
      }
      const [loadedChannels, loadedPrefs] = await Promise.all([
        shellClient.listChannels(),
        shellClient.getShellPreferences(),
      ]);
      if (!mountedRef.current) {
        return;
      }
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
        const nextTheme = loadedPrefs?.theme ?? DEFAULT_VOXWARD_THEME;
        const nextLocale = normalizeVoxWardLocale(loadedPrefs?.locale);
        setPrefsSeed({
          theme: nextTheme,
          locale: nextLocale,
          pins: nextLeft,
        });
        setRightPins(nextRight);
        controller.setPins(nextLeft);
        controller.setLocale(nextLocale);
        if (nextTheme !== themeRef.current) {
          pendingHydratedThemeRef.current = nextTheme;
          controller.setTheme(nextTheme);
        }
        if (canApplyShellTheme(requireAuth, currentSession)) {
          applyThemeAttribute(nextTheme);
        }
      } finally {
        hydratingRef.current = false;
      }
    } finally {
      if (mountedRef.current) {
        setSessionLoading(false);
      }
    }
  }, [shellClient, requireAuth]);

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

  const resolvedOverrideDisabled = resolveLocaleAware(overrideDisabledIds, controller.locale);

  const navModel = useMemo(
    () =>
      buildVoxWardNavModel({
        locale: controller.locale,
        activeId: activeNavId,
        channelId: resolvedChannelId,
        channel: activeChannel,
        overrideDisabledIds: resolvedOverrideDisabled,
      }),
    [controller.locale, activeNavId, resolvedChannelId, activeChannel, resolvedOverrideDisabled],
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
      sessionRef.current = null;
      setSession(null);
      setChannels([]);
      guestPrefsRef.current.resetGuestPrefs();
      hydratingRef.current = true;
      try {
        setRightPins(DEFAULT_RIGHT_PINS);
        controller.setPins(DEFAULT_LEFT_PINS);
        controller.setLocale(DEFAULT_VOXWARD_LOCALE);
        if (!requireAuth) {
          if (themeRef.current !== DEFAULT_VOXWARD_THEME) {
            pendingHydratedThemeRef.current = DEFAULT_VOXWARD_THEME;
            controller.setTheme(DEFAULT_VOXWARD_THEME);
          }
          if (canApplyShellTheme(false, null)) {
            applyThemeAttribute(DEFAULT_VOXWARD_THEME);
          }
        }
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

  const chromeCopy = pickLocale(SHELL_CHROME_COPY, controller.locale);
  const resolvedPageTitle = resolveLocaleAware(pageTitle, controller.locale);
  const resolvedPageDescription = resolveLocaleAware(pageDescription, controller.locale);
  const resolvedPageMeta = resolveLocaleAware(pageMeta, controller.locale);
  const resolvedPageActions = resolveLocaleAware(pageActions, controller.locale);
  const resolvedBreadcrumbs = resolveLocaleAware(breadcrumbs, controller.locale);
  const resolvedTopBanner = resolveLocaleAware(topBanner, controller.locale);

  const composedPageActions =
    showChannelSelector && channels.length > 0 ? (
      <div className="vw-row-wrap">
        <div className="vw-field-col--compact">
          <Select
            aria-label={chromeCopy.activeChannel}
            value={resolvedChannelId}
            onChange={(event) => handleChannelChange(event.target.value)}
            options={channels.map((ch) => ({
              value: ch.channelId,
              label: ch.displayName,
            }))}
          />
        </div>
        {resolvedPageActions}
      </div>
    ) : (
      resolvedPageActions
    );

  const headerActions = session ? (
    <Button variant="quiet" size="sm" onClick={() => void handleLogout()}>
      {chromeCopy.signOut}
    </Button>
  ) : (
    <Button variant="primary" size="sm" onClick={() => void navigate(loginHref)}>
      {chromeCopy.signIn}
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
          topBanner={resolvedTopBanner}
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
              : { name: chromeCopy.guest, initials: "?" }
          }
          notifications={{ unread: notificationsCount }}
          pageHeader={{
            title: resolvedPageTitle,
            description: resolvedPageDescription,
            meta: resolvedPageMeta,
            breadcrumbs: resolvedBreadcrumbs,
            actions: composedPageActions,
          }}
        >
          <div className="vw-content-wrap">
            {requireAuth && !sessionLoading && session === null ? (
              <div className="vw-panel-card">
                <BannerNotice
                  tone="warning"
                  title={chromeCopy.sessionRequiredTitle}
                  actions={
                    <Button variant="primary" size="sm" onClick={() => void navigate(loginHref)}>
                      {chromeCopy.signInNow}
                    </Button>
                  }
                >
                  {chromeCopy.sessionRequiredBody}
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
