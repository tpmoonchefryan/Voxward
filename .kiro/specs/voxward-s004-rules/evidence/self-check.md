# S004 本地自测证据

本文件记录工作树 `/home/ryanlan/Code/Voxward/.worktrees/s004-rules`（分支 `voxward/s004-rules`）上的本地自测输出。它是实施子代理的本地记录，不是正式完成证据，也不是独立验收。正式完成与验收由引擎流程决定。

环境：Node v24.16.0，pnpm 12.18.0，Linux x86_64。
基线：HEAD `3af4a5f`（S001 骨架）。改动前基线：typecheck 退出码 0，测试 41 项全部通过。
分支提交：spec `feab503`（VOXWARD-STORY-004: add S004 spec）；VOXWARD-SUB-008 `0cae0e5`；VOXWARD-SUB-009 为包含本文件的最后一个提交。

## 1. 命令与退出码

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `CI=true pnpm install --frozen-lockfile` | 0 | Lockfile is up to date，依赖未改动 |
| `pnpm build` | 0 | contracts tsc 通过；server esbuild 输出 `dist/main.js`（28.0kb）；web vite build 完成 |
| `pnpm typecheck` | 0 | contracts、server、web 三个包 tsc 无错误 |
| `pnpm test` | 0 | 14 个测试文件，135 项全部通过 |
| `pnpm check:deps` | 0 | 46 个源文件，0 违规 |
| `kiro-specs.mjs check`（voxward-s004-rules，work:2a41e3c54fab2b483ad94c08） | 0 | `SPEC_CURRENT`，workRevision 4，sourceDigest `c507dc39…fa4c` |

## 2. 测试明细

| 文件 | 项数 | 覆盖 |
| --- | --- | --- |
| `test/moderation-engine/rules/normalize.test.ts` | 9 | 零宽、全角、组合标记、韩文字母组合、命中区间映射回原文、跨字段拆分 |
| `test/moderation-engine/rules/transliterate.test.ts` | 4 | 表驱动读音、读音单元回指原字符、不完整读音、表项校验 |
| `test/moderation-engine/rules/bounded-regex.test.ts` | 23 | 准入接受与拒绝（分组量词、反向引用、查找、命名分组、重复上限、空匹配、语法错误）；匹配去重与零长跳过 |
| `test/moderation-engine/rules/groups.test.ts` | 9 | 规则集编译校验（读音不得惩罚、重复 id、扣分值、空组）；路由汇总（BLOCK 优先、最大扣分记一次） |
| `test/moderation-engine/rules/engine.test.ts` | 16 | 精确、噪声、同音、组合跨界、输入上限、归一化上限、预算、无规则集、空白昵称 |
| `test/moderation-engine/moderation-engine.test.ts` | 6 | 契约输出带 correlationId；无规则集、无昵称源为 REVIEW；无效规则集报错不回显模式；注册表绑定 |
| `test/moderation-engine/nickname-cache/cache.test.ts` | 13 | 摘要、改名、规则版本、到期、只存完整结果、主体隔离、LRU、配置校验；昵称范围跳过 |
| `test/moderation-engine/nickname-cache/engine-cache.test.ts` | 5 | 缓存命中仍检查正文与组合；改名后重新检查；缓存上限配置校验 |
| `test/moderation-engine/nickname-cache/safe-alias.test.ts` | 9 | 安全称呼端口与校验；优先级；不完整读音转为人工确认；读音入口 |
| 既有 S001 测试：contracts 16；server adapters 7、boundary 3、config 13、app 2 | 41 | 未改动，全部通过 |

合计 135 项。新增 94 项：SUB-008 为 67 项（含空白昵称一项），SUB-009 为 27 项。

## 3. 验收条目（本地自测结果，非独立验收）

### VW-SUB008-AC001

- 噪声仍检查：`engine.test` 的「still checks noise…」。全角加零宽的 `wwww` 命中 BLOCK，原文区间 [0,5) 覆盖 5 个 UTF-16 单位。
- 白名单仍检查：本包没有白名单入口，所有消息走同一检查路径。白名单路由属于后续 Story，此项只由结构保证，未实测。
- 命中区间准确映射到原文：`normalize.test` 全部 9 项；`engine.test` 中精确命中区间 [4,11)；组合跨界命中给出昵称 [1,2) 与正文 [0,1) 两个区间。
- 相似性误报有控制：`engine.test`「routes a homophone match to review only…」。同音命中路由 REVIEW，扣分次数为 0。`groups.test` 拒绝读音规则进入 BLOCK 或扣分组。
- 执行时限有控制：`engine.test` 覆盖输入超限、归一化超限、预算超出（已得 BLOCK 保留，其余路由 REVIEW）。`bounded-regex.test` 拒绝嵌套量词、反向引用和查找。实测耗时见第 4 节。

### VW-SUB009-AC001

