<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:2a41e3c54fab2b483ad94c08 revision=4 sha256=c507dc39979523ffcc5b7c909341a8d75a03d4f08df0b1b214a8d872d770fa4c -->

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

# S004 实施设计（本地内容，不在受管段内）

来源：VOXWARD-STORY-004 rev 4（VW-S004-R001@1）；VOXWARD-SUB-008 rev 1（VW-SUB008-R001@1，AC001）；VOXWARD-SUB-009 rev 1（VW-SUB009-R001@1，AC001）；提案 §4.2、§4.3、§5.3、§9.3、§10。
标「自定」的是 Story discretion 内的选择，或来源没有规定的参数。

## 0. 偏离与来源缺口（登记）

1. 目录：工单交付物写 `apps/server/src/modules/moderation/`。仓库中已验收的占位目录是 `apps/server/src/modules/moderation-engine/`，`registry.ts` 按它导入。本包沿用占位目录，注册表不改，测试目录为 `apps/server/test/moderation-engine/`。工单交付清单由引擎侧更新，本包不写引擎工单。
2. 契约缺口：`ChannelEvent` 只有 `sender.senderRef`，不含显示昵称（契约注释：平台资料不跨契约）。本包在模块内定义 `NicknameSource` 端口。端口未绑定或返回空时，昵称部分未检查，路由为 REVIEW。契约不改。
3. 内部主体：以 `channelId` 加 `sender.senderRef` 作为内部主体引用（契约中唯一的发送者字段）。它是否等同于频道内主体索引，来源未规定（自定）。
4. 安全称呼的持久化与主播确认入口未分配到任何 Story（工单来源缺口）。本包只交付查询端口与进程内实现。
5. 昵称缓存是否跨重启保存：来源未规定，按提案 §10「进程内缓存用于热点规则和短期任务状态」处理，不落库。
6. 读音转写的语言范围与所用库：来源未指定。本包不引外部库，交付端口与表驱动的最小实现，生产读音源待定。
7. 繁简转换（提案 §4.3 写为「可以包括」）：没有词表来源，本包不做。

## 1. 仓库布局

```
apps/server/src/modules/moderation-engine/
  index.ts                       工厂：createModerationEngine（契约）、createModerationChecker（带明细）
  rules/normalize.ts             字符单元切分、NFKC、小写、去零宽与组合标记，映射回原文
  rules/transliterate.ts         读音端口 Transliterator；表驱动的最小实现（自定）
  rules/bounded-regex.ts         受约束正则：准入检查与编译
  rules/groups.ts                规则集类型与编译校验；分组汇总与路由
  rules/span-map.ts              命中区间映射为原文字段区间
  rules/engine.ts                逐范围匹配（昵称、正文、组合）、预算、消息级判定
  nickname-cache/cache.ts        昵称检查缓存（进程内）与昵称摘要
  nickname-cache/safe-alias.ts   安全称呼查询端口（进程内实现）与读音解析
apps/server/test/moderation-engine/
  rules/*.test.ts  nickname-cache/*.test.ts
```

依赖方向由 check-deps 检查：模块文件只能导入 `@voxward/contracts` 与本模块文件。摘要用全局 `crypto.subtle`，计时用全局 `performance`，编码用全局 `TextEncoder`，不导入 `node:*`（自定，避免改 check-deps）。

## 2. 规则模型（自定；提案 §4.3 只给出能力类型）

- `RuleSetInput { version, groups }`。`version` 进入每次结果，也进入缓存未命中的判断。
- `GroupInput { id, action, rules }`，`action` 为 `BLOCK`、`REVIEW`，或 `DEDUCT` 并带非负整数 `deduction`。
- `RuleInput { id, kind, text | source }`，`kind` 为 `exact`（原文子串）、`normalized`（归一化子串）、`reading`（读音子串）、`regex`（受约束正则）。
- 编译失败返回 issue 列表：只含代码和组或规则 id，不回显规则文本（规则可能含辱骂词）。
- 读音规则只能放在 `REVIEW` 组。来源（提案 §4.3）写明不能用未经校准的同音相似性自动惩罚所有匹配文本。`BLOCK`、`DEDUCT` 组含读音规则时编译失败，代码 `READING_CANNOT_PENALIZE`。
- 规则集不能为空。没有规则集时模块路由 REVIEW，不当作通过。

## 3. 归一化与原文映射（rules/normalize.ts）

- 字符单元按码点切分。`\p{M}`、`\p{Cf}`，以及韩文中声和终声字母（U+1160–U+11FF、U+D7B0–U+D7FF），并入前一个单元。单元是映射粒度。
- 归一化按单元进行：`NFKC`，再转小写，再删去 `\p{M}` 与 `\p{Cf}`。零宽字符和组合标记只影响匹配副本，原文不变。
- 精确匹配（`exact`）直接在原文上做，映射为逐 UTF-16 单元的恒等映射。
- 归一化文本的每个单元记录归一化区间和原文区间。命中区间取覆盖单元的原文并集，因此夹在中间的零宽字符会被包含在原文区间内。
- 命中区间按字段（昵称、正文）拆分为原文区间列表，供审计使用。

## 4. 读音（rules/transliterate.ts）

- 端口：`Transliterator.transliterate(field, text) → { mapped, complete }`。
- 表驱动实现：表键为归一化单元，表值为 `[a-z0-9]*` 的读音。ASCII 字母数字取自身；空白、标点、符号读音为空（可忽略）；其余无表项的单元使 `complete = false`，且不输出读音。
- 默认绑定为空表，因此中文昵称的读音为 incomplete。生产读音库待定（见 §0-6）。

