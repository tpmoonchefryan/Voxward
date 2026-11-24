import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  Button,
  Divider,
  Heading,
  InlineAlert,
  Input,
  ProductLockup,
  Text,
} from "@tcrn/ui-react/approved";
import {
  createShellPreferencesClient,
  ShellApiError,
  type ShellPreferencesClient,
} from "../../shell/shell-preferences-api";

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

export function LoginPage({ client }: LoginPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const grainFilterId = useId();
  const shellClient = useMemo(() => client ?? createShellPreferencesClient(), [client]);
  const nextTarget = useMemo(() => sanitizeLoginNext(searchParams.get("next")), [searchParams]);

  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

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
    setErrorText(null);
    try {
      await shellClient.login(loginName.trim(), loginPassword);
      setLoginPassword("");
      void navigate(nextTarget, { replace: true });
    } catch (error) {
      if (error instanceof ShellApiError) {
        setErrorText(
          error.code === "INVALID_CREDENTIALS" ? "账号或密码不正确，请重试。" : error.code,
        );
      } else {
        setErrorText("登录请求失败，请检查网络连接。");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="vw-login-page" aria-label="VoxWard 登录页">
      <svg className="vw-login-grain" aria-hidden="true">
        <filter id={grainFilterId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${grainFilterId})`} />
      </svg>

      <div className="vw-login-shell">
        <section className="vw-login-card" aria-label="登录 VoxWard">
          <ProductLockup productId="voxward" scale="lockup" locale="zh-CN" />
          <Divider />

          <div className="vw-stack-sm">
            <Heading level={1} visualLevel={2}>
              登录
            </Heading>
            <Text size="meta">输入操作员账号与密码以继续</Text>
          </div>

          {errorText ? <InlineAlert tone="danger">{errorText}</InlineAlert> : null}

          <form className="vw-stack-md" onSubmit={(event) => void handleSubmit(event)}>
            <div className="vw-field-col">
              <label className="vw-field-label" htmlFor="vw-login-page-name">
                登录账号
              </label>
              <Input
                id="vw-login-page-name"
                value={loginName}
                onChange={(event) => setLoginName(event.target.value)}
                placeholder="输入登录账号"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="vw-field-col">
              <div className="vw-row-between">
                <label className="vw-field-label" htmlFor="vw-login-page-password">
                  密码
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="quiet"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "隐藏" : "显示"}
                </Button>
              </div>
              <Input
                id="vw-login-page-password"
                type={showPassword ? "text" : "password"}
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="输入密码"
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
                确认登录
              </Button>
              <Link to="/" className="vw-login-link">
                返回概览
              </Link>
            </div>
          </form>
        </section>

        <nav className="vw-login-sublinks" aria-label="公开入口">
          <Link to="/sandbox" className="vw-login-link">
            演练沙盒
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/guides" className="vw-login-link">
            接入指南
          </Link>
        </nav>
      </div>
    </main>
  );
}
