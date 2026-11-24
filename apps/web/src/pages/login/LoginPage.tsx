import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  Button,
  Divider,
  Heading,
  Icon,
  InlineAlert,
  Input,
  Menu,
  ProductLockup,
  Text,
} from "@tcrn/ui-react/approved";
import {
  DEFAULT_VOXWARD_LOCALE,
  LOGIN_COPY,
  normalizeVoxWardLocale,
  pickLocale,
  type VoxWardLocale,
} from "../../i18n";
import { VOXWARD_LOCALES } from "../../shell/navigation-model";
import {
  createShellPreferencesClient,
  ShellApiError,
  type ShellPreferencesClient,
} from "../../shell/shell-preferences-api";
import { HalloweenBottomDecor, HalloweenTopGarland } from "./HalloweenDecor";

export function sanitizeLoginNext(rawNext: string | null): string {
  if (
    rawNext === null ||
    !rawNext.startsWith("/") ||
    rawNext.startsWith("//") ||
    rawNext.startsWith("/login")
  ) {
    return "/moderation/ch_demo_1";
  }
  return rawNext;
}

export interface LoginPageProps {
  readonly client?: ShellPreferencesClient;
}

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function LoginPage({ client }: LoginPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const grainFilterId = useId();
  const localeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const shellClient = useMemo(() => client ?? createShellPreferencesClient(), [client]);
  const nextTarget = useMemo(() => sanitizeLoginNext(searchParams.get("next")), [searchParams]);

  // Ephemeral React state scoped to /login; never persisted or synced to account preferences.
  const [loginLocale, setLoginLocale] = useState<VoxWardLocale>(DEFAULT_VOXWARD_LOCALE);
  const [localeMenuOpen, setLocaleMenuOpen] = useState(false);

  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const copy = pickLocale(LOGIN_COPY, loginLocale);
  const currentLocaleOption =
    VOXWARD_LOCALES.find((opt) => opt.locale === loginLocale) ?? VOXWARD_LOCALES[0];

  useIsomorphicLayoutEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    const hadTheme = "tcrnTheme" in root.dataset;
    const previousTheme = root.dataset.tcrnTheme;
    root.dataset.tcrnTheme = "halloween";
    return () => {
      if (hadTheme && previousTheme !== undefined) {
        root.dataset.tcrnTheme = previousTheme;
      } else {
        delete root.dataset.tcrnTheme;
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    void shellClient
      .getSession()
      .then((session) => {
        if (active && session !== null) {
          void navigate(nextTarget, { replace: true });
        }
      })
      .catch(() => {
        // Stay on login form if session lookup fails.
      });
    return () => {
      active = false;
    };
  }, [shellClient, navigate, nextTarget]);

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (loginName.trim() === "" || loginPassword === "" || busy) return;
    setBusy(true);
    setErrorCode(null);
    try {
      await shellClient.login(loginName.trim(), loginPassword);
      setLoginPassword("");
      void navigate(nextTarget, { replace: true });
    } catch (error) {
      if (error instanceof ShellApiError) {
        setErrorCode(error.code);
      } else {
        setErrorCode("NETWORK_ERROR");
      }
    } finally {
      setBusy(false);
    }
  };

  const errorText =
    errorCode === null
      ? null
      : errorCode === "INVALID_CREDENTIALS"
        ? copy.invalidCredentialsError
        : errorCode === "NETWORK_ERROR"
          ? copy.networkError
          : errorCode;

  return (
    <main
      className="vw-login-page"
      data-tcrn-theme="halloween"
      lang={loginLocale}
      aria-label={copy.pageAria}
    >
      <svg className="vw-login-grain" aria-hidden="true">
        <filter id={grainFilterId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${grainFilterId})`} />
      </svg>

      <HalloweenTopGarland />

      <div className="vw-login-topbar">
        <Button
          ref={localeTriggerRef}
          type="button"
          variant="secondary"
          size="sm"
          aria-label={copy.languageButtonAria}
          aria-haspopup="menu"
          aria-expanded={localeMenuOpen}
          data-login-locale-toggle=""
          onClick={() => setLocaleMenuOpen((prev) => !prev)}
        >
          <Icon name="globe-2" size="sm" decorative />
          <span>{currentLocaleOption?.nativeName ?? "English"}</span>
          <Icon name="chevron-down" size="sm" decorative />
        </Button>
        <Menu
          open={localeMenuOpen}
          onOpenChange={setLocaleMenuOpen}
          triggerRef={localeTriggerRef}
          placement="bottom-end"
          label={copy.languageMenuLabel}
          items={VOXWARD_LOCALES.map((opt) => ({
            id: opt.locale,
            label: (
              <span className="vw-login-locale-item">
                <span>{opt.nativeName}</span>
                {opt.locale === loginLocale ? (
                  <span className="vw-login-locale-check">
                    <Icon name="check" size="sm" decorative />
                  </span>
                ) : null}
              </span>
            ),
            onSelect: () => {
              setLoginLocale(normalizeVoxWardLocale(opt.locale));
              setLocaleMenuOpen(false);
            },
          }))}
        />
      </div>

      <div className="vw-login-stage">
        <div className="vw-login-shell">
          <section className="vw-login-card" aria-label={copy.cardAria}>
            <ProductLockup productId="voxward" scale="lockup" locale={loginLocale} />
            <Divider />

            <div className="vw-stack-sm">
              <Heading level={1} visualLevel={2}>
                {copy.heading}
              </Heading>
              <Text size="meta">{copy.subtitle}</Text>
            </div>

            {errorText ? <InlineAlert tone="danger">{errorText}</InlineAlert> : null}

            <form className="vw-stack-md" onSubmit={(event) => void handleSubmit(event)}>
              <div className="vw-field-col">
                <label className="vw-field-label" htmlFor="vw-login-page-name">
                  {copy.accountLabel}
                </label>
                <Input
                  id="vw-login-page-name"
                  value={loginName}
                  onChange={(event) => setLoginName(event.target.value)}
                  placeholder={copy.accountPlaceholder}
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="vw-field-col">
                <div className="vw-row-between">
                  <label className="vw-field-label" htmlFor="vw-login-page-password">
                    {copy.passwordLabel}
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="quiet"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? copy.hidePassword : copy.showPassword}
                  </Button>
                </div>
                <Input
                  id="vw-login-page-password"
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder={copy.passwordPlaceholder}
                  autoComplete="current-password"
                />
              </div>

              <div className="vw-login-actions">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={busy}
                  disabled={loginName.trim() === "" || loginPassword === ""}
                >
                  {copy.submitLabel}
                </Button>
                <Link to="/" className="vw-login-link">
                  {copy.backHome}
                </Link>
              </div>
            </form>
          </section>

          <nav className="vw-login-sublinks" aria-label={copy.publicNavAria}>
            <Link to="/sandbox" className="vw-login-link">
              {copy.sandboxLink}
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/guides" className="vw-login-link">
              {copy.guidesLink}
            </Link>
          </nav>
        </div>
      </div>

      <HalloweenBottomDecor />
    </main>
  );
}
