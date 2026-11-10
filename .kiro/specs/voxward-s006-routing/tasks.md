<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:685ad243ec946eb7f628c93e revision=4 sha256=831e7e6ee3fb5d5a41fcca81603c3c1300104bbf004f878b1f2de06a27ab7d15 -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 实现统一审核路由与快速通道
  - Work item: `work:685ad243ec946eb7f628c93e` revision 4.
  - Goal from the current formal source: 消息按基础检查、例外、付费安全审核及普通快速分流进入统一裁决流程。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S006-AC001@1 [work:685ad243ec946eb7f628c93e/VW-S006-R001@1] 白名单/会员/高分/噪声与付费或例外条件交叉组合。: 例外每条登记审核，基础拒绝可终结，其余 AI/人工；快速放行不预先加分；下游仅 ALLOW/BLOCK。 (路由真值表、事件状态及所有短路边界测试。) VW-S006-PARENT@1 [work:4359ebe518ff3530a3338d00/VW-E001-R006@1] 白名单/会员/高分/噪声与付费或例外条件交叉组合。: 例外每条登记审核，基础拒绝可终结，其余 AI/人工；快速放行不预先加分；下游仅 ALLOW/BLOCK。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；路由真值表、事件状态及所有短路边界测试。) VW-S006-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S006-INHERIT-003@1 [work:8bd4977aa0770aa2f41229a2/VW-R-003@1] 白名单/会员/高分/噪声与付费或例外条件交叉组合。（本单对 VW-R-003 的贡献）: 例外每条登记审核，基础拒绝可终结，其余 AI/人工；快速放行不预先加分；下游仅 ALLOW/BLOCK。 继续遵守 VW-R-003 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (路由真值表、事件状态及所有短路边界测试。) VW-S006-INHERIT-004@1 [work:8bd4977aa0770aa2f41229a2/VW-R-004@1] 白名单/会员/高分/噪声与付费或例外条件交叉组合。（本单对 VW-R-004 的贡献）: 例外每条登记审核，基础拒绝可终结，其余 AI/人工；快速放行不预先加分；下游仅 ALLOW/BLOCK。 继续遵守 VW-R-004 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (路由真值表、事件状态及所有短路边界测试。) VW-S006-INHERIT-005@1 [work:8bd4977aa0770aa2f41229a2/VW-R-005@1] 白名单/会员/高分/噪声与付费或例外条件交叉组合。（本单对 VW-R-005 的贡献）: 例外每条登记审核，基础拒绝可终结，其余 AI/人工；快速放行不预先加分；下游仅 ALLOW/BLOCK。 继续遵守 VW-R-005 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (路由真值表、事件状态及所有短路边界测试。) VW-S006-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 审查本单接触的 AI 输入、运行资源、日志或材料。: 只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S006-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 审查本单使用的仓储接口、数据字段、事务或部署说明。: 写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S006-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 审查本单暴露的接口、页面、运行权限或文档示例。: 频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S006-INHERIT-014@1 [work:8bd4977aa0770aa2f41229a2/VW-R-014@1] 白名单/会员/高分/噪声与付费或例外条件交叉组合。（本单对 VW-R-014 的贡献）: 例外每条登记审核，基础拒绝可终结，其余 AI/人工；快速放行不预先加分；下游仅 ALLOW/BLOCK。 继续遵守 VW-R-014 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (路由真值表、事件状态及所有短路边界测试。) VW-S006-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 审查本单涉及的数据、缓存、任务、关联或恢复说明。: 删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。)
  - Original work notes and delivery details from the current formal source: 交付物：名单/例外队列登记；付费文本审核不可跳过；meaningful/noise 内部分类；UNSETTLED_FAST_PASS；系统失败和人工接管状态。 前置：VOXWARD-STORY-003,VOXWARD-STORY-004,VOXWARD-STORY-005 根需求关联：VW-R-003,VW-R-004,VW-R-005,VW-R-014。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 名单/例外队列登记；付费文本审核不可跳过；meaningful/noise 内部分类；UNSETTLED_FAST_PASS；系统失败和人工接管状态。 S-PARENT work:4359ebe518ff3530a3338d00#VW-E001-R006@requirement@1 [complete] 消息按基础检查、例外、付费安全审核及普通快速分流进入统一裁决流程。 交付：名单/例外队列登记；付费文本审核不可跳过；meaningful/noise 内部分类；UNSETTLED_FAST_PASS；系统失败和人工接管状态。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S006-R001@1: 消息按基础检查、例外、付费安全审核及普通快速分流进入统一裁决流程。 交付：名单/例外队列登记；付费文本审核不可跳过；meaningful/noise 内部分类；UNSETTLED_FAST_PASS；系统失败和人工接管状态。 behavior: 白名单/会员/高分/噪声与付费或例外条件交叉组合。 预期：例外每条登记审核，基础拒绝可终结，其余 AI/人工；快速放行不预先加分；下游仅 ALLOW/BLOCK。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->


# S006 实施步骤（本地内容，不在受管段内）

一个包按顺序做。spec 是该分支的第一个 commit。SUB-012 的每一步单独 commit，提交信息含 `VOXWARD-SUB-012`。

- [x] 0. 本 spec commit：`VOXWARD-STORY-006: add spec`（含 `kiro-specs.mjs check` 得 SPEC_CURRENT）
- [ ] 1. VOXWARD-SUB-012 统一审核路由真值表、快速通道与处理状态
  - [x] 1.1 Q6：`rules/normalize.ts` 组合标记选项、`groups.ts` 规则集字段、`engine.ts` 接入，并加测试
  - [ ] 1.2 Q12：`groups.ts` 准入提示文案与测试
  - [ ] 1.3 Q22：`packages/contracts` 的 `Verdict.penaltyHits`；scoring-engine 的 `selectPenalty` 接线与校验；测试
  - [ ] 1.4 Q8：删除 `subject_nickname_checks`（`schema/subjects.ts`、drizzle-kit 迁移 0002、`docs/data-dictionary.md`、`schema.test.ts`）
  - [ ] 1.5 `routing/classification.ts`、`routing/states.ts`、`routing/exception-queue.ts` 与对应测试
  - [ ] 1.6 `routing/truth-table.ts` 与真值表测试（96 种组合）
  - [ ] 1.7 `routing/router.ts`、`moderation-engine/index.ts` 导出，端到端测试（真实基础检查与假账本的计分引擎）
  - [ ] 1.8 全仓自测后在本段打勾
- [ ] 2. 自测（工作树根）：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps`、`kiro-specs.mjs check` 全部退出 0；不设 `VOXWARD_DATABASE_FILE` 运行 `pnpm dev`，确认 `/healthz` 返回 200 且只绑 127.0.0.1，停止后无残留进程；证据写入 `evidence/self-check.md` 并随最后一个 commit 提交
- [ ] 3. 失败在包内修复后复跑；同一失败两次分析没有新证据则停止并报告
