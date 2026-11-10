<!-- EINZBERN-SPEC:MANAGED-START -->
# Tasks

<!-- Einzbern source: work=work:2a41e3c54fab2b483ad94c08 revision=4 sha256=c507dc39979523ffcc5b7c909341a8d75a03d4f08df0b1b214a8d872d770fa4c -->

Exactly one executable task represents the current work item. It is a local Spec checklist only; checking it never changes formal work status or evidence.

- [ ] 1. 实现基础规则与昵称检查缓存
  - Work item: `work:2a41e3c54fab2b483ad94c08` revision 4.
  - Goal from the current formal source: 昵称、正文和组合内容经过统一且有界的基础规则检测。
  - Scope from the current formal source: 
  - Acceptance from the current formal source: VW-S004-AC001@1 [work:2a41e3c54fab2b483ad94c08/VW-S004-R001@1] 零宽/混合语言/组合文本/高复杂正则、改名和规则升级。: 白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 (规则样本、缓存失效、匹配区间及执行上限测试。) VW-S004-PARENT@1 [work:4359ebe518ff3530a3338d00/VW-E001-R004@1] 零宽/混合语言/组合文本/高复杂正则、改名和规则升级。: 白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 (复用本单同候选版本的组件/材料证据，保留来源与实际观察；规则样本、缓存失效、匹配区间及执行上限测试。) VW-S004-INHERIT-001@1 [work:8bd4977aa0770aa2f41229a2/VW-R-001@1] 审查本单产出的接口、说明及依赖方向。: 保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S004-INHERIT-003@1 [work:8bd4977aa0770aa2f41229a2/VW-R-003@1] 零宽/混合语言/组合文本/高复杂正则、改名和规则升级。（本单对 VW-R-003 的贡献）: 白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 继续遵守 VW-R-003 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (规则样本、缓存失效、匹配区间及执行上限测试。) VW-S004-INHERIT-004@1 [work:8bd4977aa0770aa2f41229a2/VW-R-004@1] 核对本单与 VW-R-004 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-004 承载。) VW-S004-INHERIT-005@1 [work:8bd4977aa0770aa2f41229a2/VW-R-005@1] 零宽/混合语言/组合文本/高复杂正则、改名和规则升级。（本单对 VW-R-005 的贡献）: 白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 继续遵守 VW-R-005 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (规则样本、缓存失效、匹配区间及执行上限测试。) VW-S004-INHERIT-009@1 [work:8bd4977aa0770aa2f41229a2/VW-R-009@1] 审查本单接触的 AI 输入、运行资源、日志或材料。: 只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S004-INHERIT-011@1 [work:8bd4977aa0770aa2f41229a2/VW-R-011@1] 审查本单使用的仓储接口、数据字段、事务或部署说明。: 写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。) VW-S004-INHERIT-012@1 [work:8bd4977aa0770aa2f41229a2/VW-R-012@1] 零宽/混合语言/组合文本/高复杂正则、改名和规则升级。（本单对 VW-R-012 的贡献）: 白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。 (规则样本、缓存失效、匹配区间及执行上限测试。) VW-S004-INHERIT-014@1 [work:8bd4977aa0770aa2f41229a2/VW-R-014@1] 核对本单与 VW-R-014 对应模块的接口、前置和实际影响。: 本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。 (对照本单交付边界及依赖，复用版本相符的关联证据；完整判据仍由 INIT 的 VW-AC-014 承载。) VW-S004-INHERIT-017@1 [work:8bd4977aa0770aa2f41229a2/VW-R-017@1] 审查本单涉及的数据、缓存、任务、关联或恢复说明。: 删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。 (接口/数据字段/文档与原始需求核对；涉及可运行路径时使用本单相应行为证据，不以未涉及冒充已实测。)
  - Original work notes and delivery details from the current formal source: 交付物：精确/NFKC 等归一化/读音转写/有界正则；规则分组与原文区间映射；昵称哈希+规则版本+期限缓存；本地安全称呼/读音。 前置：VOXWARD-STORY-001 根需求关联：VW-R-003,VW-R-005,VW-R-012。 本单验收只证明声明的贡献和继承约束合规性，父级完整判据保持。其它模块的实现与最终验证不因本单完成而自动通过。证据需记录候选版本、输入、实际结果和未验证范围；继承引用不是已执行证明。 当前 planned；本次仅拆单。实际派工读取项目/宿主当前配置，暂无执行人、完成证据或发布/平台操作回执。 精确/NFKC 等归一化/读音转写/有界正则；规则分组与原文区间映射；昵称哈希+规则版本+期限缓存；本地安全称呼/读音。 S-PARENT work:4359ebe518ff3530a3338d00#VW-E001-R004@requirement@1 [complete] 昵称、正文和组合内容经过统一且有界的基础规则检测。 交付：精确/NFKC 等归一化/读音转写/有界正则；规则分组与原文区间映射；昵称哈希+规则版本+期限缓存；本地安全称呼/读音。 S-SPLIT minutes:a791ac5683fc0b966d851c2f#D2@1 [complete] 据本次授权，以 7 个 Epic、33 个 Story 承接既定 MVP：核心契约/存储/权限/规则评分；Kiro/Crew/JSON/调度/精翻复盘；YouTube 与人工操作；数据生命周期和两类日志；浏览器/OBS/协议与隔离演示；集成验收/性能/部署；政策及 Frankenstein 材料。Story 按可验收产出划分，建立真实前置依赖，政策草案可提前推进；第三方候选、许可和性能未验证状态不被计划掩盖。 VW-S004-R001@1: 昵称、正文和组合内容经过统一且有界的基础规则检测。 交付：精确/NFKC 等归一化/读音转写/有界正则；规则分组与原文区间映射；昵称哈希+规则版本+期限缓存；本地安全称呼/读音。 behavior: 零宽/混合语言/组合文本/高复杂正则、改名和规则升级。 预期：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 discretion: 可在已定接口/数据范围内决定目录、内部实现与最小必要验证方法；需根据实际仓库补齐代码/Specs，不假定已有产品代码。不得删除父需求、固定新模型/子代理数量、扩大对外数据或私自改变判据；不把自测等同于独立验收或外部批准。

