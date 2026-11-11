<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:58dd548e00e4c319dce50484 revision=4 sha256=e6cb46d7d7060da3b51cb435bac2c16aea9e1677dcded1b15f3039f66d43fa66 -->

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


## 实施设计：VOXWARD-SUB-049（自定，受管段之外）

本段由实施子代理写入。来源没有规定的内容标注「自定」。本设计不是设计权威（design authority 为 unconfigured），也不是完成证据。

### 1. 范围

- 本包只实施 VOXWARD-SUB-049（work:2aa6c8e36e17dd07df29f664）：合成多语言样本集，以及三个可复现的基准脚本。
- VOXWARD-SUB-050（真实运行与报告）标注为「待 Owner 账号（S029 演练时一起跑）」，见问题清单 Q60。本包不做 SUB-050，不转态，不写 `docs/reports/`，不运行真实模型，不使用本机 Kiro 账号，不连接本机 Kiro Crew 网关。
- 可改动的路径：`bench/`、根 `package.json` 的脚本入口、本 spec 目录。不改 `apps/`、`packages/contracts/`、`.kiro/steering/`、`.kiro/skills/`、`pnpm-workspace.yaml`、`vitest.workspace.ts`。不新增依赖（自定，见 §12）。

### 2. 交付映射与偏离

| 子单交付物 | 实际路径 | 说明 |
| --- | --- | --- |
| `bench/samples/`（含来源与许可说明） | `bench/samples/SOURCES.md`、`moderation-samples.json`、`rule-set.json` | 全部为本项目合成，无真实数据 |
| `bench/scripts/quality.ts` | 同路径 | 规则、实时、SC、复盘的质量指标 |
| `bench/scripts/latency-capacity.ts` | 同路径 | 静态耗时、端到端 P50/P95、并发档位、超时与过载探针 |
| `bench/scripts/cleanup-observe.ts` | 同路径 | 替身运行后的残留进程与残留目录观察 |
| `bench/README.md` | 同路径 | 运行方法、测量边界、真实模型闸门 |

偏离（自定）：

- 增加 `bench/lib/`、`bench/fixtures/`、`bench/tsconfig.json`，用于共享装配、假 CLI 替身和类型检查。这些文件只服务于子单交付物。
- 根 `package.json` 增加 `bench:quality`、`bench:latency`、`bench:cleanup`、`bench:typecheck`。`typecheck` 追加 `bench:typecheck`，使根类型检查覆盖 bench。
- 子单交付物没有引用模块名，因此没有旧模块名映射。
- 「真实模型只通过显式参数和环境变量开启」在 §10 中实现为闸门。本包不绑定真实适配器，真实模式拒绝运行。
- 队列最老消息年龄、跨条合并判定、复盘结算循环、人工改判率、API 配额与单场费用在本包中未测，§8 与 §9 逐项列明原因。

### 3. 目录布局（自定）

```
bench/
  README.md                       运行方法、来源指引、测量边界、真实模型闸门
  tsconfig.json                   继承根 tsconfig.base.json，仅用于类型检查
  samples/SOURCES.md              来源、作者、合成方法、许可、覆盖矩阵
  samples/moderation-samples.json 合成样本，每条带规则期望与 AI 期望
  samples/rule-set.json           合成规则集与读音表（占位词，不含真实侮辱词）
  fixtures/fake-kiro-cli.mjs      假 CLI 替身，内容复制自 apps/server/test 的替身，可执行
  lib/paths.ts                    bench 内路径与 scratch 目录（不依赖工作目录）
  lib/samples.ts                  读取、结构、来源与覆盖校验，失败时退出码 1
  lib/rules.ts                    规则集与读音表加载，检查器装配（完整消息与仅正文两种）
  lib/doubles.ts                  替身装配：合成适配器、假 CLI 适配器、合成 SC 与复盘模型
  lib/metrics.ts                  指标：规则、AI 分类、分位数、错误码
  lib/fake-log.ts                 假 CLI 日志读取、存活进程计数、等待标记
  lib/crash-child.ts              异常重启场景的子进程（仅由 cleanup-observe 启动）
  lib/gate.ts                     真实模型闸门（默认关闭）、参数解析、环境记录
  scripts/quality.ts              质量指标
  scripts/latency-capacity.ts     延迟与容量指标
  scripts/cleanup-observe.ts      清理观察
```

根 `.gitignore` 已忽略 `.tmp/`，因此 `bench/.tmp/` 是默认的 scratch 位置。设置了 `KIROCREW_SCRATCH` 时，scratch 放在其下。

### 4. 依赖方向（自定）

