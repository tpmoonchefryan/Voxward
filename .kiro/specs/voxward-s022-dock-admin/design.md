<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:7fca6e51424bb603b416c643 revision=4 sha256=eb560713cbf608f0286eaf1b5fab6833bb230d37d62d229ca4a0cce4162b070f -->

This file records design-source availability. It does not establish a new design authority or claim publication/build evidence.

Resolution: unconfigured.

No design authority is configured for the resolved work context. No authority was inferred.

## Effective design context

`design.authority`: not configured.

> {"status":"unconfigured","targets":[{"authoritySetting":null,"design":null,"reason":"coordination-is-not-development","reference":{"libraryId":"workspace:7732a51de4c38afb83bb77cf","projectId":"project:f824c7861e6888255132af42"},"status":"unconfigured"}]}

## Cited decisions

### minutes:92f6353f4d2e04aa552ea04e

#### D1

> Owner 原话：“同意，开Voxward新链，然后落INIT-001”。据此在现有共享总库 workspace:7732a51de4c38afb83bb77cf 中建立独立 VoxWard 产品项目 project:f824c7861e6888255132af42（externalKey VOXWARD，无父项目），绑定已经迁移的服务器 Voxward 仓库；复用现有同步和服务器工作方式，不新建或复制第二套治理库，不搬移或重开既有历史。实际记录者为 agent:codex。

#### D2

> 采用 VoxWard 仓库相对路径 docs/proposal/y3_project_proposal.md 的 2026-11-09 对话决策整合版作为 INIT-001 产品基线，SHA-256 cad909c1f8e839bfef64b5e2b7ba0569059cef953e4e652d8dda734750a133ee。完整继承 Middleware 定位、频道评分核心、平台直接输入、远端自托管与浏览器多人协作、统一裁决、Kiro/Crew 可替换适配器、SQLite、一次性 AI 会话与校验后 JSON、两种删除选项及记分例外、Change Log/Technical Log 和 correlationId 关联查看器、自有 OBS 路径及版本化指引；只参加 Frankenstein 主赛道，不申请附加奖项。旧稿冲突设计不恢复。

#### D3

> 创建 VOXWARD-INIT-001，状态 planned，承载完整 MVP 的目标、来源、需求、范围、验收、后续拆分方向及未决依赖。本次执行范围是新链与 Initiative 落单，不据此宣称已开发、验收、部署或提交，也不批量创建或启动 Epic/Story。YouTube 逐观众评分用途与保存期限、自托管审核覆盖、Cloud/隐私/申请材料、第三方兼容性、Kiro/Crew 清理和模型性能继续按 proposal 记为未确认或待验证；无真实许可证据时使用明确标识的合成演示，保留评分实现目标。

### minutes:a791ac5683fc0b966d851c2f

#### D1

> Owner 原话：“拆Epic+Story”。本次在 VoxWard 已有 INIT-001 下继续拆分 Epic 与 Story，沿用 2026-11-09 proposal 及 VW-R-001 至 VW-R-022 的有效版本，不重新立项、不替换或删除已定产品需求。前次开链记录描述前次执行范围，本次指令明确授权后续拆单。

#### D2

> 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。

#### D3

> 补齐 INIT→Epic→Story 的版本化需求、实施/验证责任与验收引用；Story 的自测材料不冒充独立验收，跨模块验证由验证交付 Epic 承接，材料审查在对应政策/参赛 Story 内明确。所有新增工单及 INIT 保持 planned；验收证据留空，不记录实现或验收已通过。本次可通过原生引擎更新 INIT 的拆分说明和责任分配，保留原文来源与决策历史；不据此发起产品开发、真实平台操作、公开发布或参赛提交。

### minutes:be2ce03bcd6fda69f1db9839

#### D2

> 据 D1 授权，在每个 Story 的内容中写入需求分配：Story 的每条 required 需求分配给其每张直属 Subtask，各一条 implementation 与一条 verification 责任。实施子代理只做最小自测；独立验收与跨模块验证仍按 Subtask verificationOwner 与 EPIC-006 验证 Story 执行。Story 的需求、来源、约束与验收文本不变，仅新增分配。
<!-- EINZBERN-SPEC:MANAGED-END -->


