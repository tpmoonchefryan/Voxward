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
import { GUIDES_COPY, pickLocale, type GuideMatrixRowText } from "../../i18n";
import { VoxWardShell, useVoxWardShell } from "../../shell";

function supportBadgeInput(entry: GuideMatrixRowText): CopyStateInput {
  switch (entry.status) {
    case "SUPPORTED":
      return { state: "ready", label: entry.statusLabel };
    case "VERIFIED_LOOPBACK":
      return { state: "local_only", label: entry.statusLabel };
    default:
      return { state: "unavailable", label: entry.statusLabel };
  }
}

function GuidesContent() {
  const { activeChannelId, locale } = useVoxWardShell();
  const copy = pickLocale(GUIDES_COPY, locale);
  const [expandedCodes, setExpandedCodes] = useState<readonly string[]>([
    copy.troubleshootingItems[0]?.code ?? "WS_4403",
  ]);

  const toggleCode = (code: string) => {
    setExpandedCodes((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  };

  return (
    <div className="vw-stack-lg">
      <section className="vw-panel-card" aria-label={copy.matrixAria}>
        <strong>{copy.matrixHeading}</strong>
        <TableShell
          label={copy.matrixTableLabel}
          columns={[
            { key: "target", label: copy.colTarget },
            { key: "status", label: copy.colStatus },
            { key: "entry", label: copy.colEntry },
            { key: "summary", label: copy.colSummary },
          ]}
          rows={copy.matrixRows.map((entry) => ({
            target: <strong>{entry.target}</strong>,
            status: <StatusBadge state={supportBadgeInput(entry)} locale={locale} />,
            entry: entry.endpointOrDocs,
            summary: entry.summary,
          }))}
        />
      </section>

      <div className="vw-grid-2">
        <Card>
          <div className="vw-stack-sm">
            <strong>{copy.loopbackTitle}</strong>
            <p className="vw-muted">{copy.loopbackDesc}</p>
            <div className="vw-panel-card vw-panel-card--quiet vw-mono">{copy.loopbackDiagram}</div>
            <span className="vw-caption">{copy.loopbackNote}</span>
          </div>
        </Card>

        <Card>
          <div className="vw-stack-sm">
            <strong>{copy.checklistTitle}</strong>
            <ol>
              {copy.checklistSteps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
            <div className="vw-row-wrap">
              <Link to={`/integrations/${encodeURIComponent(activeChannelId)}`}>
                <Button size="sm" variant="primary">
                  {copy.openIntegrationsBtn}
                </Button>
              </Link>
              <Link to="/sandbox">
                <Button size="sm" variant="secondary">
                  {copy.openSandboxBtn}
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <section className="vw-panel-card" aria-label={copy.troubleshootAria}>
        <strong>{copy.troubleshootHeading}</strong>
        <div className="vw-stack-sm">
          {copy.troubleshootingItems.map((item) => {
            const expanded = expandedCodes.includes(item.code);
            return (
              <article key={item.code} className="vw-ward-line">
                <div className="vw-row-between">
                  <strong>{item.symptom}</strong>
                  <Button size="sm" variant="quiet" onClick={() => toggleCode(item.code)}>
                    {expanded ? copy.collapseStep : copy.expandStep}
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
  );
}

export function GuidesPage() {
  return (
    <VoxWardShell
      activeNavId="guides"
      showChannelSelector={false}
      pageTitle={(locale) => pickLocale(GUIDES_COPY, locale).pageTitle}
      pageDescription={(locale) => pickLocale(GUIDES_COPY, locale).pageDescription}
    >
      <GuidesContent />
    </VoxWardShell>
  );
}
