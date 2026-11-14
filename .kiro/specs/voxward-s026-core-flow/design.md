<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:3ebb2c33e7560e8661143983 revision=4 sha256=32fc7ab328bf09cf86d78cc9900e23be7294c2f172fba1e9ee404d2563c92356 -->

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

## VOXWARD-STORY-026 / VOXWARD-SUB-048 跨模块集成验证设计

### 1. 范围与只读边界（不修复产品缺陷）
- 固定候选版本：`fcad360`（分支 `voxward/s026-core-flow`）。
- 严格遵守 `VOXWARD-SUB-048` 范围约束：**不修改** `apps/server/src/**`、`apps/web/src/**`、`packages/contracts/src/**`、`scripts/**` 或 `vitest.workspace.ts`。
- 本单仅交付：
  1. `tests/integration/core-flow/`：确定性合成重放场景、并发故障夹具与说明文档（`README.md`）。
  2. `apps/server/test/integration/core-flow/*.test.ts`：被根 `vitest.workspace.ts`（`apps/server`）与 `pnpm test` 实际发现执行的跨模块集成测试套件。
  3. `docs/acceptance/core-flow-matrix.md`：包含固定候选 `fcad360`、合成输入与夹具路径、实际命令/退出码/日志摘要、逐项通过与最小可复现缺陷/未装配缺口记录，以及真实 YouTube OAuth / 真实 Kiro CLI 未在本单实测的边界说明。
  4. `.kiro/specs/voxward-s026-core-flow/evidence/self-check.md`：自测门禁与证据落盘。
- 若实测发现既有边界缺陷或未装配缺口（包括 `m7c N7` / `m7e N12b` `NO_SUBJECT_CACHES` 与默认 `CandidateStore` 未入 `hub`、`m8a N13` `output-store.ts` `TRANSLATION` 原始 JSON 字符串读取，或 `Q20/Q39/Q41/Q43/Q46/Q49/Q43/Q46/Q49/Q52/Q55/Q57` 中的边界保留问题），均以**原样最小可复现**方式断言并写入 `docs/acceptance/core-flow-matrix.md`，严禁修改产品源码。

### 2. `tests/integration/core-flow/` 与 `apps/server/test/integration/core-flow/` 映射关系
- `tests/integration/core-flow/` 存放确定性 JSON 夹具与合成场景脚本输入（与具体测试框架解耦，便于独立审阅与重放），按场景分为：
  - `fixtures/routing-scoring.json`：多语种与谐音/规范化规则、匿名/噪声/白名单/中分抽查/高分快通/例外用户 `REALTIME_REVIEW(reason="EXCEPTION")`、上下限钳制与身份事件基准分离重算（`Q20`、`Q43`）。
  - `fixtures/dedupe-replay-sc.json`：平台去重（`MessageIdStore` + `channel_events_dedupe_uq` `Q39`）、时间戳回放边界（`Q41`）、SC 文本与 PAID 车道输入（`Q46`、`Q52`）、会员里程碑事件与平台删除重试/降级/审计。
  - `fixtures/manual-coordinator-wiring.json`：人工裁决冲突/改判纠分重算（`Q49`、`Q55`）、异常不扣分与评分例外零分窗口、调度器优先级/微批与未知任务收敛（`Q57`）、以及组合根现状对照（`N7`/`N12b`、`N13`）。
- `apps/server/test/integration/core-flow/` 挂载 Vitest 集成测试（`*.test.ts`），加载 `tests/integration/core-flow/fixtures/*.json`，在真实 SQLite（`createDatabase` + `migrateDatabase`）与真实模块（`moderation-engine`、`scoring-engine`、`task-coordinator`、`decision-service`、`data-lifecycle-service`、`output-adapter`、`audit-store`、`db/*`、`app.ts`）以及合成 YouTube / 合成 Kiro 替身上端到端实测。

### 3. 关联 Q 项与已知组合根现状核对计划
- `Q20` & `Q43`：验证身份变化（匿名/普通/会员/房管）基准切换及基准分离重算，验证上下限钳制。
- `Q39`：验证 `MessageIdStore` 内存去重与 SQLite `channel_events_dedupe_uq` 唯一约束在重启/并发下的双重去重。
- `Q41`：验证 `classifyReplay` 在 `age == replayMaxAgeMs`（`LIVE`）、`age > replayMaxAgeMs`（`STALE_REPLAY`）及未来时间戳（`LIVE`）边界。
- `Q46` & `Q52`：验证 SC 文本与 `PAID` 车道优先级入队、翻译开关与输出通路表现。
- `Q49` & `Q55`：验证人工裁决并发冲突、改判纠分重算与补偿幂等性；验证异常不扣分与评分例外零分窗口。
- `Q57`：验证 `TaskCoordinator` 车道优先级、微批拉取与未知任务/过期任务收敛。
- 组合根现状对照：`N7`/`N12b`（`NO_SUBJECT_CACHES` 与默认 `CandidateStore` 未注入 `SubjectCacheHub` 的未注入/注入对照）与 `N13`（`createApprovedContentPort` 读取 `TRANSLATION` 原始 JSON 字符串的现状实测）。
- 门禁约束：`Q58`（全部测试通过 `guarded.sh` 在外发阻断与 kiro shim 下执行）；`Q59`（文档与命令严禁出现作用域包安装写法）。