A checked task is local progress only. Formal completion still requires the engine's work transition and its required evidence.
<!-- EINZBERN-SPEC:MANAGED-END -->

# S004 实施步骤（本地内容，不在受管段内）

一个包按顺序做，每张 Subtask 做完单独 commit。spec 是该分支的第一个 commit。

- [x] 0. 本 spec commit：`VOXWARD-STORY-004: add S004 spec`（含 `kiro-specs.mjs check` 得 SPEC_CURRENT）
- [x] 1. VOXWARD-SUB-008 基础规则检测引擎与原文区间映射
  - [x] 1.1 `rules/normalize.ts`：字符单元、NFKC、去零宽与组合标记、原文映射
  - [x] 1.2 `rules/transliterate.ts`：读音端口与表驱动实现
  - [x] 1.3 `rules/bounded-regex.ts`：准入检查与编译
  - [x] 1.4 `rules/groups.ts`：规则集类型、编译校验、分组汇总与路由
  - [x] 1.5 `rules/span-map.ts`、`rules/engine.ts`：逐范围匹配、预算、消息级判定
  - [x] 1.6 `index.ts`：`createModerationEngine`、`createModerationChecker`；无规则集或无昵称源时 REVIEW
  - [x] 1.7 `test/moderation-engine/rules/` 与 `moderation-engine.test.ts`：样本、区间映射、预算与上限测试
  - [x] 1.8 全仓自测通过后打勾，commit `VOXWARD-SUB-008: ...`
- [ ] 2. VOXWARD-SUB-009 昵称检查缓存与本地安全称呼/读音（依赖 SUB-008）
  - [ ] 2.1 `nickname-cache/cache.ts`：昵称摘要、缓存项、失效规则、LRU 与 TTL
  - [ ] 2.2 `nickname-cache/safe-alias.ts`：查询端口、进程内实现、读音解析
  - [ ] 2.3 `index.ts`：接入缓存，缓存只包昵称范围的检查
  - [ ] 2.4 `test/moderation-engine/nickname-cache/`：失效、到期、只存完整结果、命中仍检查正文与组合、读音
  - [ ] 2.5 全仓自测通过后打勾，commit `VOXWARD-SUB-009: ...`；`evidence/self-check.md` 随本 commit 提交
- [ ] 3. 自测命令（工作树根）：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps`、`kiro-specs.mjs check`；失败在包内修复后复跑，同一失败两次分析无新证据则停止报告