## S022 Architecture & Implementation Design

### 1. Module Boundaries & Dependency Direction
- All server modules (`apps/server/src/modules/*`) remain decoupled and only import `@voxward/contracts` and their own files (`scripts/check-deps.mjs`).
- `apps/server/src/auth/*` handles HTTP authentication (session cookie + CSRF for unsafe methods), channel-scoped RBAC (`authorizeChannel` using server-derived `:channelId` from route params and active membership in `channel_members`, never trusting client `roomId` over route/membership), and delegates to route handlers injected from `app.ts`.
- `apps/server/src/db/*` handles SQLite persistence via short synchronous transactions (`runShortTransaction`).
- `apps/server/src/app.ts` wires `ModuleRegistry`, `VoxwardDatabase`, and Fastify route plugins.

### 2. Required Fixes & Data Model

#### 2.1 Q34 — `channel_members.data_admin` & Migration `0007`
- Add `dataAdmin: integer("data_admin").notNull().default(0)` with `check("ck_channel_members_data_admin", flag("data_admin"))` to `channelMembers` in `apps/server/src/db/schema/channels.ts`.
- Generate Drizzle migration `0007` via `pnpm --filter @voxward/server db:generate` (`ALTER TABLE channel_members ADD data_admin integer DEFAULT 0 NOT NULL` + CHECK constraint).
- Update `docs/data-dictionary.md`, `apps/server/test/db/schema.test.ts`, and `apps/server/test/db/constraints.test.ts`.
- In `apps/server/src/auth/permissions.ts`: keep `ROLE_CAPABILITIES` unchanged so `CHANNEL_OWNER` with `dataAdmin=false` still receives `403` on `/data/` (preserving all existing `data-lifecycle-service` tests). Extend `MembershipRights` with `readonly dataAdmin?: boolean`, and in `membershipAllows` grant `subject.evidence` and `data.handle` when `rights.dataAdmin === true`.
- Update `apps/server/src/auth/data-routes.ts` (`capabilitiesOfMembership(membership)`) so `dataAdmin: true` on a `CHANNEL_OWNER` grants `dataHandle: true`.
- Update `apps/server/src/auth/members.ts` (`Membership.dataAdmin: boolean`, `GrantInput.dataAdmin?: boolean` defaulting to `false`) and `POST /channels/:channelId/members` + `POST /members/batch` (`dataAdmin` optional boolean, default `false`).

#### 2.2 Q15 — `UntrustedText` `<bdi>` Isolation
- Update `apps/web/src/components/untrusted-text/UntrustedText.tsx` to render:
  `<span className="untrusted-text" data-untrusted="true" style={{ whiteSpace: "pre-wrap" }}><bdi>{text.replace(CONTROL_CHARACTERS, "")}</bdi></span>`
- Keep `apps/web/test/untrusted-text.test.tsx` green and add bidi control (`\u202E`, `\u202C`, `\u2066`–`\u2069`) and zero-width (`\u200B`, `\u200D`, `\uFEFF`) isolation tests.
- Render ALL untrusted viewer, SC, AI translation/notes/acknowledgement/safe-alias, rule/term/candidate, and log text with `UntrustedText`.

#### 2.3 Q48 — Channel-Scoped Model Settings & Fault Visibility
- Preserve `readModelSettings(deps)` and `writeModelSettings(deps, body)` signatures in `apps/server/src/modules/inference-provider/model-settings/routes.ts` so all existing tests remain intact.
- Add a SQLite-backed channel-scoped `ModelSettingsStore` using `deployment_settings` (`key = "channel:" + channelId + ":model-settings"`).
- Expose `GET /channels/:channelId/model-settings` (requires `score.config`), `PUT /channels/:channelId/model-settings` (requires `score.config` + CSRF), and `PUT /channels/:channelId/sc-translation` (toggle `scTranslationEnabled`, requires `score.config` or `review.decide` — documented as `score.config` for admin/owner and `review.decide` for dock SC toggle, or `score.config` + `review.decide` check).
- Return real `inferenceProvider.describe()` `CapabilityReport` alongside saved `settings` and `issues`.
- Model/provider errors and connection faults are returned and displayed explicitly as system faults (`SYSTEM_FAULT` / `fault` banner), never disguised as content violations.

