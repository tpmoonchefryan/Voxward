import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button, Card, InlineAlert, Input } from "@tcrn/ui-react/approved";
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
  const shellClient = useMemo(() => client ?? createShellPreferencesClient(), [client]);
  const nextTarget = useMemo(() => sanitizeLoginNext(searchParams.get("next")), [searchParams]);

  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
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
      <div className="vw-login-card">
        <Card>
          <form className="vw-stack-md" onSubmit={(event) => void handleSubmit(event)}>
            <div className="vw-stack-sm">
              <strong>登录 VoxWard 工作台</strong>
              <span className="vw-muted">请使用操作员或频道管理员账号登录。</span>
            </div>

            {errorText ? <InlineAlert tone="danger">{errorText}</InlineAlert> : null}

            <div className="vw-field-col">
              <label className="vw-field-label" htmlFor="vw-login-page-name">
                登录账号
              </label>
              <Input
                id="vw-login-page-name"
                value={loginName}
                onChange={(event) => setLoginName(event.target.value)}
                placeholder="owner / mod / data"
                autoComplete="username"
              />
            </div>

            <div className="vw-field-col">
              <label className="vw-field-label" htmlFor="vw-login-page-password">
                密码
              </label>
              <Input
                id="vw-login-page-password"
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="vw-row-between">
              <Button
                type="submit"
                variant="primary"
                loading={busy}
                disabled={loginName.trim() === "" || loginPassword === ""}
              >
                确认登录
              </Button>
              <Link to="/" className="vw-caption">
                返回工作台概览
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
