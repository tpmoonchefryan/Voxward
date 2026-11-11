<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:2d989e13eeb4a9b2a8bde05d revision=4 sha256=74bf9dac8dd3b47ab3d59e4f10135492246e58212b861d32ffee8f9950b7775b -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 实现用户数据面板与请求核验流程
  - Work item: `work:2d989e13eeb4a9b2a8bde05d` revision 4.
  - Goal from the current formal source: 主播或数据管理员可定位频道内主体、登记和核验数据请求并观察执行范围。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S018-AC001@1 [work:2d989e13eeb4a9b2a8bde05d/VW-S018-R001@1] 有/无数据权限人员查询主体并发起两种删除，昵称相同而主体不同，外部处理不可控。: 不凭昵称完成核验；两种操作效果清楚；外部范围和失败真实显示，普通删除不默认撤销既有例外。 (页面流程、授权/核验状态和请求数据契约测试。) VW-S018-PARENT@1 [work:18aaac72724b30c2ee9be8b6/VW-E004-R018@1] 有/无数据权限人员查询主体并发起两种删除，昵称相同而主体不同，外部处理不可控。: 不凭昵称完成核验；两种操作效果清楚；外部范围和失败真实显示，普通删除不默认撤销既有例外。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；页面流程、授权/核验状态和请求数据契约测试。) VW-S018-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S018-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 审查本单接触的 AI 输入、运行资源、日志或材料。: 只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S018-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 审查本单使用的仓储接口、数据字段、事务或部署说明。: 写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S018-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 有/无数据权限人员查询主体并发起两种删除，昵称相同而主体不同，外部处理不可控。（本单对 VW-R-012 的贡献）: 不凭昵称完成核验；两种操作效果清楚；外部范围和失败真实显示，普通删除不默认撤销既有例外。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (页面流程、授权/核验状态和请求数据契约测试。) VW-S018-INHERIT-013@1 [work:8bd4977aa0770aa2f41229a2/VW-R-013@1] 有/无数据权限人员查询主体并发起两种删除，昵称相同而主体不同，外部处理不可控。（本单对 VW-R-013 的贡献）: 不凭昵称完成核验；两种操作效果清楚；外部范围和失败真实显示，普通删除不默认撤销既有例外。 继续遵守 VW-R-013 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (页面流程、授权/核验状态和请求数据契约测试。) VW-S018-INHERIT-014@1 [work:8bd4977aa0770aa2f41229a2/VW-R-014@1] 有/无数据权限人员查询主体并发起两种删除，昵称相同而主体不同，外部处理不可控。（本单对 VW-R-014 的贡献）: 不凭昵称完成核验；两种操作效果清楚；外部范围和失败真实显示，普通删除不默认撤销既有例外。 继续遵守 VW-R-014 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (页面流程、授权/核验状态和请求数据契约测试。) VW-S018-INHERIT-015@1 [work:8bd4977aa0770aa2f41229a2/VW-R-015@1] 核对本单与 VW-R-015 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-015 承载。) VW-S018-INHERIT-016@1 [work:8bd4977aa0770aa2f41229a2/VW-R-016@1] 核对本单与 VW-R-016 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-016 承载。) VW-S018-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 审查本单涉及的数据、缓存、任务、关联或恢复说明。: 删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S018-INHERIT-019@1 [work:8bd4977aa0770aa2f41229a2/VW-R-019@1] 有/无数据权限人员查询主体并发起两种删除，昵称相同而主体不同，外部处理不可控。（本单对 VW-R-019 的贡献）: 不凭昵称完成核验；两种操作效果清楚；外部范围和失败真实显示，普通删除不默认撤销既有例外。 继续遵守 VW-R-019 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (页面流程、授权/核验状态和请求数据契约测试。)
  - Original work notes and delivery details from the current formal source: 交付物：评分/身份/名单/例外/类别和到期展示；访问/更正/删除/停止计分请求状态；两种删除按钮及最小偏好说明；受控材料生成流程；普通房管权限区别。 前置：VOXWARD-STORY-003,VOXWARD-STORY-005,VOXWARD-STORY-016 根需求关联：VW-R-013,VW-R-014,VW-R-012,VW-R-019。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 评分/身份/名单/例外/类别和到期展示；访问/更正/删除/停止计分请求状态；两种删除按钮及最小偏好说明；受控材料生成流程；普通房管权限区别。 S-PARENT work:18aaac72724b30c2ee9be8b6#VW-E004-R018@requirement@1 [complete] 主播或数据管理员可定位频道内主体、登记和核验数据请求并观察执行范围。 交付：评分/身份/名单/例外/类别和到期展示；访问/更正/删除/停止计分请求状态；两种删除按钮及最小偏好说明；受控材料生成流程；普通房管权限区别。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S018-R001@1: 主播或数据管理员可定位频道内主体、登记和核验数据请求并观察执行范围。 交付：评分/身份/名单/例外/类别和到期展示；访问/更正/删除/停止计分请求状态；两种删除按钮及最小偏好说明；受控材料生成流程；普通房管权限区别。 behavior: 有/无数据权限人员查询主体并发起两种删除，昵称相同而主体不同，外部处理不可控。 预期：不凭昵称完成核验；两种操作效果清楚；外部范围和失败真实显示，普通删除不默认撤销既有例外。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->

# S018 实施步骤（本地内容，不在受管段内）

本段只是本地进度清单。勾选不改变正式工单状态，也不构成完成证据。

- [x] 1. 本包 spec：`design.md` 与本文件的本地段，提交 `VOXWARD-STORY-018: add spec`，`kiro-specs.mjs check` 为 SPEC_CURRENT
- [ ] 2. VOXWARD-SUB-033：数据请求登记、核验状态与主体定位接口，提交 `VOXWARD-SUB-033: ...`
  - [ ] 2.1 契约 `packages/contracts/src/ports/data-request.ts` 与导出
  - [ ] 2.2 表重建迁移 0004（`drizzle-kit generate --custom` 生成骨架）、schema、`docs/data-dictionary.md`、迁移测试
  - [ ] 2.3 `db/data-request-store.ts`、`db/subject-read.ts` 与数据库测试
  - [ ] 2.4 模块 `requests.ts`、`subject-lookup.ts`、`export-material.ts`、`change-row.ts`、`validate.ts`、`types.ts`、`routes.ts`、`index.ts` 与模块测试
  - [ ] 2.5 `auth/data-routes.ts`、`app.ts` 绑定，HTTP 权限与 CSRF 测试
  - [ ] 2.6 `check:deps`、`typecheck`、`test` 通过后提交
- [ ] 3. VOXWARD-SUB-034：数据面板页面与两种删除入口，提交 `VOXWARD-SUB-034: ...`
  - [ ] 3.1 `api.ts`、`flow.ts` 与测试
  - [ ] 3.2 `DataPanel.tsx`、`RequestStatus.tsx`、`DeleteActions.tsx`、`route.tsx` 与测试，`<bdi>` 隔离
  - [ ] 3.3 `vite.config.ts` 增加接口代理（自定），`typecheck`、`test`、`build` 通过后提交
- [ ] 4. 自测与证据：`.kiro/specs/voxward-s018-data-panel/evidence/self-check.md`，随最后一个提交保存
  - [ ] 4.1 `pnpm install`、`build`、`typecheck`、`test`、`check:deps`、`kiro-specs.mjs check` 全部退出 0
  - [ ] 4.2 不设 `VOXWARD_DATABASE_FILE` 运行 `pnpm dev`，`/healthz` 返回 200，服务只绑 127.0.0.1，停止后无残留进程
