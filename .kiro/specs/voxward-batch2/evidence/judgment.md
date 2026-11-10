# 第 2 批判断（VOXWARD-STORY-002、STORY-004、STORY-031）

- 候选：本地 main `0a1da29`（`3af4a5f` 上依次合入 `voxward/s002-storage`、`voxward/s004-rules`、`voxward/s031-policy`）。
- 范围：8 张工单、89 行验收（派工表列出 8 张，派工文字写的「9 张」与表不符）。satisfied 72 行，failed 17 行，unverified 0 行。逐条依据见 `.kiro/specs/voxward-batch2/evidence/acceptance.md`，证据草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断子代理（main 档），未参与实现；本批验收只有一片，按小轮条件一次完成验收、判断与 lessons。

| Story | 判定 | 行数 | 阻断 | 归属 |
| --- | --- | --- | --- | --- |
| VOXWARD-STORY-002 | **通过** | 35/35 satisfied（STORY 11、SUB-004 12、SUB-005 12） | 无 | — |
| VOXWARD-STORY-004 | **打回** | 20 satisfied、15 failed（STORY 5、SUB-008 6、SUB-009 4） | B1、B2 | SUB-008 |
| VOXWARD-STORY-031 | **打回** | 17 satisfied、2 failed（STORY 1、SUB-055 1，均为 INHERIT-021） | B3 | SUB-055 |

