# VoxWard — Kiroween 2026 Submission Guide

> Track: **Frankenstein** · Entry Type: **Solo (`tpmoonchefryan`)** · License: **Apache-2.0**

VoxWard is a self-hosted livestream danmaku/chat moderation, channel-scoped trust-scoring, and paid-message (Super Chat) translation middleware built for cross-language VTuber broadcasts.

It stitches traditionally separate pieces — live chat ingestion, deterministic content rules, a transactional SQLite trust-score ledger, untrusted-text-isolated AI moderation/translation workers, browser RBAC moderation desks, and read-only OBS / desktop downstream overlays — into a single coherent real-time pipeline.

## 1. Zero-Credential Judge Quickstart (`/sandbox`)

Judges do not need Google Cloud credentials, YouTube OAuth tokens, or external AI API keys. The isolated synthetic sandbox fails closed if real secrets are present and runs completely self-contained:

```bash
pnpm install --frozen-lockfile
pnpm build
node deploy/sandbox/start-sandbox.mjs
```

Then open **`http://127.0.0.1:3100/sandbox`** in your browser.

What to try in the 3-minute walkthrough:

1. **Seasonal Theme & 5-Language Switching**: Opens in **Halloween + English (`en`)** by default. Open the top-right user menu (`?`) to switch seamlessly among `English`, `简体中文`, `日本語`, `한국어`, and `Français`, or compare **Halloween**, **Light**, and **Dark** themes.
2. **Live Danmaku & Super Chat Stream Simulator**: Start/pause chat flow, adjust cadence (`Calm` / `Standard` / `Lively`) and SC intervals, or click **`+ Push SC Now`** to watch pinned top Super Chat countdown timers, bottom-up inline SC cards, and clean pure-dock output.
3. **4-Role Demo RBAC & 6 Preset Scenarios**:
   - Trigger `Normal Chat Scoring`, `Spam & Toxicity Block`, `SC Translation & Tiers`, `Queue Manual Review`, `Delete Data Request`, and `Delete & Score Exception`.
   - Switch between **`Streamer View`**, **`Moderator View`**, **`Data Auditor`**, and **`Stage Visitor`** to observe fail-closed server permission boundaries across the Moderation Desk, Pure Dock, OBS Stage, Data Compliance panel, and Snapshot Log views.

## 2. Frankenstein Architecture

```mermaid
flowchart LR
    YT["YouTube Live Chat v3 / Synthetic Feed"] --> IN["Channel Ingestion & Deduplication"]
    IN --> BASE["Deterministic Rules (Exact / Substring / Normalized / Bounded Regex)"]
    BASE -->|Hard Block| LEDGER["Transactional SQLite WAL Ledger & Review Queue"]
    BASE -->|Allow or Escalate| ROUTE{"Score Threshold / Exception / Paid SC"}
    ROUTE -->|Fast Allow| OUT["Read-Only Output Port (output-native-v1)"]
    ROUTE -->|AI Classify / Translate| AI["Isolated AI Worker (Synthetic / Kiro CLI / OpenAI / Anthropic)"]
    AI -->|Validated JSON Schema Only| LEDGER
    LEDGER -->|ALLOW / WARD_BLOCKED| OUT
    UI["Multi-Operator Web Console (Moderation, Logs, Data Compliance, RBAC, Settings)"] <-->|Session + CSRF + RBAC| LEDGER
    OUT -->|Read-Only WS / SSE| DOCK["Pure Danmaku Dock & Transparent OBS Overlay"]
```

Key stitched boundaries:

- **Downstream Read-Only Purity**: Pure Dock (`/dock/:channelId`) and OBS Overlay (`/overlay/:channelId#cred=vwo_...`) receive only `HELLO`, `DELIVER`, and retraction `WARD_BLOCKED` frames — zero internal trust scores, moderation action buttons, raw user IDs, or management chrome.
- **Untrusted Viewer Text Isolation**: Viewer messages sent to AI use temporary per-task item IDs (never stable YouTube user IDs or OAuth tokens), and web audit logs isolate bidirectional control characters inside `<bdi>` wrappers.
- **Explicit Async Deletion + Scoring Exception**: `DELETE_AND_EXCEPT` enrolls a minimal channel-scoped preference marker so opted-out viewers are never scored again, while transparently clarifying that local deletion does not remove YouTube platform copies.

## 3. How Kiro Powered Development

| Kiro Capability | Repository Location | Role in VoxWard |
| --- | --- | --- |
| **Steering** | [`.kiro/steering/`](../.kiro/steering/) | Nine concise project rules governing design-authority reuse, autonomy, batch execution, unattended commands, and residue cleanup. |
| **Specs** | [`.kiro/specs/`](../.kiro/specs/) | Incremental specification suite (`voxward-core-contracts`, `voxward-s001`–`s016`, `voxward-batch*`, `voxward-frontend-v2`) tracking contracts, evidence, and acceptance gates. |
| **Skills & Local Harness** | [`.kiro/skills/mana-orchestrate/`](../.kiro/skills/mana-orchestrate/), [`.kiro/harness/`](../.kiro/harness/), [`.kiro/README.md`](../.kiro/README.md) | Project-local orchestration skill and `.kiro` harness setup for spec/memory continuity. |
| **Hooks** | [`.kiro/hooks/einzbern.json`](../.kiro/hooks/einzbern.json) | Workspace hook configuration schema (`v1`, cleanly decoupled with zero external credential leakage). |

## 4. Honest Boundaries & Unverified External Scope

Per VoxWard's engineering acceptance standards, this candidate states what has **not** yet been externally validated:

- **Real Kiro CLI Runtime (`VW-S029-KIRO-REAL`)**: Isolated Linux user invocation (`voxward-kiro`), OS-level signal/process cleanup, and live model latency/cost benchmarking (`VOXWARD-SUB-050`) were tested with local/synthetic fakes and await independent external credentials.
- **Platform API Approval**: Production use of YouTube Live Data v3 OAuth credentials and confirmation of channel-scoped trust scoring policies depend on the self-hosting operator's Google Cloud Console project and platform review.