- `bench/` 不在 `scripts/check-deps.mjs` 的扫描根中，因此不受分区规则约束。模块代码和 check-deps 规则都不改动。
- bench 只读调用已有公开导出，且只经相对路径导入：`packages/contracts/src/index.ts`；`apps/server/src/modules/moderation-engine/index.ts`（检查器工厂与昵称源接口）、`rules/groups.ts`（规则集类型）、`rules/normalize.ts`（选项类型）、`rules/transliterate.ts`（读音表）；`apps/server/src/modules/inference-provider/index.ts`（批次校验与 SC 流水线）；`apps/server/src/adapters/synthetic/inference-provider.ts`；`apps/server/src/adapters/kiro-cli/provider.ts`、`errors.ts`、`orphan-sweep.ts`。
- bench 不导入 `apps/server/test/` 下的任何文件。假 CLI 替身复制到 `bench/fixtures/`，使 bench 不依赖测试目录。
- 替身通过端口注入。规则引擎实现 `GeneratedTextChecker`，SC 与复盘模型是 bench 内的合成函数，地址与条目编号由本地函数给出。

### 5. 样本集（自定，对应 AC001 的来源合法与覆盖）

- 字段：`id`、`group`（取值：`zh`、`ja`、`en`、`mixed`、`homophone`、`nickname-combo`、`cross-line`、`noise`、`evasion`、`false-positive`）、`senderRef`、`nickname`（可为 null）、`body`、`thread`（跨条时必填，否则为 null）、`expected.route`（PASS、BLOCK、REVIEW，即规则期望）、`expected.ai`（ALLOW_MEANINGFUL、ALLOW_NOISE、BLOCK，即人工标注的 AI 分类）、`joint`（仅跨条线程，取值 PASS、BLOCK、null）。
- 期望标签依据政策意图人工设定，不依据运行结果回填。
- 禁词全部为占位（例如「禁词甲」「禁語乙」「bannedalpha」），不含真实侮辱词，不使用真实观众文本。
- 校验（`lib/samples.ts`）：字段与枚举合法，`id` 唯一，每个组至少 5 条，跨条线程的每一条都有 `thread`。任一项失败则退出码 1（自定）。

### 6. 规则集（自定）

- `rule-set.json` 版本为 `bench-synth-v1`。组：BLOCK 组（归一化两条、受约束正则一条）、REVIEW 组（读音规则一条；读音规则只允许在 REVIEW 组内，由编译器强制）、DEDUCT 组（精确一条，扣分 3）。精确匹配只出现在 DEDUCT 组。
- 读音表只覆盖谐音样本用到的字符。未覆盖的字符使读音不完整，读音规则不会命中。

### 7. 替身（`lib/doubles.ts`，自定）

- 实时（AI 分类）两个替身：
  - 合成适配器 `createSyntheticInferenceProvider()`。固定输出 `ALLOW_MEANINGFUL`。bench 包一层 `describe()`，声明替身模型 `bench-synthetic-model`，以便通过模型选择闸门。这是替身声明，不是能力证明。
  - 假 CLI：`createKiroCliInferenceProvider({ command: bench/fixtures/fake-kiro-cli.mjs, env: { PATH, FAKE_KIRO_LOG, FAKE_KIRO_MODE }, runtimeRoot, maxItems, validateOutput })`，其中 `validateOutput` 绑定 `validateModerationBatch`。假 CLI 只把含 `badword` 的文本判为 BLOCK，其余判为放行。bench 同样包一层 `describe()`，声明替身模型。
- SC：`runScBatch` 的安全端口为假 CLI（翻译关闭）。翻译开启时使用合成 SC 模型：裁决取自规则引擎（命中 BLOCK 组则 BLOCK，否则 `ALLOW_MEANINGFUL`），译文为固定占位「译文占位：」加原文。故障模式 `none` 返回合法输出，`extra-item` 多返回一个未知 `itemId`，应被批次校验拒绝。`generatedText` 绑定规则引擎，因此占位译文若含禁词会被拒绝。地址为「观众」加序号。
- 复盘：合成审核模型输出，经 `validateReviewBatch` 校验。裁决取自规则引擎。REVIEW 路由的条目附一个占位候选词，其余条目不附候选词。
- 规则引擎：`createModerationChecker({ ruleSet, transliterator, nicknames })`。昵称由样本中的 `nickname` 给出。

### 8. 质量指标（`quality.ts`，自定）