- rejection 计数：SUB-008 与 SUB-055 各记 1 次。SUB-009 的本单行（AC001、STORY）为 satisfied；它的 PARENT 与 INHERIT-003/005/012 行失败，原因全部在 SUB-008 的改动里，建议不给 SUB-009 计打回，但这 4 行要在修复后的候选上随 S004 一起复验。
- 本批整体门禁：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm test`（212/212）、`pnpm check:deps`（58 个文件 0 违规）、启动冒烟均通过；`pnpm typecheck` 失败（B1）。主线程汇报时不能写成「本批门禁全绿」。
- Spec：本批三份为 SPEC_CURRENT（rev 4）。第 1 批的 `voxward-s001-skeleton` 与 `voxward-core-contracts` 因链写后工单 revision 与状态变化报 SPEC_STALE，`voxward-master` 没有 source.json，报 SPEC_OWNERSHIP_MISSING；三者都不是本批缺陷（N8）。

## 阻断发现

### B1 合并后 `pnpm typecheck` 失败（归属 SUB-008）

- 触发：在 `0a1da29` 的干净检出上运行 `pnpm typecheck`（acceptance.md E04）。
- 当前行为：退出 1。唯一错误是 `apps/server/test/moderation-engine/moderation-engine.test.ts(8,7): error TS2741: Property 'databaseFile' is missing ...`。
- 根因：SUB-005（`d1847ff`）给 `serverConfigSchema` 加了带默认值的 `databaseFile`，推断出的 `ServerConfig` 因此要求该字段；SUB-008（`0cae0e5`）在另一个分支上新建的测试按旧形状写配置字面量。两个分支各自 typecheck 为 0，合并没有文本冲突，合并后也没有跑检查。
- 影响：本批必需门禁不通过。`vitest run` 不检查类型（第 1 批问题清单 Q4），`pnpm test` 仍是 212/212，只跑测试会漏掉。
- 修复方向：在该测试的配置字面量里补 `databaseFile`（S002 对 `healthz.test.ts`、`synthetic-flow.test.ts` 用的就是这种改法），或改用 `serverConfigSchema.parse(...)` 生成配置。
- 复验：`pnpm typecheck`、`pnpm test`。

### B2 受约束正则的准入放行会让单条消息阻塞事件循环（归属 SUB-008）

- 触发：发布一条含重叠分支的正则规则，例如 `(a|a|a)` 连写 13 次再接 `a*0`（94 字符，通过 `admitRegex` 与 `compileRuleSet`）；之后任一观众发送由可部分匹配字符组成的消息，例如 50 个 `a`。
- 当前行为（acceptance.md §2.1，E31–E34）：经 `createModerationChecker` 检查这条消息，稳态每条 1665 ms，首条 11397 ms；检查期间 10 ms 定时器只触发 1 次。正文从 20 字符增加到 50 字符，稳态从 115 ms 涨到 1665 ms。只禁止捕获组不够：非捕获的 `(?:a|a|a)` 连写 10 次加 `a*0` 在 200 字符上稳态 1161 ms，`(\w|a)` 连写 12 次加 `\w*!` 为 111 ms。消息最后路由 REVIEW、原因 RULE_BUDGET_EXCEEDED，结果安全，但服务已经停顿。
- 契约：提案 §4.3「正则需限制复杂度和执行时间，防止一条消息拖住事件循环」；VW-SUB008-AC001 的场景包含「高复杂度正则输入」，expected 为「执行时限有控制」；`admitRegex` 注释写明只接受「matching cost bounded」的形状。S004 设计 §5 与 self-check 第 5 节把最坏复杂度列为未验证的残余风险，本次实测为失败。
- 影响：同步正则在主线程上运行，单进程服务在匹配期间不处理任何请求，同一部署的所有频道的审核、输出与 HTTP 一起停顿。一个频道的规则编辑者可以让其它频道一起失去服务。
- 文件：`apps/server/src/modules/moderation-engine/rules/bounded-regex.ts`（`admitRegex`、`checkShape`），`apps/server/src/modules/moderation-engine/rules/engine.ts`（`checkScope` 的预算）。
- 修复方向（实现由 SUB-008 选择，验收只看结果）：让准入后的任何模式在输入上限（正文 500、昵称 100、归一化 1000）内有确定的耗时上界。可选做法包括：禁止分组内的多分支，或限制分支总数与各组分支数之积；把正则规则放进可在超时后终止的 worker；改用线性时间的匹配引擎。20 ms 预算目前只在每条规则开始前检查，最后一条规则超时也不会被标出（单条 S6 规则 26 ms 仍为完整），修复时一并处理。
- 复验：重跑 §2.1 的 S1–S6 形状与 E30、E05，确认上限内的单条消息不超过设计预算；STORY-004、SUB-008、SUB-009 的 15 行 failed 一并在新候选上判定。

### B3 删除请求期限的政策结论与原文相反（归属 SUB-055）

- 触发：阅读 `docs/policy/data-processing.md` 第 5.3 节、`docs/policy/status-and-gaps.md` 第 3 节第 3 项与第 5.3 节第 1 项、`docs/policy/platform-questions.md` Q3 的缺口、`docs/policy/self-hosting-responsibilities.md` 第 5 节表格倒数第 2 行。`data-processing.md` 第 4 节对 E.4 的转述本身没错，但只写了 30 日存储上限，漏了 E.4.g。
- 当前内容：材料以「核对结果」写明 7 日规定只针对撤销授权、III.E.4 的期限是 30 日，因此不把 7 日写成删除请求的期限，并建议 Owner 考虑修订提案 §11.3 的措辞。
- 原文（acceptance.md §3.1，E41，开发者政策全文，Last updated 2026-11-06 UTC）：III.E.4.g 要求用户请求删除后尽快且在 7 个日历日内删除存储数据，并说明删除本地数据不影响 YouTube 上的数据；III.D.2.c 的 7 日（经应用撤销）与 30 日（经 Google 安全设置撤销）是另外两条。提案 §11.3 与 III.E.4.g 一致，引用正确。实施方的 web_fetch 只取到页面前 8000 字符，没有读到 E.4.g。
- 契约：VW-R-021 要求「告知/删除、保存期限……的真实材料」（INHERIT-021 行「继续遵守 VW-R-021 原始要求」）。
- 影响：材料让 Owner 以为提案的 7 日要求有误。若据此修订提案，或把删除请求的处理期限放宽到 30 日，会违反 III.E.4.g。
- 修复方向：按 III.E.4.g 写明删除请求「尽快、最迟 7 个日历日」以及删除本地数据不影响 YouTube 数据的告知要求；III.D.2.c 的两种撤销期限单列；删去「Owner 可决定是否修订提案措辞」；E.4.g 中「user」是否包括发言观众可列为待平台确认，但不否定期限本身；核对记录改为全文版本，并更新 III.E.4.h、III.I.15 的「未核对」（N7）。
- 复验：只复核这 4 个文件的相关段落与 VW-S031-INHERIT-021、VW-SUB055-INHERIT-021；S031 其余 17 行在材料其余部分不变时可复用结论，在新候选上重新盖 codeVersion。

## 两处差异的判断

- 差异 1（提案 §11.3「最迟七个日历日」与 III.E.4）：提案正确，实施方结论错误，处理见 B3。
- 差异 2（STORY-031 正文列 VW-R-013/014，SUB-055 继承不含）：不是缺陷。INIT 把 VW-R-013 分配给 EPIC-004（实施）与 EPIC-006（验证），把 VW-R-014 分配给 EPIC-001、EPIC-004（实施）与 EPIC-006（验证）；STORY-031 的父级 EPIC-007 只分到 VW-R-021、022 和共享需求，所以 STORY-031 与 SUB-055 都没有 INHERIT-013/014。正文的「根需求关联」只说明材料主题。材料对两种删除与记分例外的描述与提案 §11.2–§11.4 一致。不建议改分配；STORY-032 会在实现后对齐删除与例外界面材料。

## 与实施方自测的对照

- S002：self-check 报告的 24 张表、迁移重跑为空操作、4×25 并发、SIGKILL 中断、Q1 与 Q2 在干净检出上全部复现。本次另做的独立检查：6×40 多进程并发、数据字典与实库零差异、drizzle-kit 无差异、Q1 的 13 条反向对照、Q2 的 10 例加基线反向对照。
- S004：self-check 的 typecheck 0 与 135 项测试是在分支上得到的；合并后 typecheck 失败（B1）。self-check 把正则最坏复杂度列为残余风险，本次实测为失败（B2）。
- S031：self-check 把 7 日差异列为「待确认」，本次读取政策全文后判定提案正确（B3）。

## 非阻断建议

N1 可组合的组合标记绕过归一化规则（SUB-008；建议记入问题清单，交 STORY-006）
- 观察：`ba` 加 U+0301 加 `dword` 不命中归一化规则 `badword`（E30）。NFKC 先把 `a` 与 U+0301 组合成 `á`，之后删除 `\p{M}` 已经删不到。不可组合的覆盖符（U+0336）能命中。
- 依据：提案 §4.3 只要求「可以包括 NFKC、零宽字符处理和按语言启用的繁简转换」，不要求去重音，所以不阻断。
- 建议：如需忽略重音，先 NFKD、删除 `\p{M}`、再 NFKC；这会把正常的带重音字母一起折叠，误报面变大，需要按语言决定。

N2 昵称缓存没有按主体失效的接口（SUB-009；交 STORY-019）
- 删除请求之后，进程内缓存条目最多保留到 TTL（1 小时）。删除编排落地时补一个 `invalidate(subject)`，或在删除流程中写明 TTL 上限。

N3 昵称检查有两套存放方式（SUB-004、SUB-009；交 STORY-006）
- S002 建了持久表 `subject_nickname_checks`（含昵称摘要），S004 按设计 §0-5 只用进程内缓存，不落库。提案 §10 的数据组没有列这张表。接入审核路由时选定一种；不用的话删除该表，避免长期保存昵称摘要，并同步数据字典。

N4 现有打包参数在接入数据库后不能运行（SUB-005；交第一个把 db 接入 `main.ts` 的 Story，按批次表最早是第 3 批的 STORY-003 或 STORY-005）
- E25：用 build 脚本相同的 esbuild 参数打包导入 `src/db/**` 的入口，运行时报 `Dynamic require of "fs" is not supported`（better-sqlite3）。`DEFAULT_MIGRATIONS_FOLDER` 按 `import.meta.url` 解析，打包后会指向不存在的 `dist/migrations`。
- 建议：外置 `better-sqlite3` 与 `drizzle-orm`，迁移目录随产物发布或显式传入，再用 `node dist/main.js` 实测打开数据库。

N5 `voxward-s002-storage/design.md` 的「## 12. 来源缺口」重复了两次（SUB-004、SUB-005；随下次修改 spec 时删除）。

N6 工单交付清单与实际路径不一致（SUB-008、SUB-009 的 `details.deliverables`）
- 清单写 `apps/server/src/modules/moderation/…` 与 `apps/server/test/moderation/…`，实际为 `moderation-engine`（S004 设计 §0-1 已登记）。没有行为影响，链写时可更新。

N7 政策材料中的「未核对」项现在可以核对（SUB-055；随 B3 一起处理）
- III.E.4.h（不得生成派生数据或指标）与 III.I.15（不得提供转出 API 数据的 API 服务）都已在全文中确认，提案 §15.1、§15.2 的引用正确；III.L 说明派生指标附加政策只适用于经审核、通过配额扩展申请取得许可的分析用例。需要更新的位置：`status-and-gaps.md` 第 5.2 节表格、第 5.3 节第 2、3 项、第 6.1 节，`platform-questions.md` Q5 的缺口。

N8 集成与 spec 流程（主线程，master 清单 A4、A12、A14）
- A12 合并后先跑 `pnpm typecheck && pnpm test`，B1 本可以在交给验收前发现。
- 链写写入证据或转 done 后，Story 的 spec 会报 SPEC_STALE（摘要包含 revision、status 与 content）。已完成工单的 STALE 属预期；需要当前 spec 时用 `refresh --approved-in`。本批三份在链写后同样会变为 STALE。

## 复验范围

- B1、B2 的修复只改 S004 的模块与测试：在新候选上重跑 `pnpm install --frozen-lockfile`（锁文件不变时可复用 E02）、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps`、启动冒烟，以及 E30–E34；STORY-004 组 35 行全部重新判定。
- B3 的修复只改 `docs/policy/`：复核两行 INHERIT-021；其余 S031 行复用结论并在新候选上重新盖 codeVersion。
- STORY-002：35 行已在 `0a1da29` 上 satisfied，可直接以 `0a1da29` 链写。若改用新候选，先确认 `git diff 0a1da29 <新候选> -- apps/server/src/db apps/server/test/db apps/server/src/config apps/server/src/main.ts apps/server/test/app apps/server/drizzle.config.ts apps/server/package.json pnpm-lock.yaml scripts/check-deps.mjs docs/data-dictionary.md` 为空，E20–E25 的结论才可复用。
- 不需要重跑六份 spec 的 check，除非修复改动了 spec 的受管来源（工单内容）。

## lessons

`lessons.json` 记录 5 条本轮新确立、可跨工单复用的事实：并行分支合并后的类型冲突与门禁顺序、V8 正则耗时的测量方法与重叠分支的回溯、kiro-specs 在链写后报 SPEC_STALE 的原因、YouTube 开发者政策须读全文及删除期限所在条款、server 打包参数接入数据库后的失败方式。