## 5. 受约束正则（rules/bounded-regex.ts，自定常量）

- 准入条件：源长不超过 100；无反向引用（`\1`–`\9`、`\k`）、无前后查找、无命名分组；量词不能作用于分组；量词总数不超过 3；无界量词（`*`、`+`、`{n,}`）不超过 1；有界重复上限为 8；模式不能匹配空串；能被 `RegExp(source, "u")` 编译。
- 匹配只在归一化文本上做，模式应写成小写。零长匹配不计命中。
- 上述静态约束不能证明所有模式的最坏复杂度。残余风险见 §9 的未验证项。

## 6. 输入上限与执行时限（自定）

- 正文不超过 500 个 UTF-16 单位，昵称不超过 100 个。归一化后的昵称加正文不超过 1000。超出则路由 REVIEW，且不运行规则。
- 每次判定有 20 ms 预算，时钟可注入。每条规则开始前检查预算，超出则停止，结果标记为未完成，路由 REVIEW。已找到的 BLOCK 命中仍然生效。
- JavaScript 的同步正则无法中断。预算是逐条检查加事后判定，不是硬中断。

## 7. 命中、分组与路由（rules/groups.ts、rules/engine.ts）

- 命中记录：每次出现记为一条 `RuleHit { ruleId, groupId, action, deduction, scope, spans }`，`scope` 为 `nickname`、`body` 或 `combined`。
- 组合范围只保留跨越昵称与正文边界的命中。单字段内的命中已由各自范围计入，不重复计数。
- 路由（自定，依据提案 §4.2 第 1、4 步）：有任一 `BLOCK` 命中则 `BLOCK`；否则，有 `DEDUCT` 或 `REVIEW` 命中，或有任何 REVIEW 原因（昵称不可用、预算超出、输入超限、无规则集），则 `REVIEW`；否则 `PASS`。`PASS` 只表示基础检查通过，不表示消息可以输出。
- 扣分（依据提案 §4.3）：多个 `DEDUCT` 命中只取最大扣分值，记一次规则裁决。`hitCount` 记全部命中次数，`deductionsApplied` 为 0 或 1，两者分开记录。

## 8. 昵称检查缓存（SUB-009，nickname-cache/cache.ts）

- 缓存以内部主体为索引，每个主体一项。缓存项保存昵称摘要（SHA-256 十六进制）、规则版本、到期时间，以及昵称范围的检查结果。三项任一不符即未命中，并被新结果覆盖（自定，用于实现提案 §5.3 的键字段）。
- 改名使摘要不符；规则变化使版本不符；到期使时间已过。三种情况都重新检查昵称。
- 只缓存完整（complete）的结果。
- 缓存命中只跳过昵称范围的检查。正文检查与组合检查每次都执行，缓存的昵称命中照常计入路由。
- 缓存只记录「该昵称文本的检查结果」，不记录该用户为安全。
- 进程内存储，设上限 10000 项（LRU），TTL 1 小时（自定）。

## 9. 安全称呼与读音（SUB-009，nickname-cache/safe-alias.ts）

- 查询端口：`SafeAliasPort.lookup(subject) → string | null`。进程内实现在构造时校验：非空、不超过 40 个字符、无控制字符，非法项抛出配置错误。
- 持久化与主播确认界面未分配（§0-4）。本包不做确认流程，也不做表。
- `resolveNicknameReading`（自定次序）：先取已确认的安全称呼，其次取完整的本地转写，否则返回 `NEEDS_MANUAL_CONFIRMATION`。昵称缺失返回 `NICKNAME_UNAVAILABLE`。不调用外部服务，提案 §5.3 不允许为补全注音扩大对外数据。

## 10. 测试与验收对应

| 测试 | 证明什么 | 对应验收 |
|---|---|---|
| `rules/normalize.test.ts` | 零宽、全角、组合标记、混合语言的命中区间映射回原文 | VW-SUB008-AC001 |
| `rules/bounded-regex.test.ts` | 嵌套量词、反向引用、查找、空匹配被拒绝；合法模式通过 | VW-SUB008-AC001 |
| `rules/groups.test.ts` | 编译校验（读音不得惩罚、重复 id、扣分值）；最大扣分只记一次；BLOCK 优先 | VW-SUB008-AC001 |
| `rules/transliterate.test.ts` | 表驱动读音、未知字符为 incomplete、忽略字符 | VW-SUB008-AC001 |
| `rules/engine.test.ts` | 噪声文本仍检查；同音命中只 REVIEW；组合跨字段命中；输入超限与预算超出为 REVIEW；BLOCK 不被预算降级 | VW-SUB008-AC001 |
| `moderation-engine.test.ts` | 契约输出带 correlationId；无规则集、无昵称源时为 REVIEW | VW-S004-AC001 |
| `nickname-cache/cache.test.ts` | 命中跳过昵称检查；改名、规则版本、到期失效；只存完整结果；LRU 上限 | VW-SUB009-AC001 |
| `nickname-cache/engine-cache.test.ts` | 缓存命中时正文与组合仍检查 | VW-SUB009-AC001 |
| `nickname-cache/safe-alias.test.ts` | 安全称呼优先；完整转写可用；不完整则人工确认 | VW-SUB009-AC001 |

## 11. 不做的事

- 不改 `packages/contracts`、`scripts/check-deps.mjs`、`registry.ts`，不新增依赖。
- 不做规则与名单的数据库存储（S002）、白名单与评分路由（后续 Story）、AI 调用、主播确认界面、繁简转换、生产读音库。
- 不推送，不发布，不写引擎工单。
- 本 spec 的勾选只是本地进度，不是正式完成证据。