- 规则：比较 `route` 与 `expected.route`。误拦 = 期望 PASS 且实际 BLOCK；漏检 = 期望 BLOCK 且实际 PASS；误送复核 = 期望 PASS 且实际 REVIEW；未送复核 = 期望 REVIEW 且实际 PASS。按组输出。
- AI 分类（实时、SC、复盘）：`ALLOW_MEANINGFUL` 与 `ALLOW_NOISE` 同视为放行。误拦 = 期望放行且预测 BLOCK；漏检 = 期望 BLOCK 且预测放行。结构失败 = 批次被校验拒绝，按批次计数。
- 跨条线程：引擎逐条判定，线程的 `joint` 期望不计入分数，只计数并记为「未测」。
- 未测项（替身无人工与账单）：人工改判率、API 配额、单场模型费用。
- 每个指标块标注 `model`（替身名）和 `quality_meaningful: false`，明确替身结果只证明管线可复现，不代表模型质量。

### 9. 延迟与容量（`latency-capacity.ts`，自定）

- 静态耗时：规则检查逐条计时。样本集重复 20 轮，报告 P50 与 P95（毫秒，三位小数）。
- 端到端：假 CLI 适配器，批大小 10，并发档位 1、2、4，每档若干批。报告每批耗时的 P50 与 P95、吞吐（批每秒）、失败码计数。
- 探针：超时（`timeoutMs` 设为很小，假 CLI 为 `hang` 模式）与输出过大（`huge` 模式）。记录失败码与耗时。
- 未测：队列最老消息年龄（需要任务协调器接线，待 S011/S014 之后）；真实模型延迟与费用（SUB-050）。
- 环境记录：操作系统、CPU 型号与核数、内存、Node 版本、替身名、批大小、并发档位、时间（ISO 8601）。环境与时间不进入可复现摘要。

### 10. 真实模型闸门（`lib/gate.ts`，自定）

- 默认关闭。只有同时给出参数 `--real-model` 与环境变量 `VOXWARD_BENCH_REAL_MODEL=1`，才进入真实模式。只给出其中之一时，脚本只运行替身。
- 本包未绑定真实适配器。真实模式直接以退出码 2 拒绝，并说明 SUB-050 负责绑定（Q60）。

### 11. 清理观察（`cleanup-observe.ts`，自定）

- 场景：成功（`ok`）、失败（`fail`，检查错误对象不含替身的 stderr 标记）、取消（`hang` 加取消）、超时（`hang` 加短超时）、校验失败（`invalid`）、异常重启（子进程以 `hang` 模式运行一批后被 SIGKILL，随后由 `sweepOrphanRunDirectories` 收尾）。
- 每个场景记录：残留运行目录数（运行根目录下 `run-` 前缀的目录）、残留进程数（假 CLI 日志中的 pid 是否仍存活）、删除会话请求数、错误码。
- 观察性判据：前五个场景的残留目录与残留进程应为 0。异常重启场景记录孤儿清理移除的目录数与终止的进程数。观察结果如实记录，不因结果不符而改写判据。

### 12. 依赖与构建（自定）

- 不新增依赖。bench 使用已有的 `tsx`、`typescript`（均在 `apps/server` 的开发依赖中），通过 `pnpm --filter @voxward/server exec` 运行。
- 根 `package.json` 脚本：`bench:quality`、`bench:latency`、`bench:cleanup` 调用 `tsx`；`bench:typecheck` 调用 `tsc -p ../../bench/tsconfig.json`；`typecheck` 追加 `bench:typecheck`。
- 原因：若增加开发依赖，需要 Owner 在终端执行（Q59）。

### 13. 可复现性与验证（自定，对应子单 AC001）

- `quality` 的 JSON 输出不含环境与时间。同一样本集、规则集、替身下两次运行的输出必须逐字节相同，以两次 sha256 比较作为证据。
- 输出写到 stdout，可用 `--out <文件>` 写文件。
- 验证项：样本来源与覆盖校验通过；三个脚本退出 0；`pnpm install`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps`、`kiro-specs.mjs check` 退出 0；`smoke.sh` 启动冒烟。
- 证据写入 `.kiro/specs/voxward-s027-bench/evidence/self-check.md`，随最后一个 commit 提交。证据不冒充独立验收。

### 14. 来源与未决（自定）

- 子单正文写明「合法样本的具体来源未定，须记录来源与许可」。本包选择全部合成，不使用外部数据，不使用真实观众数据，不抓取 YouTube。来源与许可记录在 `bench/samples/SOURCES.md`。
- 复盘：子单要求「规则、实时、SC 与复盘分别评测」。本包测的是复盘审核模型输出的契约通过率与裁决一致性。结算循环（review store、任务协调器）未接入，记为未测。
- 跨条：proposal §18.2 要求覆盖跨条内容。本包逐条判定，跨条线程的整体期望记为未测。