- 缓存只节约昵称检查，不跳过正文与组合：`engine-cache.test` 两项。缓存命中后，正文 BLOCK 与跨界组合 BLOCK 仍然生效。`cache.test`「runs the nickname check once…」。
- 改名使缓存失效：`cache.test`「is invalidated by a rename…」；`engine-cache.test`「checks a changed nickname again…」。
- 规则变化使缓存失效：`cache.test`「is invalidated by a rule version change」；作用域测试「checks the nickname again when the rule version differs」。
- 到期使缓存失效：`cache.test`「expires once the time-to-live has passed」，边界为 `now < expiresAt`。
- 只存完整结果：`cache.test`「never stores a partial result…」。
- 读音无法可靠产生时为空或提示人工确认：`safe-alias.test`「asks for manual confirmation instead of guessing」「no letters to read」。

### VW-S004-AC001 中本包承担的部分

与上面两节合并。跨模块完整验证（VOXWARD-EPIC-006）与独立验收不在本包范围。

## 4. 执行时限探针

探针脚本位于暂存目录，不入库。运行方式为 `tsx` 直接加载工作树源码，每组 15 次，调用完整的 `evaluateMessage`（含昵称与组合检查），预算 20 ms。

| 模式 | 输入 | 路由 | 中位数 | 最大 |
| --- | --- | --- | --- | --- |
| `a{1,8}a{1,8}a{1,8}b` | `a`×500 | PASS | 2.62 ms | 9.63 ms |
| `a{1,8}a{1,8}a{1,8}b` | `a`×499 加 `b` | BLOCK | 2.39 ms | 3.56 ms |
| `a+b` | `ab`×250 | BLOCK | 0.58 ms | 3.29 ms |
| `a*c` | `a`×500 | PASS | 0.51 ms | 1.11 ms |
| `x[ab]{1,8}y`，`a{1,8}b{1,8}a{1,8}c` | `a`×500、`ab`×250、`a`×499 加 `b` | PASS 或 BLOCK | 低于 0.3 ms | 低于 0.6 ms |
| 任意模式 | `㍿`×240（归一化后 960 单位，未超上限） | 未超限 | 低于 0.3 ms | 低于 1.2 ms |

最大值多来自首次执行（JIT 预热）。全部低于 20 ms 预算。这是 5 个模式、4 类输入的样本，不证明每个允许的模式都有界。

## 5. 偏离、自定选择与未验证项

偏离（已登记在 spec design 第 0 节）：

1. 目录：工单与派工写 `modules/moderation/`，仓库已验收的占位目录是 `modules/moderation-engine/`。本包沿用后者，注册表导入不变。测试目录为 `test/moderation-engine/`。引擎侧工单交付清单未更新，本包不写引擎工单。
2. 契约缺口：`ChannelEvent` 不含显示昵称。昵称经模块端口 `NicknameSource` 注入，未绑定或为空时路由 REVIEW。契约未改。
3. 内部主体引用取 `channelId` 加 `sender.senderRef`，是否等同于频道内主体索引未确认。

自定选择（来源未规定或 Story discretion 内）：

- 读音规则只能放在 REVIEW 组。扣分组命中与 REVIEW 组命中路由为 REVIEW，不自动 BLOCK。
- 输入超限、归一化超限、无规则集、昵称缺失、预算超出，均路由 REVIEW。
- 正则准入：源长不超过 100；量词总数不超过 3；无界量词不超过 1；有界重复上限 8；量词不能作用于分组；不能匹配空串。
- 输入上限：正文 500、昵称 100、归一化合计 1000 UTF-16 单位；判定预算 20 ms。
- 昵称缓存：按内部主体单项存储；摘要为 SHA-256；TTL 1 小时；上限 10000 项，LRU。
- 安全称呼优先于本地转写，长度上限 40。读音为表驱动的最小实现，默认空表。

来源缺口（工单已登记）：安全称呼的持久化与主播确认入口；昵称缓存是否跨重启（按提案 §10 不落库）；读音的语言范围与所用库。

未验证项与残余风险：

- 正则静态准入不能证明全部模式的最坏复杂度。JavaScript 同步匹配不能中断，预算是逐条检查加事后判定。
- 生产读音源未选定。默认空表下，中文昵称的读音为不完整，只能人工确认。
- 繁简转换（提案 §4.3 写为「可以包括」）未做。
- 白名单路径本包没有入口，「白名单仍检查」未实测。
- 昵称源未绑定时，所有消息路由 REVIEW。绑定方式取决于后续契约或 Story 的决定。
- 缓存只在进程内，重启后为空。规则集由调用方注入，规则的数据库存储与发布不在本包。
- 未做 check-deps 负面对照。覆盖面由检查的 46 个文件体现。
- 与同批 P-S002、P-S031 的合并冲突：本包不改 `registry.ts`、`packages/contracts`、`scripts/check-deps.mjs` 与 `config/`。预计冲突面仅限 `apps/server/src/modules/moderation-engine/` 之外的共享文件，未实测。

## 6. 结论

本地自测全部通过：构建、类型检查、135 项测试、依赖方向检查，以及 spec 的 SPEC_CURRENT。本文件不构成独立验收，也不构成正式完成证据。