#### 2.4 Q12, Q17, Q50 — Regex Hints, Revocation, Candidate Cards
- **Q12**: Rule validation/save endpoint (`PUT /channels/:channelId/rules`) runs `compileRuleSet` from `moderation-engine` and forwards `REGEX_HINTS` / `RuleIssue` (`code`, `ref`, `hint`) on `400`/`422` so rule authors see actionable rewrite hints.
- **Q17**: Every HTTP request resolves `findActiveMembership(database, channelId, accountId)` from SQLite; revoking a member immediately returns `403 FORBIDDEN` on subsequent requests.
- **Q50**: Candidate card endpoints (`GET /channels/:channelId/candidates`, `POST /channels/:channelId/candidates/:cardId/confirm`, `POST /channels/:channelId/candidates/:cardId/reject`) wire `createCandidateRoutes` (`queue.read` to list, `list.edit` to confirm or reject to `REJECTED`).

### 3. Fastify HTTP Endpoints & RBAC Matrix

All `/channels/:channelId/...` routes authenticate via `authenticateRequest` (session cookie; CSRF token required for `POST`/`PUT`/`DELETE`; downstream bearer tokens refused with `403`). `:channelId` is always derived from the route parameter and verified against `channel_members`.

| Endpoint | Capability | Purpose |
| --- | --- | --- |
| `GET /channels/:channelId/context` | any active member | Channel metadata, caller role, capabilities (`dataAdmin`, `logAccess`), connection fault status |
| `GET /channels/:channelId/dock` | `queue.read` | Live stream items, review queue, approved SC feed (original SC vs AI translation/notes/ack/safe-alias separated), blocked review items (body hidden/folded unless `message.original`), local vs platform delete status |
| `POST /channels/:channelId/tasks/:taskId/decide` | `review.decide` | Commit `ALLOW_MEANINGFUL` / `ALLOW_NOISE` / `BLOCK`; returns `409` on concurrent conflict |
| `POST /channels/:channelId/events/:eventId/review` | `review.decide` | Overturn/re-decide event (`ALLOW_*` / `BLOCK`); returns `409` on conflict; when `BLOCK`, records separate `localStatus` and `platformDeleteStatus` (`PENDING`/`DELETED`/`FAILED`/`UNKNOWN`) |
| `POST /channels/:channelId/deliveries/:deliveryId/resend` | `review.decide` | Resend delivery via `decision-service`; returns `409` on refusal |
| `GET /channels/:channelId/rules` | `queue.read` | Current rule set, active `rule_terms`, active `list_entries` |
| `PUT /channels/:channelId/rules` | `list.edit` / `score.config` | Validate & publish rule set (`compileRuleSet` + Q12 hints) |
| `POST /channels/:channelId/lists/subjects` | `list.edit` | Blacklist/whitelist subject (`createDecisionRoutes.editSubjectList`) |
| `POST /channels/:channelId/lists/terms` | `list.edit` | Add/retire rule term (`createDecisionRoutes.editTerm`) |
| `GET /channels/:channelId/candidates` | `queue.read` | List candidate cards (`createCandidateRoutes.listCards`) |
| `POST /channels/:channelId/candidates/:cardId/confirm` | `list.edit` | Confirm candidate card |
| `POST /channels/:channelId/candidates/:cardId/reject` | `list.edit` | Reject candidate card (`REJECTED`) |
| `GET/PUT /channels/:channelId/model-settings` | `score.config` | Read/write channel-scoped model settings + real `describe()` capability report |
| `PUT /channels/:channelId/sc-translation` | `review.decide` or `score.config` | Toggle `scTranslationEnabled` for the channel |
| `GET/PUT /channels/:channelId/admin-settings` | `score.config` | Scoring parameters, queue/concurrency settings, retention settings |
| `GET /channels/:channelId/outputs` | `output.manage` or `tokens.manage` | List active output grants & tokens |
| `PUT /channels/:channelId/connection-fault` | `score.config` | Read/update simulated or observed platform/model connection fault status (for explicit fault banner) |

