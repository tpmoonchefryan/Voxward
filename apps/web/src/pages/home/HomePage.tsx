import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Button, Card, StatCard, StatusBadge } from "@tcrn/ui-react/approved";
import type { CopyStateInput } from "@tcrn/ui-copy-state";
import { HOME_COPY, pickLocale, type HomeCopy } from "../../i18n";
import { VoxWardShell, useVoxWardShell } from "../../shell";

type HealthState = "checking" | "normal" | "degraded" | "offline";

function badgeStateFor(health: HealthState, copy: HomeCopy): CopyStateInput {
  switch (health) {
    case "normal":
      return { state: "ready", label: copy.healthStates.normal };
    case "checking":
      return { state: "local_only", label: copy.healthStates.checking };
    case "degraded":
      return { state: "review_required", label: copy.healthStates.degraded };
    default:
      return { state: "blocked", label: copy.healthStates.offline };
  }
}

function launcherPath(
  key: HomeCopy["launchers"][number]["key"],
  encodedChannel: string,
): string {
  switch (key) {
    case "moderation":
      return `/moderation/${encodedChannel}`;
    case "blocked":
      return `/channels/${encodedChannel}/blocked`;
    case "data":
      return `/data/${encodedChannel}`;
    case "settings":
      return `/settings/${encodedChannel}`;
    case "integrations":
      return `/integrations/${encodedChannel}`;
    case "users":
      return `/users/${encodedChannel}`;
    case "logs":
      return `/logs/${encodedChannel}`;
    case "sandbox":
      return "/sandbox";
    case "guides":
      return "/guides";
  }
}

function HomeContent({
  health,
  checkedAt,
}: {
  readonly health: HealthState;
  readonly checkedAt: string;
}) {
  const { activeChannelId, locale } = useVoxWardShell();
  const copy = pickLocale(HOME_COPY, locale);
  const encodedChannel = encodeURIComponent(activeChannelId);

  return (
    <div className="vw-stack-lg">
      <div className="vw-grid-3">
        <StatCard
          label={copy.backendHealthLabel}
          value={<StatusBadge state={badgeStateFor(health, copy)} locale={locale} />}
          note={checkedAt ? `${copy.lastProbedPrefix}${checkedAt}` : copy.probingNow}
          tone={health === "normal" ? "positive" : health === "offline" ? "danger" : "warning"}
        />
        <StatCard
          label={copy.activeChannelLabel}
          value={activeChannelId}
          note={copy.activeChannelNote}
        />
        <StatCard
          label={copy.stageOutputsLabel}
          value={copy.stageOutputsValue}
          note={copy.stageOutputsNote}
          tone="accent"
        />
      </div>

      <section className="vw-stack-sm" aria-label={copy.quickEntryAria}>
        <strong>{copy.quickEntryHeading}</strong>
        <div className="vw-grid-3">
          {copy.launchers.map((card) => (
            <Link key={card.key} to={launcherPath(card.key, encodedChannel)} className="vw-nav-card-link">
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

      <section className="vw-panel-card" aria-label={copy.dockWindowAria}>
        <div className="vw-row-between">
          <strong>{copy.dockWindowHeading}</strong>
          <div className="vw-row-wrap">
            <a href={`/dock/${encodedChannel}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="primary">
                {copy.openDockBtn}
              </Button>
            </a>
            <a
              href={`/overlay/${encodedChannel}?preview=1`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="secondary">
                {copy.previewObsBtn}
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export function HomePage() {
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

  return (
    <VoxWardShell
      activeNavId="overview"
      showChannelSelector={false}
      pageTitle={(locale) => pickLocale(HOME_COPY, locale).pageTitle}
      pageDescription={(locale) => pickLocale(HOME_COPY, locale).pageDescription}
      pageActions={(locale) => (
        <Button size="sm" variant="secondary" onClick={() => void probeHealth()}>
          {pickLocale(HOME_COPY, locale).recheckHealthBtn}
        </Button>
      )}
    >
      <HomeContent health={health} checkedAt={checkedAt} />
    </VoxWardShell>
  );
}
