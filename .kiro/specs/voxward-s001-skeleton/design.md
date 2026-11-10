<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:674c24794f9a1fb626eb2ad1 revision=4 sha256=4ad1f8b4f71506527b7b1a579ba7b5c2d3fd81940a66db1829f2cd191db2aa1c -->

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

# S001 实施设计（本地内容，不在受管段内）

来源：VOXWARD-STORY-001 rev 4（VW-S001-R001@1）、VOXWARD-SUB-001/002/003 rev 1、提案 §9.3、§10、§4（裁决）、§7（任务代次）、§12（correlationId）。
标「自定」的是 Story discretion 范围内的选择，来源没有规定。

## 1. 仓库布局

```
package.json              # packageManager: pnpm@12.18.0；脚本 build / typecheck / test / dev / check:deps
pnpm-workspace.yaml       # apps/*、packages/*
tsconfig.base.json        # strict、ES2023、NodeNext
vitest.workspace.ts       # 自定：测试框架用 vitest
scripts/check-deps.mjs    # 依赖方向检查
apps/server/              # Fastify，唯一业务服务进程
apps/web/                 # React + Vite
packages/contracts/       # 版本化业务契约，零运行时依赖
```

## 2. 依赖方向（硬规则，由 check-deps 检查）

| 层 | 可以引用 | 不可以引用 |
|---|---|---|
| `packages/contracts` | 无 | 任何 app、任何供应商 SDK |
| `apps/server/src/modules/*` | contracts、本模块文件 | 其它模块内部文件、`adapters/*`、供应商 SDK、`fastify` |
| `apps/server/src/adapters/*` | contracts | `modules/*` 内部文件 |
| `apps/server/src/app.ts` / `registry.ts` | 以上全部 | — |
| `apps/web` | contracts | `apps/server` |

模块之间只通过 contracts 里的接口通信。

## 3. 契约包 `packages/contracts`

- `version.ts`：`CONTRACT_VERSION = "1"`。每个对外类型带 `contractVersion` 字段。
- `events/`：`ChannelEvent`（平台、频道 id、平台消息 id、平台顺序、接收时间、`correlationId`、正文、发送者引用）。不含平台原始响应。
- `tasks/`：`TaskRef`（`taskId`、`eventVersion`、`processingGeneration` 数据处理代次、`deadlineAt`）；内部状态 `QUEUED | RUNNING | PENDING_REVIEW | DONE | DISCARDED`。
- `decisions/`：下游裁决只有 `ALLOW | BLOCK`；内部分类 `ALLOW_MEANINGFUL | ALLOW_NOISE | BLOCK`，并给出到下游裁决的映射函数。
- `delivery/`：`DeliveryIntent`（事件引用、下游裁决、平台顺序、投递顺序、有效期）。
- `errors/`：`VoxwardError` 判别联合，至少有 `CONFIG_INVALID`、`CONFIG_UNKNOWN_KEY`、`STALE_GENERATION`、`PERMISSION_DENIED`、`ADAPTER_UNAVAILABLE`。
- `modules/`：九个接口各一个文件，职责与「不承担」逐条对应提案 §9.3：
  `PlatformSource`、`ModerationEngine`、`ScoringEngine`、`InferenceProvider`、`TaskCoordinator`、`DecisionService`、`OutputAdapter`、`DataLifecycleService`、`AuditStore`。
  S001 只定签名，不写业务逻辑。

## 4. 服务端 `apps/server`

- `config/schema.ts`：显式列出允许的配置键。自定：用 zod 的 `.strict()`。
- `config/load.ts`：读环境变量和可选配置文件。未知键 → `CONFIG_UNKNOWN_KEY`；缺必需项 → `CONFIG_INVALID`。服务启动前失败退出，退出码非 0，报错不打印密钥值。
- `modules/registry.ts`：按配置把九个模块接口绑到实现。S001 全部绑合成实现或占位实现。
- `modules/<九个>/index.ts`：入口占位，只导出工厂函数。后续 Story 只改各自目录。
- `adapters/synthetic/`：`platform-source.ts`（产出固定的合成 `ChannelEvent`）、`inference-provider.ts`（返回固定合法结果）、`output-adapter.ts`（把 `DeliveryIntent` 记到内存）。
- `app.ts`：创建 Fastify 实例，挂 `GET /healthz`。不注册业务路由。
- `main.ts`：加载配置 → 建注册表 → 启动 Fastify。

## 5. 前端 `apps/web`

- Vite + React 空壳。`routes.tsx` 自动注册 `src/pages/*/route.tsx`，后续页面只加自己的目录。
- 本 Story 只有一个首页，显示服务 `/healthz` 状态。

## 6. 测试

| 测试 | 证明什么 | 对应验收 |
|---|---|---|
| contracts 契约测试 | 九个接口和类型都带版本；裁决映射只产出 ALLOW/BLOCK | VW-SUB002-AC001 |
| config 测试 | 未知键、缺必需项都报受控错误 | VW-SUB003-AC001 |
| boundary 测试 | 合成事件 → 合成推理 → 合成输出，走通注册表，不碰任何供应商对象 | VW-SUB003-AC001、VW-S001-AC001 |
| check-deps | 第 2 节的依赖方向没有违反 | VW-SUB002-AC001、VW-SUB003-AC001 |
| 启动冒烟 | `pnpm dev` 后 `/healthz` 返回 200，Vite 首页能打开 | VW-SUB001-AC001 |

## 7. 不做的事

- 不写数据库（S002）、鉴权（S003）、真实平台或 Kiro 适配器（后续 Story）。
- 不推送远端，不发布。
- 本 Spec 的勾选只是本地进度，不算正式完成证据。