### 4. Frontend Pages & Routes (`apps/web/src/pages/`)
`apps/web/src/routes.tsx` auto-discovers `./pages/*/route.tsx`.
- `apps/web/src/pages/dock/` (`route.tsx` at `/dock/:roomId`): Streamer Dock with approved SC feed (original SC vs AI translation/notes/acknowledgement/safe-alias clearly separated), SC translation toggle, live stream & review queue, blocked item review (body folded when `!capabilities.includes("message.original")`), separate `localStatus` vs `platformDeleteStatus`, `409` conflict feedback, explicit system/model fault banner (never disguised as content violation), and `403` revocation handling.
- `apps/web/src/pages/moderation/` (`route.tsx` at `/moderation/:channelId`): Moderator collaboration view with queue, concurrent decision actions (`ALLOW`/`BLOCK`/overturn/resend) with `409` conflict banner showing winning decision, blocked body folding without `message.original`, separate platform delete status, and quick list/term actions.
- `apps/web/src/pages/admin/` (`route.tsx` at `/admin` and `/admin/:channelId` — exported via `route` or child routes so `/admin` resolves cleanly): Role-gated configuration sections:
  1. Rules, word lists (`rule_terms`), subject lists (`list_entries`), Q12 regex hints, Q50 candidate cards
  2. Members management (`Q17` immediate revocation, `Q34` `dataAdmin` flag, `logAccess` flag)
  3. Channel-scoped Model Settings (`Q48`, real `CapabilityReport` options, explicit issues/faults)
  4. Scoring, Queue, and Retention settings
  5. Outputs (`output-grants`, `output-tokens`)
  6. Navigation links to Data Panel (`/data/:channelId`) and Log Viewer (`/logs/:channelId`)
  7. Platform & Model connection fault status

### 5. Custom Choices (自定) & Non-Goals
- **Channel settings storage (自定)**: Store channel-scoped model, scoring, queue, and retention JSON configs in the existing `deployment_settings` table keyed by `channel:<channelId>:<section>` rather than adding new tables, keeping the 27-table schema count intact while persisting in SQLite.
- **UI testing pattern (自定)**: Follow `apps/web/src/pages/data/__tests__/` and `apps/web/src/pages/logs/__tests__/` using `renderToStaticMarkup` from `react-dom/server` + pure API/flow unit tests (no headless browser or extra devDependencies).
- **Non-goals**: No live YouTube OAuth/ingestion or live Kiro CLI subprocess calls in this story; platform/model faults and queue/stream items use persisted SQLite rows and adapter `describe()` / fault state.

### 6. Test Mapping
- `apps/web/test/untrusted-text.test.tsx`: `<bdi>` wrapper + bidi/zero-width isolation.
- `apps/server/test/db/schema.test.ts` & `constraints.test.ts`: `channel_members.data_admin` column, `0007` migration, CHECK constraint `ck_channel_members_data_admin`.
- `apps/server/test/auth/s022-routes.test.ts`: Multi-moderator `409` conflict, SC translation toggle, model fault vs content violation, member revocation immediate `403`, `message.original` folding, local vs platform delete separation, Q12 regex hints, Q34 `dataAdmin` on `CHANNEL_OWNER`, Q48 channel-scoped model settings, Q50 candidate confirm/reject, cross-channel & multi-role negative tests.
- `apps/web/src/pages/dock/__tests__/`, `apps/web/src/pages/moderation/__tests__/`, `apps/web/src/pages/admin/__tests__/`: API client CSRF/error mapping + `renderToStaticMarkup` view tests for role gating, folding, conflict banners, fault banners, and `<bdi>` isolation.
