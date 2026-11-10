<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:674c24794f9a1fb626eb2ad1 revision=4 sha256=4ad1f8b4f71506527b7b1a579ba7b5c2d3fd81940a66db1829f2cd191db2aa1c -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 建立工程骨架与版本化业务契约
  - Work item: `work:674c24794f9a1fb626eb2ad1` revision 4.
  - Goal from the current formal source: 形成可启动的模块化单体和版本化业务接口，合成事件能通过边界测试。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S001-AC001@1 [work:674c24794f9a1fb626eb2ad1/VW-S001-R001@1] 启动开发服务并用合成事件替换平台/推理/输出适配器。: 服务可启动，业务层不导入供应商原始对象；未知配置受控报错，模块替身可独立测试。 (构建、类型检查、模块契约测试和依赖方向审查。) VW-S001-PARENT@1 [work:4359ebe518ff3530a3338d00/VW-E001-R001@1] 启动开发服务并用合成事件替换平台/推理/输出适配器。: 服务可启动，业务层不导入供应商原始对象；未知配置受控报错，模块替身可独立测试。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；构建、类型检查、模块契约测试和依赖方向审查。) VW-S001-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 启动开发服务并用合成事件替换平台/推理/输出适配器。（本单对 VW-R-001 的贡献）: 服务可启动，业务层不导入供应商原始对象；未知配置受控报错，模块替身可独立测试。 继续遵守 VW-R-001 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (构建、类型检查、模块契约测试和依赖方向审查。) VW-S001-INHERIT-003@1 [work:8bd4977aa0770aa2f41229a2/VW-R-003@1] 核对本单与 VW-R-003 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-003 承载。) VW-S001-INHERIT-004@1 [work:8bd4977aa0770aa2f41229a2/VW-R-004@1] 核对本单与 VW-R-004 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-004 承载。) VW-S001-INHERIT-005@1 [work:8bd4977aa0770aa2f41229a2/VW-R-005@1] 核对本单与 VW-R-005 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-002；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-005 承载。) VW-S001-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 审查本单接触的 AI 输入、运行资源、日志或材料。: 只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S001-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 启动开发服务并用合成事件替换平台/推理/输出适配器。（本单对 VW-R-011 的贡献）: 服务可启动，业务层不导入供应商原始对象；未知配置受控报错，模块替身可独立测试。 继续遵守 VW-R-011 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (构建、类型检查、模块契约测试和依赖方向审查。) VW-S001-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 启动开发服务并用合成事件替换平台/推理/输出适配器。（本单对 VW-R-012 的贡献）: 服务可启动，业务层不导入供应商原始对象；未知配置受控报错，模块替身可独立测试。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (构建、类型检查、模块契约测试和依赖方向审查。) VW-S001-INHERIT-014@1 [work:8bd4977aa0770aa2f41229a2/VW-R-014@1] 核对本单与 VW-R-014 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-014 承载。) VW-S001-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 审查本单涉及的数据、缓存、任务、关联或恢复说明。: 删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。)
  - Original work notes and delivery details from the current formal source: 交付物：pnpm/TypeScript/Fastify/React/Vite 基础工程；九个模块接口；频道事件、任务代次、裁决、投递意图和错误类型；配置校验及 Kiro Specs 基础材料。 前置：无，当前可从此项开始。 根需求关联：VW-R-001,VW-R-011,VW-R-012。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 pnpm/TypeScript/Fastify/React/Vite 基础工程；九个模块接口；频道事件、任务代次、裁决、投递意图和错误类型；配置校验及 Kiro Specs 基础材料。 S-PARENT work:4359ebe518ff3530a3338d00#VW-E001-R001@requirement@1 [complete] 形成可启动的模块化单体和版本化业务接口，合成事件能通过边界测试。 交付：pnpm/TypeScript/Fastify/React/Vite 基础工程；九个模块接口；频道事件、任务代次、裁决、投递意图和错误类型；配置校验及 Kiro Specs 基础材料。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S001-R001@1: 形成可启动的模块化单体和版本化业务接口，合成事件能通过边界测试。 交付：pnpm/TypeScript/Fastify/React/Vite 基础工程；九个模块接口；频道事件、任务代次、裁决、投递意图和错误类型；配置校验及 Kiro Specs 基础材料。 behavior: 启动开发服务并用合成事件替换平台/推理/输出适配器。 预期：服务可启动，业务层不导入供应商原始对象；未知配置受控报错，模块替身可独立测试。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->

# S001 实施步骤（本地内容，不在受管段内）

一个包按顺序做，每张 Subtask 做完单独 commit。

- [ ] 1. VOXWARD-SUB-001 工程骨架
  - [ ] 1.1 根 `package.json`（pnpm@12.18.0）、`pnpm-workspace.yaml`、`tsconfig.base.json`、`vitest.workspace.ts`
  - [ ] 1.2 `apps/server`：`package.json`、`tsconfig.json`、`src/main.ts`、`src/app.ts`（`/healthz`）
  - [ ] 1.3 `apps/web`：Vite + React 空壳、`routes.tsx` 自动注册
  - [ ] 1.4 `packages/contracts`：`package.json`、`tsconfig.json`
  - [ ] 1.5 自测：`pnpm install`、`pnpm -r build`、`pnpm -r typecheck`、启动冒烟（VW-SUB001-AC001）
- [ ] 2. VOXWARD-SUB-002 版本化契约
  - [ ] 2.1 `version.ts`、`events/`、`tasks/`、`decisions/`、`delivery/`、`errors/`
  - [ ] 2.2 `modules/` 九个接口，对照提案 §9.3
  - [ ] 2.3 契约测试
  - [ ] 2.4 `kiro-specs.mjs init` 生成 `.kiro/specs/voxward-core-contracts/`，再 `check` 得 SPEC_CURRENT
  - [ ] 2.5 自测：contracts 的 typecheck 与 test（VW-SUB002-AC001）
- [ ] 3. VOXWARD-SUB-003 配置、注册表与边界测试
  - [ ] 3.1 `config/schema.ts`、`config/load.ts` 与配置测试
  - [ ] 3.2 `modules/registry.ts` 与九个模块 `index.ts`
  - [ ] 3.3 `adapters/synthetic/` 三个合成替身
  - [ ] 3.4 `test/boundary/` 端到端合成流程
  - [ ] 3.5 `scripts/check-deps.mjs`，接入根脚本 `check:deps`
  - [ ] 3.6 自测：全仓 build / typecheck / test / check:deps（VW-SUB003-AC001、VW-S001-AC001）
