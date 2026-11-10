# 第 2 批返工独立复验记录（VOXWARD-STORY-004、STORY-031；STORY-002 结论复用）

- 候选：本地 main `acb37d1`（`acb37d15c4c5db73e051787a68b73f8f1382af88`）。在上轮候选 `0a1da29` 之后合入 `voxward/s004-fix`（ec37027 B1、f40da50 B2、bdb6b28 S004 设计同步、a8fb7fa 自测）与 `voxward/s031-fix`（884107f B3+N7、b721326 自测），另有两个只改 .kiro/specs/ 的主线程提交。相对 0a1da29 只改：S004 的 `bounded-regex.ts`、`engine.ts` 及其测试，`docs/policy/` 四份，spec/evidence/tasks（R10）。
- 检出：`$KIROCREW_SCRATCH/vw-int-b2r`，detached at acb37d1，已 install。只读，不改源码、不 commit、不写引擎工单。临时文件在 `$KIROCREW_SCRATCH/vw-accept-b2r-work`。
- 复验人：第 2 批返工后的独立复验兼判断子代理（main 档，kiro / claude-opus-5.5 / max），未参与实现，也不是上一轮验收人。三份 self-check 只作参考。
- 范围（按上轮「复验范围」，不扩大）：STORY-004 组 35 行与 STORY-031 组 19 行在 acb37d1 上重新判定；STORY-002 组 35 行复用 0a1da29 结论（S002 相关文件 0a1da29..acb37d1 无变化，R10），只在报告写结论、不再写证据。
- 结果：复验的 54 行全部 satisfied。上轮 15 个 failed（B2，S004 组）与 2 个 failed（B3，S031 组）在 acb37d1 上均转 satisfied；B1（typecheck）门禁亦恢复。
- 判定口径：`satisfied` 表示该行 expected 每一部分在 acb37d1 上成立并有本轮实测或审查依据；相关输入与上轮等价且代码未变处，复用 0a1da29 结论并在 acb37d1 上重新盖 codeVersion（actual 写明复用依据）。子单 PARENT/INHERIT 的 expected、method、requirement 与所属 Story 对应行逐字相同（R01 机械比对，54/54 仅 scenario 带继承后缀、引擎新增 meaningDigest 字段）。

## 0. 执行记录

| 编号 | 命令（工作目录为检出根，另注明者除外） | 退出码 | 关键输出 |
| --- | --- | --- | --- |
| R01 | `einzbern.mjs work-show --external-key <KEY>`，5 单 xargs -P 5 并行，输出重定向到文件 | 0 ×5 | 每份约 1.6–2.0 MB，约 48 秒。库版本 20826、headEventHash `c19cfb271bc0…16ad`，五单相同。验收行数：STORY-004 11、SUB-008 12、SUB-009 12、STORY-031 9、SUB-055 10，共 54。五单 contentImpact 均 changedMeaning=false、changedAcceptance=[]、sameDigest=true，revision 较上轮各 +1（上轮链写所致），workContent.complete=true、missing/structureProblems 为空。 |
| R02 | `pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps` | 0 ×5 | install 复用锁文件；build 产 dist/main.js 29.7kb；**typecheck 0（B1 已修，0a1da29 为退 1）**；test 22 文件 236/236（含 regex-cost.test.ts 11、bounded-regex.test.ts 35、engine.test.ts 17）；check:deps 58 文件 0 违规。与主线程 int-b2r.log 同量级。 |
| R03 | §2.1 S1–S6 形状过 `admitRegex`（probe-b2.mts §1，每形状一次） | 0 | S1–S4 → `GROUP_ALTERNATION`，S5、S6 → `UNBOUNDED_WITH_VARIABLE_REPEAT`，全部在准入被拒。E31–E34 为 S1–S6 同族，一并被拒。 |
| R04 | 10 种新回溯形状（probe-b2.mts §2，正文 500+昵称 100，每形状冷启+4 稳态、每次新源串） | 0 | 见 §2.1 表。全部或被准入拒绝，或 admitted 且稳态 ≤3 ms、冷启 ≤6.74 ms、路由 PASS。 |
| R05 | 选择积/无界-变长/分组分支边界（probe-b2.mts §3） | 0 | `a{0,8}a{0,8}a{0,8}`(729)、`a?a{0,8}a{0,8}`(162) → REPEAT_CHOICES_TOO_MANY；`a*a?` → UNBOUNDED_WITH_VARIABLE_REPEAT；`a*a{3}`、`ab|cd|ef` → ADMIT；`(a|b)`、`(?:a|b)c` → GROUP_ALTERNATION；纯 `a{0,8}a{0,8}` → MATCHES_EMPTY。 |
| R06 | 最后一条规则超预算（probe-b2.mts §4，脚本时钟 before=0、after=25） | 0 | 单条规则、干净正文：route=REVIEW、reasons=[RULE_BUDGET_EXCEEDED]。最后一条规则超预算不再以完整结果通过。 |
| R07 | E30 检测抽查（probe-b2.mts §5，经改动后的 engine.ts 端到端） | 0 | 全角 ｂａｄｗｏｒｄ! BLOCK（2 命中）、夹 U+200B/200D/00AD BLOCK、噪声 wwwwwww badword 8888888 BLOCK、干净 PASS。normalize/span-map/groups/transliterate/nickname-cache 字节未变（R10），17 个 E30 样例结论复用。 |
| R08 | 归一化 1000 上限最坏合法形状直测（probe-norm1000.mts，findRegexMatches 对 1000 单位，冷启+4 稳态） | 0 | 81 选择积+16 字符类（93 字符）稳态 0.33 ms、冷启 0.47 ms；`[a-z]*[a-z]{3}` 稳态 0.67、最大 1.11 ms；`\w{1,8}\w{1,8}[a-z]`(64) 0.29 ms；`a*[a-z]×20`（101 字符）被 SOURCE_TOO_LONG 拒。全部 ≤20 ms。 |
| R09 | `web_fetch` mode=full 读 YouTube 开发者政策全文（页面 Last updated 2026-11-06 UTC） | — | 见 §3.1。逐条核对 III.D.2.c.i/ii、III.E.4.c/d/g/h、III.I.15、III.L。 |
| R10 | 文档/源码差异与一致性（git diff 0a1da29..acb37d1） | 0 | 变更文件仅 S004 bounded-regex.ts/engine.ts+测试、docs/policy 四份、spec/evidence/tasks。`git diff -- docs/policy` 只落在删除期限/保留期限段落。S002 复用范围（db/config/main.ts/test/app/drizzle.config/package.json/pnpm-lock/check-deps/data-dictionary）diff 为空。设计 §5/§6 常量与 REGEX_LIMITS(100/3/1/8/81)、DEFAULT_LIMITS(500/100/1000/20) 一致。 |

## 1. 判定汇总

| 工单 | 行数 | 本轮判定 | 上轮 failed 转归 |
| --- | --- | --- | --- |
| VOXWARD-STORY-004 | 11 | 全 satisfied | AC001、PARENT、INHERIT-003/005/012 由 B2 失败转通过 |
| VOXWARD-SUB-008 | 12 | 全 satisfied | AC001、STORY、PARENT、INHERIT-003/005/012 转通过 |
| VOXWARD-SUB-009 | 12 | 全 satisfied | PARENT、INHERIT-003/005/012 转通过 |
| VOXWARD-STORY-031 | 9 | 全 satisfied | INHERIT-021 由 B3 失败转通过 |
| VOXWARD-SUB-055 | 10 | 全 satisfied | INHERIT-021 转通过 |

## 2.1 B2 复验：危险形状在准入被拒，合法形状在上限内不超预算

修复：`checkShape` 新增三项准入约束——分组内禁止分支（`GROUP_ALTERNATION`，含 `(a|b)` 与 `(?:a|b)`，顶层 `ab|cd` 仍放行）、无界量词不得与变长有界量词（`?`、`{m,n}` 且 m<n）同现（`UNBOUNDED_WITH_VARIABLE_REPEAT`）、变长有界量词选择数乘积 ≤81（`REPEAT_CHOICES_TOO_MANY`）；`engine.ts` 的 `checkScope` 在最后一条规则后再查一次预算。

上轮 §2.1 的 S1–S6（R03）与 E31–E34 同族形状在 acb37d1 全部在准入被拒，不再进入匹配。本轮另构造 10 种上轮未出现、可能绕过新规则的回溯形状（R04，正文 500+昵称 100，每次新源串分冷启/稳态）：

| 形状 | 源长 | admitRegex | 若 admitted：冷启 / 稳态 / 最大（ms），路由 |
| --- | --- | --- | --- |
| `\w{1,8}\w{1,8}[a-z]`（重叠字符类，64 选择积） | 20 | ADMITTED | 6.57 / 2.64 / 6.57，PASS |
| `[a-z]{3}[a-z]+`（重叠类，exact+无界） | 15 | ADMITTED | 2.22 / 1.73 / 2.22，PASS |
| `a{0,8}{0,8}`（量词套量词） | 12 | 拒 SYNTAX | — |
| `a?b?c?`（顶层可选组合） | 7 | ADMITTED | 1.01 / 0.45 / 1.01，PASS |
| `a*a{0,8}`（无界+变长） | 9 | 拒 UNBOUNDED_WITH_VARIABLE_REPEAT | — |
| `a?a{0,8}a{0,8}`（选择积 162） | 15 | 拒 REPEAT_CHOICES_TOO_MANY | — |
| `a{0,8}a{0,8}[a-z]×16`（81 选择积，100 字符） | 93 | ADMITTED | 1.79 / 1.66 / 1.79，PASS |
| `\(a\|b\)+`（转义括号为字面量+无界） | 10 | ADMITTED | 0.57 / 0.50 / 0.79，PASS |
| `[\w\d\s]*Z`（宽并集类单无界） | 11 | ADMITTED | 1.98 / 1.94 / 2.16，PASS |
| `[a-z]{7,8}[a-z]{7,8}`（重叠类，m<n 近界，4 选择积） | 21 | ADMITTED | 0.85 / 0.76 / 1.01，PASS |

归一化 1000 上限直测（R08）：最坏合法形状（81 选择积+16 字符类、93 字符）对 1000 单位稳态 0.33 ms、冷启 0.47 ms；单无界 `[a-z]*[a-z]{3}` 最大 1.11 ms；均远低于 20 ms。101 字符的 `a*[a-z]×20` 被 SOURCE_TOO_LONG 拒。

判断：所有危险形状在准入被拒，所有 admitted 形状在正文 500/归一化 1000 上限内单条消息耗时 ≤ 设计预算（最坏 6.74 ms 冷启，远低于 20 ms，更无 0a1da29 的秒级阻塞）。另核：最后一条规则超预算现标 `RULE_BUDGET_EXCEEDED` 并路由 REVIEW（R06），上轮指出的「最后一条规则超时不被标出」已修。准入收紧使 `(a|b)`、`(?:a|b)` 形分组分支与「无界+变长」组合不可用，需改写为顶层分支或多条规则（非阻塞，见 judgment N1）。B2 消除。

## 3.1 B3 复验：删除期限材料与政策全文一致

以 `web_fetch` mode=full 读取 YouTube 开发者政策全文（R09，页面 Last updated 2026-11-06 UTC）。逐条核对（原文直引）：

- III.E.4.g：`you must then delete it as soon as possible and within 7 calendar days`；并要求说明删除本地数据不影响 YouTube 数据、删 YouTube 数据需用 YouTube 应用或支持删除的授权 API Client；用户在该 Client 删除账号同样 7 日内删。
- III.D.2.c.i：`within 7 calendar days of the revocation`（经应用内撤销机制）。
- III.D.2.c.ii：`within 30 calendar days of that revocation`（经 Google 安全设置页）。
- III.E.4.c、III.E.4.d：一般授权数据与非授权数据 `no longer than 30 calendar days`；III.E.4.b 统计类可更久但每 30 日须确认授权仍有效。
- III.E.4.h：`must not (i) replace API Data with similar, independently calculated data, or (ii) ... create new or derived data or metrics`。
- III.I.15：`offer an API service that allows users to access any data or functionality directly or indirectly provided by the YouTube API Services`。
- III.L：`only applicable to audited developers with analytics use cases that have explicitly applied for permission ... starting June 01, 2026`。

材料对照（R10 文档差异，`git diff 0a1da29 acb37d1 -- docs/policy` 只落在删除/保留期限段落）：`data-processing.md` 第 5.3 节现写明提案 §11.3 的七个日历日与 III.E.4.g 一致、适用于用户请求删除存储数据，III.D.2.c 两种撤销期限与 III.E.4 存储期限分表列出，并补入删除告知要求；第 4 节 III.E.4.b/c/d 的转述改为与全文一致。`status-and-gaps.md` 第 3 节删去「Owner 可决定是否修订提案措辞」，第 5.2 表与第 5.3 节改为全文依据，III.E.4.h/I.15/L 确认（N7），第 6.1 节的未验证项改为仅余派生指标补充条款页全文。`platform-questions.md` Q3/Q5、`self-hosting-responsibilities.md` 第 5 节表格同步。上轮「材料结论与原文相反」已消除；「用户」是否含发言观众列为待平台确认，不否定 7 日期限。36 个月派生指标数值仍据派生指标补充条款页片段，材料如实标注（非阻塞）。B3 消除。

## 3.2 STORY-002 结论（复用，不再写证据）

VOXWARD-STORY-002 组 35 行已在 0a1da29 全部 satisfied（第 2 批原记录）。S002 复用范围 `apps/server/src/db`、`test/db`、`src/config`、`src/main.ts`、`test/app`、`drizzle.config.ts`、`package.json`、`pnpm-lock.yaml`、`scripts/check-deps.mjs`、`docs/data-dictionary.md` 在 0a1da29..acb37d1 的 diff 为空（R10），E20–E25 结论仍成立。STORY-002 维持 done，可按 0a1da29 链写，不在本草稿内。

## 4. 逐行判定

同一 INHERIT 行在 Story 与子单上 expected/method/requirement 逐字相同（R01），expected 只在首次出现时给出。下列 actual 与 `evidence-records.json` 对应行一致。

## 5. VOXWARD-STORY-004 组（11 行，全部 satisfied；work:2a41e3c54fab2b483ad94c08 rev 5）

<a id="vw-s004-ac001"></a>
**VW-S004-AC001@1：satisfied**（machine；要求 work:2a41e3c54fab2b483ad94c08#VW-S004-R001@1）

- expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。
- 依据：候选 acb37d1：门禁独立重跑 install/build/typecheck/test(236/236)/check:deps(58 文件 0 违规) 全 0（R02，B1 已修，typecheck 由 0a1da29 的退 1 变为退 0）。检测能力保留：normalize.ts、span-map.ts、groups.ts、transliterate.ts、nickname-cache 在 0a1da29..acb37d1 字节未变（R07/R10），E30 经改动后的 engine.ts 端到端复测：全角 BLOCK、夹零宽字符 BLOCK、噪声正文 badword 仍 BLOCK、干净 PASS（R07）。缓存只节约昵称检查、不跳过正文组合，命中区间映射回原文，读音规则只能放 REVIEW 组（code 未变，复用 0a1da29 结论）。执行时限成立（B2 已修，R03/R04/R08）：§2.1 的 S1–S4 在准入被拒 GROUP_ALTERNATION、S5/S6 被拒 UNBOUNDED_WITH_VARIABLE_REPEAT，E31–E34 同族形状一并被拒，危险模式不再进入匹配；另构造的 10 种新回溯形状（重叠字符类、exact+无界、quantifier-on-quantifier、顶层可选、无界+变长、选择积超限、转义括号、宽类单无界、近上限重叠）全部或被准入拒绝、或在正文 500+昵称 100 上限内冷启≤6.7ms/稳态≤3ms（R04），最坏合法形状在归一化 1000 上限内≤0.5ms（R08）；最后一条规则超预算现标 RULE_BUDGET_EXCEEDED 并路由 REVIEW（R06）。

<a id="vw-s004-parent"></a>
**VW-S004-PARENT@1：satisfied**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R004@1）

- expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。
- 依据：候选 acb37d1：门禁独立重跑 install/build/typecheck/test(236/236)/check:deps(58 文件 0 违规) 全 0（R02，B1 已修，typecheck 由 0a1da29 的退 1 变为退 0）。检测能力保留：normalize.ts、span-map.ts、groups.ts、transliterate.ts、nickname-cache 在 0a1da29..acb37d1 字节未变（R07/R10），E30 经改动后的 engine.ts 端到端复测：全角 BLOCK、夹零宽字符 BLOCK、噪声正文 badword 仍 BLOCK、干净 PASS（R07）。缓存只节约昵称检查、不跳过正文组合，命中区间映射回原文，读音规则只能放 REVIEW 组（code 未变，复用 0a1da29 结论）。执行时限成立（B2 已修，R03/R04/R08）：§2.1 的 S1–S4 在准入被拒 GROUP_ALTERNATION、S5/S6 被拒 UNBOUNDED_WITH_VARIABLE_REPEAT，E31–E34 同族形状一并被拒，危险模式不再进入匹配；另构造的 10 种新回溯形状（重叠字符类、exact+无界、quantifier-on-quantifier、顶层可选、无界+变长、选择积超限、转义括号、宽类单无界、近上限重叠）全部或被准入拒绝、或在正文 500+昵称 100 上限内冷启≤6.7ms/稳态≤3ms（R04），最坏合法形状在归一化 1000 上限内≤0.5ms（R08）；最后一条规则超预算现标 RULE_BUDGET_EXCEEDED 并路由 REVIEW（R06）。

<a id="vw-s004-inherit-001"></a>
**VW-S004-INHERIT-001@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1：审核模块只导入 @voxward/contracts 与本模块文件，check:deps 58 文件 0 违规（R02）；S004 返工提交未改 apps/server/package.json 与 pnpm-lock.yaml（R10，contracts 0 变更）。未引入生产托管、新本机代理或供应商对象。复用 0a1da29 源码审查结论，本轮仅收紧正则准入与补一处预算检查，不改依赖方向。

<a id="vw-s004-inherit-003"></a>
**VW-S004-INHERIT-003@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 继续遵守 VW-R-003 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 acb37d1：门禁独立重跑 install/build/typecheck/test(236/236)/check:deps(58 文件 0 违规) 全 0（R02，B1 已修，typecheck 由 0a1da29 的退 1 变为退 0）。检测能力保留：normalize.ts、span-map.ts、groups.ts、transliterate.ts、nickname-cache 在 0a1da29..acb37d1 字节未变（R07/R10），E30 经改动后的 engine.ts 端到端复测：全角 BLOCK、夹零宽字符 BLOCK、噪声正文 badword 仍 BLOCK、干净 PASS（R07）。缓存只节约昵称检查、不跳过正文组合，命中区间映射回原文，读音规则只能放 REVIEW 组（code 未变，复用 0a1da29 结论）。执行时限成立（B2 已修，R03/R04/R08）：§2.1 的 S1–S4 在准入被拒 GROUP_ALTERNATION、S5/S6 被拒 UNBOUNDED_WITH_VARIABLE_REPEAT，E31–E34 同族形状一并被拒，危险模式不再进入匹配；另构造的 10 种新回溯形状（重叠字符类、exact+无界、quantifier-on-quantifier、顶层可选、无界+变长、选择积超限、转义括号、宽类单无界、近上限重叠）全部或被准入拒绝、或在正文 500+昵称 100 上限内冷启≤6.7ms/稳态≤3ms（R04），最坏合法形状在归一化 1000 上限内≤0.5ms（R08）；最后一条规则超预算现标 RULE_BUDGET_EXCEEDED 并路由 REVIEW（R06）。

<a id="vw-s004-inherit-004"></a>
**VW-S004-INHERIT-004@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 acb37d1 源码审查（复用 0a1da29，engine.ts 计分路径未因本轮改动而变）：模块只给出 appliedDeduction（多个 DEDUCT 命中取最大值一次），不保存或修改分值；钳制、冷却与账本由 ScoringEngine（STORY-005）承担，本单未触及。

<a id="vw-s004-inherit-005"></a>
**VW-S004-INHERIT-005@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 继续遵守 VW-R-005 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 acb37d1：门禁独立重跑 install/build/typecheck/test(236/236)/check:deps(58 文件 0 违规) 全 0（R02，B1 已修，typecheck 由 0a1da29 的退 1 变为退 0）。检测能力保留：normalize.ts、span-map.ts、groups.ts、transliterate.ts、nickname-cache 在 0a1da29..acb37d1 字节未变（R07/R10），E30 经改动后的 engine.ts 端到端复测：全角 BLOCK、夹零宽字符 BLOCK、噪声正文 badword 仍 BLOCK、干净 PASS（R07）。缓存只节约昵称检查、不跳过正文组合，命中区间映射回原文，读音规则只能放 REVIEW 组（code 未变，复用 0a1da29 结论）。执行时限成立（B2 已修，R03/R04/R08）：§2.1 的 S1–S4 在准入被拒 GROUP_ALTERNATION、S5/S6 被拒 UNBOUNDED_WITH_VARIABLE_REPEAT，E31–E34 同族形状一并被拒，危险模式不再进入匹配；另构造的 10 种新回溯形状（重叠字符类、exact+无界、quantifier-on-quantifier、顶层可选、无界+变长、选择积超限、转义括号、宽类单无界、近上限重叠）全部或被准入拒绝、或在正文 500+昵称 100 上限内冷启≤6.7ms/稳态≤3ms（R04），最坏合法形状在归一化 1000 上限内≤0.5ms（R08）；最后一条规则超预算现标 RULE_BUDGET_EXCEEDED 并路由 REVIEW（R06）。

<a id="vw-s004-inherit-009"></a>
**VW-S004-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1 源码审查（transliterate.ts 未变，R10）：模块不调用 AI，Transliterator 实现不得调外部服务，resolveNicknameReading 只查本地安全称呼端口与本地转写表，不保存会话/提示/工具轨迹。AI 输入范围由 EPIC-002 承接。

<a id="vw-s004-inherit-011"></a>
**VW-S004-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1 源码审查（复用 0a1da29）：模块不写数据库、不导入 db 层（check:deps 0 违规，R02），进程内缓存只存昵称摘要、规则版本、到期与命中偏移，不存正文或昵称原文。数据库写入由后续接线 Story 经 S002 短事务完成。

<a id="vw-s004-inherit-012"></a>
**VW-S004-INHERIT-012@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 acb37d1：门禁独立重跑 install/build/typecheck/test(236/236)/check:deps(58 文件 0 违规) 全 0（R02，B1 已修，typecheck 由 0a1da29 的退 1 变为退 0）。检测能力保留：normalize.ts、span-map.ts、groups.ts、transliterate.ts、nickname-cache 在 0a1da29..acb37d1 字节未变（R07/R10），E30 经改动后的 engine.ts 端到端复测：全角 BLOCK、夹零宽字符 BLOCK、噪声正文 badword 仍 BLOCK、干净 PASS（R07）。缓存只节约昵称检查、不跳过正文组合，命中区间映射回原文，读音规则只能放 REVIEW 组（code 未变，复用 0a1da29 结论）。执行时限成立（B2 已修，R03/R04/R08）：§2.1 的 S1–S4 在准入被拒 GROUP_ALTERNATION、S5/S6 被拒 UNBOUNDED_WITH_VARIABLE_REPEAT，E31–E34 同族形状一并被拒，危险模式不再进入匹配；另构造的 10 种新回溯形状（重叠字符类、exact+无界、quantifier-on-quantifier、顶层可选、无界+变长、选择积超限、转义括号、宽类单无界、近上限重叠）全部或被准入拒绝、或在正文 500+昵称 100 上限内冷启≤6.7ms/稳态≤3ms（R04），最坏合法形状在归一化 1000 上限内≤0.5ms（R08）；最后一条规则超预算现标 RULE_BUDGET_EXCEEDED 并路由 REVIEW（R06）。

<a id="vw-s004-inherit-014"></a>
**VW-S004-INHERIT-014@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 acb37d1 源码审查（复用 0a1da29）：模块无白名单/噪声/高分快通道，也无记分例外逻辑，每条消息先经基础检查再给 PASS/REVIEW/BLOCK。例外路径由 STORY-006、STORY-019 承接。

<a id="vw-s004-inherit-017"></a>
**VW-S004-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1 源码审查（nickname-cache 未变，R10）：昵称缓存只在进程内，TTL 1 小时、LRU 上限 10000，不落盘，不在 WAL/备份/日志留副本，被预算截断的部分结果不缓存。缓存无按主体失效接口，删除请求后条目最多保留到 TTL（N2，交 STORY-019）。删除编排本单未触及。

## 6. VOXWARD-SUB-008 本单行（12 行，全部 satisfied；work:74937d5d8ec65e6df57283ff rev 4）

<a id="vw-sub008-ac001"></a>
**VW-SUB008-AC001@1：satisfied**（machine；要求 work:74937d5d8ec65e6df57283ff#VW-SUB008-R001@1）

- expected：白名单和噪声仍检查；命中区间准确映射到原文；相似性误报和执行时限有控制。
- 依据：候选 acb37d1：门禁独立重跑全 0（R02，含 typecheck 0，B1 已修）。噪声仍检查、命中区间准确映射到原文：span-map.ts/normalize.ts 字节未变（R07/R10），E30 复测噪声正文 badword BLOCK、全角与夹零宽字符命中区间保持（R07）。相似性误报只路由 REVIEW（groups.ts 未变）。执行时限成立（B2 已修）：准入拒绝 §2.1 S1–S6 与 E31–E34 全族及另构造的 10 种新回溯形状，admitted 最坏在输入上限内冷启≤6.7ms、归一化 1000 上限≤0.5ms，最后一条规则超预算被标 RULE_BUDGET_EXCEEDED（R03/R04/R06/R08）。

<a id="vw-sub008-story"></a>
**VW-SUB008-STORY@1：satisfied**（machine；要求 work:2a41e3c54fab2b483ad94c08#VW-S004-R001@1）

- expected：白名单和噪声仍检查；命中区间准确映射到原文；相似性误报和执行时限有控制。 本单只证明所承担部分；VOXWARD-STORY-004 的完整判据（VW-S004-AC001@1）保持。
- 依据：候选 acb37d1：门禁独立重跑全 0（R02，含 typecheck 0，B1 已修）。噪声仍检查、命中区间准确映射到原文：span-map.ts/normalize.ts 字节未变（R07/R10），E30 复测噪声正文 badword BLOCK、全角与夹零宽字符命中区间保持（R07）。相似性误报只路由 REVIEW（groups.ts 未变）。执行时限成立（B2 已修）：准入拒绝 §2.1 S1–S6 与 E31–E34 全族及另构造的 10 种新回溯形状，admitted 最坏在输入上限内冷启≤6.7ms、归一化 1000 上限≤0.5ms，最后一条规则超预算被标 RULE_BUDGET_EXCEEDED（R03/R04/R06/R08）。

<a id="vw-sub008-parent"></a>
**VW-SUB008-PARENT@1：satisfied**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R004@1）

- expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。
- 依据：候选 acb37d1：门禁独立重跑 install/build/typecheck/test(236/236)/check:deps(58 文件 0 违规) 全 0（R02，B1 已修，typecheck 由 0a1da29 的退 1 变为退 0）。检测能力保留：normalize.ts、span-map.ts、groups.ts、transliterate.ts、nickname-cache 在 0a1da29..acb37d1 字节未变（R07/R10），E30 经改动后的 engine.ts 端到端复测：全角 BLOCK、夹零宽字符 BLOCK、噪声正文 badword 仍 BLOCK、干净 PASS（R07）。缓存只节约昵称检查、不跳过正文组合，命中区间映射回原文，读音规则只能放 REVIEW 组（code 未变，复用 0a1da29 结论）。执行时限成立（B2 已修，R03/R04/R08）：§2.1 的 S1–S4 在准入被拒 GROUP_ALTERNATION、S5/S6 被拒 UNBOUNDED_WITH_VARIABLE_REPEAT，E31–E34 同族形状一并被拒，危险模式不再进入匹配；另构造的 10 种新回溯形状（重叠字符类、exact+无界、quantifier-on-quantifier、顶层可选、无界+变长、选择积超限、转义括号、宽类单无界、近上限重叠）全部或被准入拒绝、或在正文 500+昵称 100 上限内冷启≤6.7ms/稳态≤3ms（R04），最坏合法形状在归一化 1000 上限内≤0.5ms（R08）；最后一条规则超预算现标 RULE_BUDGET_EXCEEDED 并路由 REVIEW（R06）。

<a id="vw-sub008-inherit-001"></a>
**VW-SUB008-INHERIT-001@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1：审核模块只导入 @voxward/contracts 与本模块文件，check:deps 58 文件 0 违规（R02）；S004 返工提交未改 apps/server/package.json 与 pnpm-lock.yaml（R10，contracts 0 变更）。未引入生产托管、新本机代理或供应商对象。复用 0a1da29 源码审查结论，本轮仅收紧正则准入与补一处预算检查，不改依赖方向。

<a id="vw-sub008-inherit-003"></a>
**VW-SUB008-INHERIT-003@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 继续遵守 VW-R-003 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 acb37d1：门禁独立重跑 install/build/typecheck/test(236/236)/check:deps(58 文件 0 违规) 全 0（R02，B1 已修，typecheck 由 0a1da29 的退 1 变为退 0）。检测能力保留：normalize.ts、span-map.ts、groups.ts、transliterate.ts、nickname-cache 在 0a1da29..acb37d1 字节未变（R07/R10），E30 经改动后的 engine.ts 端到端复测：全角 BLOCK、夹零宽字符 BLOCK、噪声正文 badword 仍 BLOCK、干净 PASS（R07）。缓存只节约昵称检查、不跳过正文组合，命中区间映射回原文，读音规则只能放 REVIEW 组（code 未变，复用 0a1da29 结论）。执行时限成立（B2 已修，R03/R04/R08）：§2.1 的 S1–S4 在准入被拒 GROUP_ALTERNATION、S5/S6 被拒 UNBOUNDED_WITH_VARIABLE_REPEAT，E31–E34 同族形状一并被拒，危险模式不再进入匹配；另构造的 10 种新回溯形状（重叠字符类、exact+无界、quantifier-on-quantifier、顶层可选、无界+变长、选择积超限、转义括号、宽类单无界、近上限重叠）全部或被准入拒绝、或在正文 500+昵称 100 上限内冷启≤6.7ms/稳态≤3ms（R04），最坏合法形状在归一化 1000 上限内≤0.5ms（R08）；最后一条规则超预算现标 RULE_BUDGET_EXCEEDED 并路由 REVIEW（R06）。

<a id="vw-sub008-inherit-004"></a>
**VW-SUB008-INHERIT-004@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 acb37d1 源码审查（复用 0a1da29，engine.ts 计分路径未因本轮改动而变）：模块只给出 appliedDeduction（多个 DEDUCT 命中取最大值一次），不保存或修改分值；钳制、冷却与账本由 ScoringEngine（STORY-005）承担，本单未触及。

<a id="vw-sub008-inherit-005"></a>
**VW-SUB008-INHERIT-005@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 继续遵守 VW-R-005 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 acb37d1：门禁独立重跑 install/build/typecheck/test(236/236)/check:deps(58 文件 0 违规) 全 0（R02，B1 已修，typecheck 由 0a1da29 的退 1 变为退 0）。检测能力保留：normalize.ts、span-map.ts、groups.ts、transliterate.ts、nickname-cache 在 0a1da29..acb37d1 字节未变（R07/R10），E30 经改动后的 engine.ts 端到端复测：全角 BLOCK、夹零宽字符 BLOCK、噪声正文 badword 仍 BLOCK、干净 PASS（R07）。缓存只节约昵称检查、不跳过正文组合，命中区间映射回原文，读音规则只能放 REVIEW 组（code 未变，复用 0a1da29 结论）。执行时限成立（B2 已修，R03/R04/R08）：§2.1 的 S1–S4 在准入被拒 GROUP_ALTERNATION、S5/S6 被拒 UNBOUNDED_WITH_VARIABLE_REPEAT，E31–E34 同族形状一并被拒，危险模式不再进入匹配；另构造的 10 种新回溯形状（重叠字符类、exact+无界、quantifier-on-quantifier、顶层可选、无界+变长、选择积超限、转义括号、宽类单无界、近上限重叠）全部或被准入拒绝、或在正文 500+昵称 100 上限内冷启≤6.7ms/稳态≤3ms（R04），最坏合法形状在归一化 1000 上限内≤0.5ms（R08）；最后一条规则超预算现标 RULE_BUDGET_EXCEEDED 并路由 REVIEW（R06）。

<a id="vw-sub008-inherit-009"></a>
**VW-SUB008-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1 源码审查（transliterate.ts 未变，R10）：模块不调用 AI，Transliterator 实现不得调外部服务，resolveNicknameReading 只查本地安全称呼端口与本地转写表，不保存会话/提示/工具轨迹。AI 输入范围由 EPIC-002 承接。

<a id="vw-sub008-inherit-011"></a>
**VW-SUB008-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1 源码审查（复用 0a1da29）：模块不写数据库、不导入 db 层（check:deps 0 违规，R02），进程内缓存只存昵称摘要、规则版本、到期与命中偏移，不存正文或昵称原文。数据库写入由后续接线 Story 经 S002 短事务完成。

<a id="vw-sub008-inherit-012"></a>
**VW-SUB008-INHERIT-012@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 acb37d1：门禁独立重跑 install/build/typecheck/test(236/236)/check:deps(58 文件 0 违规) 全 0（R02，B1 已修，typecheck 由 0a1da29 的退 1 变为退 0）。检测能力保留：normalize.ts、span-map.ts、groups.ts、transliterate.ts、nickname-cache 在 0a1da29..acb37d1 字节未变（R07/R10），E30 经改动后的 engine.ts 端到端复测：全角 BLOCK、夹零宽字符 BLOCK、噪声正文 badword 仍 BLOCK、干净 PASS（R07）。缓存只节约昵称检查、不跳过正文组合，命中区间映射回原文，读音规则只能放 REVIEW 组（code 未变，复用 0a1da29 结论）。执行时限成立（B2 已修，R03/R04/R08）：§2.1 的 S1–S4 在准入被拒 GROUP_ALTERNATION、S5/S6 被拒 UNBOUNDED_WITH_VARIABLE_REPEAT，E31–E34 同族形状一并被拒，危险模式不再进入匹配；另构造的 10 种新回溯形状（重叠字符类、exact+无界、quantifier-on-quantifier、顶层可选、无界+变长、选择积超限、转义括号、宽类单无界、近上限重叠）全部或被准入拒绝、或在正文 500+昵称 100 上限内冷启≤6.7ms/稳态≤3ms（R04），最坏合法形状在归一化 1000 上限内≤0.5ms（R08）；最后一条规则超预算现标 RULE_BUDGET_EXCEEDED 并路由 REVIEW（R06）。

<a id="vw-sub008-inherit-014"></a>
**VW-SUB008-INHERIT-014@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 acb37d1 源码审查（复用 0a1da29）：模块无白名单/噪声/高分快通道，也无记分例外逻辑，每条消息先经基础检查再给 PASS/REVIEW/BLOCK。例外路径由 STORY-006、STORY-019 承接。

<a id="vw-sub008-inherit-017"></a>
**VW-SUB008-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1 源码审查（nickname-cache 未变，R10）：昵称缓存只在进程内，TTL 1 小时、LRU 上限 10000，不落盘，不在 WAL/备份/日志留副本，被预算截断的部分结果不缓存。缓存无按主体失效接口，删除请求后条目最多保留到 TTL（N2，交 STORY-019）。删除编排本单未触及。

## 7. VOXWARD-SUB-009 本单行（12 行，全部 satisfied；work:e4a49448ee0fdc7e0b76905b rev 4）

<a id="vw-sub009-ac001"></a>
**VW-SUB009-AC001@1：satisfied**（machine；要求 work:e4a49448ee0fdc7e0b76905b#VW-SUB009-R001@1）

- expected：缓存只节约昵称重复检测，不能跳过正文组合；改名、规则变化或到期使缓存失效；无法可靠产生读音时为空或提示人工确认。
- 依据：候选 acb37d1：nickname-cache 代码在 0a1da29..acb37d1 字节未变（R10），门禁 test 236/236 含 nickname-cache 三文件全过（R02）。复用 0a1da29 结论：缓存命中只跳过昵称检查，正文与跨字段组合命中仍被找出；改名、规则版本变化、TTL 到期都重新检查；被预算截断的结果不缓存；读音先取主播确认安全称呼、再取完整本地转写，否则 NEEDS_MANUAL_CONFIRMATION／NICKNAME_UNAVAILABLE，不调外部服务。本轮改动（bounded-regex/engine）不触及缓存与读音。

<a id="vw-sub009-story"></a>
**VW-SUB009-STORY@1：satisfied**（machine；要求 work:2a41e3c54fab2b483ad94c08#VW-S004-R001@1）

- expected：缓存只节约昵称重复检测，不能跳过正文组合；改名、规则变化或到期使缓存失效；无法可靠产生读音时为空或提示人工确认。 本单只证明所承担部分；VOXWARD-STORY-004 的完整判据（VW-S004-AC001@1）保持。
- 依据：候选 acb37d1：nickname-cache 代码在 0a1da29..acb37d1 字节未变（R10），门禁 test 236/236 含 nickname-cache 三文件全过（R02）。复用 0a1da29 结论：缓存命中只跳过昵称检查，正文与跨字段组合命中仍被找出；改名、规则版本变化、TTL 到期都重新检查；被预算截断的结果不缓存；读音先取主播确认安全称呼、再取完整本地转写，否则 NEEDS_MANUAL_CONFIRMATION／NICKNAME_UNAVAILABLE，不调外部服务。本轮改动（bounded-regex/engine）不触及缓存与读音。

<a id="vw-sub009-parent"></a>
**VW-SUB009-PARENT@1：satisfied**（machine；要求 work:4359ebe518ff3530a3338d00#VW-E001-R004@1）

- expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。
- 依据：候选 acb37d1：门禁独立重跑 install/build/typecheck/test(236/236)/check:deps(58 文件 0 违规) 全 0（R02，B1 已修，typecheck 由 0a1da29 的退 1 变为退 0）。检测能力保留：normalize.ts、span-map.ts、groups.ts、transliterate.ts、nickname-cache 在 0a1da29..acb37d1 字节未变（R07/R10），E30 经改动后的 engine.ts 端到端复测：全角 BLOCK、夹零宽字符 BLOCK、噪声正文 badword 仍 BLOCK、干净 PASS（R07）。缓存只节约昵称检查、不跳过正文组合，命中区间映射回原文，读音规则只能放 REVIEW 组（code 未变，复用 0a1da29 结论）。执行时限成立（B2 已修，R03/R04/R08）：§2.1 的 S1–S4 在准入被拒 GROUP_ALTERNATION、S5/S6 被拒 UNBOUNDED_WITH_VARIABLE_REPEAT，E31–E34 同族形状一并被拒，危险模式不再进入匹配；另构造的 10 种新回溯形状（重叠字符类、exact+无界、quantifier-on-quantifier、顶层可选、无界+变长、选择积超限、转义括号、宽类单无界、近上限重叠）全部或被准入拒绝、或在正文 500+昵称 100 上限内冷启≤6.7ms/稳态≤3ms（R04），最坏合法形状在归一化 1000 上限内≤0.5ms（R08）；最后一条规则超预算现标 RULE_BUDGET_EXCEEDED 并路由 REVIEW（R06）。

<a id="vw-sub009-inherit-001"></a>
**VW-SUB009-INHERIT-001@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1：审核模块只导入 @voxward/contracts 与本模块文件，check:deps 58 文件 0 违规（R02）；S004 返工提交未改 apps/server/package.json 与 pnpm-lock.yaml（R10，contracts 0 变更）。未引入生产托管、新本机代理或供应商对象。复用 0a1da29 源码审查结论，本轮仅收紧正则准入与补一处预算检查，不改依赖方向。

<a id="vw-sub009-inherit-003"></a>
**VW-SUB009-INHERIT-003@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-003@1）

- expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 继续遵守 VW-R-003 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 acb37d1：门禁独立重跑 install/build/typecheck/test(236/236)/check:deps(58 文件 0 违规) 全 0（R02，B1 已修，typecheck 由 0a1da29 的退 1 变为退 0）。检测能力保留：normalize.ts、span-map.ts、groups.ts、transliterate.ts、nickname-cache 在 0a1da29..acb37d1 字节未变（R07/R10），E30 经改动后的 engine.ts 端到端复测：全角 BLOCK、夹零宽字符 BLOCK、噪声正文 badword 仍 BLOCK、干净 PASS（R07）。缓存只节约昵称检查、不跳过正文组合，命中区间映射回原文，读音规则只能放 REVIEW 组（code 未变，复用 0a1da29 结论）。执行时限成立（B2 已修，R03/R04/R08）：§2.1 的 S1–S4 在准入被拒 GROUP_ALTERNATION、S5/S6 被拒 UNBOUNDED_WITH_VARIABLE_REPEAT，E31–E34 同族形状一并被拒，危险模式不再进入匹配；另构造的 10 种新回溯形状（重叠字符类、exact+无界、quantifier-on-quantifier、顶层可选、无界+变长、选择积超限、转义括号、宽类单无界、近上限重叠）全部或被准入拒绝、或在正文 500+昵称 100 上限内冷启≤6.7ms/稳态≤3ms（R04），最坏合法形状在归一化 1000 上限内≤0.5ms（R08）；最后一条规则超预算现标 RULE_BUDGET_EXCEEDED 并路由 REVIEW（R06）。

<a id="vw-sub009-inherit-004"></a>
**VW-SUB009-INHERIT-004@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-004@1）

- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 acb37d1 源码审查（复用 0a1da29，engine.ts 计分路径未因本轮改动而变）：模块只给出 appliedDeduction（多个 DEDUCT 命中取最大值一次），不保存或修改分值；钳制、冷却与账本由 ScoringEngine（STORY-005）承担，本单未触及。

<a id="vw-sub009-inherit-005"></a>
**VW-SUB009-INHERIT-005@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-005@1）

- expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 继续遵守 VW-R-005 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 acb37d1：门禁独立重跑 install/build/typecheck/test(236/236)/check:deps(58 文件 0 违规) 全 0（R02，B1 已修，typecheck 由 0a1da29 的退 1 变为退 0）。检测能力保留：normalize.ts、span-map.ts、groups.ts、transliterate.ts、nickname-cache 在 0a1da29..acb37d1 字节未变（R07/R10），E30 经改动后的 engine.ts 端到端复测：全角 BLOCK、夹零宽字符 BLOCK、噪声正文 badword 仍 BLOCK、干净 PASS（R07）。缓存只节约昵称检查、不跳过正文组合，命中区间映射回原文，读音规则只能放 REVIEW 组（code 未变，复用 0a1da29 结论）。执行时限成立（B2 已修，R03/R04/R08）：§2.1 的 S1–S4 在准入被拒 GROUP_ALTERNATION、S5/S6 被拒 UNBOUNDED_WITH_VARIABLE_REPEAT，E31–E34 同族形状一并被拒，危险模式不再进入匹配；另构造的 10 种新回溯形状（重叠字符类、exact+无界、quantifier-on-quantifier、顶层可选、无界+变长、选择积超限、转义括号、宽类单无界、近上限重叠）全部或被准入拒绝、或在正文 500+昵称 100 上限内冷启≤6.7ms/稳态≤3ms（R04），最坏合法形状在归一化 1000 上限内≤0.5ms（R08）；最后一条规则超预算现标 RULE_BUDGET_EXCEEDED 并路由 REVIEW（R06）。

<a id="vw-sub009-inherit-009"></a>
**VW-SUB009-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1 源码审查（transliterate.ts 未变，R10）：模块不调用 AI，Transliterator 实现不得调外部服务，resolveNicknameReading 只查本地安全称呼端口与本地转写表，不保存会话/提示/工具轨迹。AI 输入范围由 EPIC-002 承接。

<a id="vw-sub009-inherit-011"></a>
**VW-SUB009-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1 源码审查（复用 0a1da29）：模块不写数据库、不导入 db 层（check:deps 0 违规，R02），进程内缓存只存昵称摘要、规则版本、到期与命中偏移，不存正文或昵称原文。数据库写入由后续接线 Story 经 S002 短事务完成。

<a id="vw-sub009-inherit-012"></a>
**VW-SUB009-INHERIT-012@1：satisfied**（machine；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- expected：白名单和噪声仍检查；缓存只节约昵称重复检测，不能跳过正文组合；相似性误报和执行时限有控制。 继续遵守 VW-R-012 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 acb37d1：门禁独立重跑 install/build/typecheck/test(236/236)/check:deps(58 文件 0 违规) 全 0（R02，B1 已修，typecheck 由 0a1da29 的退 1 变为退 0）。检测能力保留：normalize.ts、span-map.ts、groups.ts、transliterate.ts、nickname-cache 在 0a1da29..acb37d1 字节未变（R07/R10），E30 经改动后的 engine.ts 端到端复测：全角 BLOCK、夹零宽字符 BLOCK、噪声正文 badword 仍 BLOCK、干净 PASS（R07）。缓存只节约昵称检查、不跳过正文组合，命中区间映射回原文，读音规则只能放 REVIEW 组（code 未变，复用 0a1da29 结论）。执行时限成立（B2 已修，R03/R04/R08）：§2.1 的 S1–S4 在准入被拒 GROUP_ALTERNATION、S5/S6 被拒 UNBOUNDED_WITH_VARIABLE_REPEAT，E31–E34 同族形状一并被拒，危险模式不再进入匹配；另构造的 10 种新回溯形状（重叠字符类、exact+无界、quantifier-on-quantifier、顶层可选、无界+变长、选择积超限、转义括号、宽类单无界、近上限重叠）全部或被准入拒绝、或在正文 500+昵称 100 上限内冷启≤6.7ms/稳态≤3ms（R04），最坏合法形状在归一化 1000 上限内≤0.5ms（R08）；最后一条规则超预算现标 RULE_BUDGET_EXCEEDED 并路由 REVIEW（R06）。

<a id="vw-sub009-inherit-014"></a>
**VW-SUB009-INHERIT-014@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-014@1）

- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-001,VOXWARD-EPIC-004；完整验证：VOXWARD-EPIC-006。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 acb37d1 源码审查（复用 0a1da29）：模块无白名单/噪声/高分快通道，也无记分例外逻辑，每条消息先经基础检查再给 PASS/REVIEW/BLOCK。例外路径由 STORY-006、STORY-019 承接。

<a id="vw-sub009-inherit-017"></a>
**VW-SUB009-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- expected：删除代次、到期和失败状态有真实去向；不创建清理遗漏副本，不让旧任务/恢复重建已删数据；未知外部范围明确。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1 源码审查（nickname-cache 未变，R10）：昵称缓存只在进程内，TTL 1 小时、LRU 上限 10000，不落盘，不在 WAL/备份/日志留副本，被预算截断的部分结果不缓存。缓存无按主体失效接口，删除请求后条目最多保留到 TTL（N2，交 STORY-019）。删除编排本单未触及。

## 8. VOXWARD-STORY-031 组（9 行，全部 satisfied；work:c9c3c501eab15d2b2e980f45 rev 5）

<a id="vw-s031-ac001"></a>
**VW-S031-AC001@1：satisfied**（source-behavior-review；要求 work:c9c3c501eab15d2b2e980f45#VW-S031-R001@1）

- expected：不虚构配额需求/重新审核/Cloud 编号或许可；不把内部改名、主播同意或 HMAC 当自动合规；外部反馈独立跟踪且不阻塞合成开发。
- 依据：候选 acb37d1 材料审查（docs/policy 四份；R09 政策全文、R10 文档差异）：不虚构——申请现状逐项照录提案 §15.3（无配额扩展需求、未收到重新审核、Cloud 项目编号未创建、表单未提交），本轮 docs/policy 差异只落在删除期限与保留期限段落（R10）。不把改名/主播同意/HMAC 当合规——platform-questions.md 第 3 节、data-processing.md 第 5.4 节未变。外部反馈独立跟踪且不阻塞合成开发——status-and-gaps.md 第 2 节未变。删除时限段落本轮已改正并经全文核对（见 INHERIT-021），不再与原文相反。

<a id="vw-s031-parent"></a>
**VW-S031-PARENT@1：satisfied**（source-behavior-review；要求 work:38f6781a2897f516ae7c2c81#VW-E007-R031@1）

- expected：不虚构配额需求/重新审核/Cloud 编号或许可；不把内部改名、主播同意或 HMAC 当自动合规；外部反馈独立跟踪且不阻塞合成开发。
- 依据：候选 acb37d1 材料审查（docs/policy 四份；R09 政策全文、R10 文档差异）：不虚构——申请现状逐项照录提案 §15.3（无配额扩展需求、未收到重新审核、Cloud 项目编号未创建、表单未提交），本轮 docs/policy 差异只落在删除期限与保留期限段落（R10）。不把改名/主播同意/HMAC 当合规——platform-questions.md 第 3 节、data-processing.md 第 5.4 节未变。外部反馈独立跟踪且不阻塞合成开发——status-and-gaps.md 第 2 节未变。删除时限段落本轮已改正并经全文核对（见 INHERIT-021），不再与原文相反。

<a id="vw-s031-inherit-001"></a>
**VW-S031-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1 材料审查（本轮只改 docs/policy，R10）：data-processing.md 第 1 节与 self-hosting-responsibilities.md 第 1 节写明远端自托管、不提供官方生产托管、不新开发本机代理、版本化契约、既定栈；本单不涉及代码与依赖方向。相关段落本轮未变，复用 0a1da29 结论。

<a id="vw-s031-inherit-009"></a>
**VW-S031-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1 材料审查：data-processing.md 第 6 节写明只发送任务说明、规则摘要、临时 itemId、必要正文与有限上下文，不发送平台用户 ID、稳定昵称索引、令牌与账本；临时 ID 是假名化，不证明匿名；不长期保存完整提示/对话/思维链/工具轨迹；不留存不等于提供方零留存；Archive/导出/回收区不等于删除。该段本轮未变，复用结论。

<a id="vw-s031-inherit-011"></a>
**VW-S031-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1 材料审查：data-processing.md 第 1 节写明业务数据在服务器本机 SQLite，写入经单个后端，浏览器不直写，AI 任务经受控接口发起，正文不复制到队列/Crew/额外日志。该段本轮未变，复用结论。

<a id="vw-s031-inherit-012"></a>
**VW-S031-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1 材料审查：data-processing.md 第 2 节列五类角色、服务端逐次校验频道与角色不只信任客户端 roomId，第 7 节下游用可撤销只读凭据、不能读管理页，第 6 节消息命令只作待审数据；四份文件不含任何凭据（R09 机械检查沿用，相关段落本轮未变）。复用结论。

<a id="vw-s031-inherit-017"></a>
**VW-S031-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- expected：不虚构配额需求/重新审核/Cloud 编号或许可；不把内部改名、主播同意或 HMAC 当自动合规；外部反馈独立跟踪且不阻塞合成开发。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 acb37d1 材料审查：data-processing.md 第 4 节逐类列保留建议（7 天内容、30 天元数据标为提案建议，评分期限未确认，本轮改正 III.E.4.b/c/d 的转述使之与全文一致，R09），第 5.2 节删除先阻止旧任务、覆盖评分/账本/缓存/日志/索引/AI 会话/WAL/备份、恢复不复活已删数据。不虚构配额/重新审核/Cloud 编号，不把改名/同意/HMAC 当合规，外部反馈独立跟踪。相关段落的改动只提升准确性，结论成立。

<a id="vw-s031-inherit-021"></a>
**VW-S031-INHERIT-021@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-021@1）

- expected：不虚构配额需求/重新审核/Cloud 编号或许可；不把内部改名、主播同意或 HMAC 当自动合规；外部反馈独立跟踪且不阻塞合成开发。 继续遵守 VW-R-021 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 acb37d1 材料审查对 YouTube 开发者政策全文（R09，页面 Last updated 2026-11-06 UTC，web_fetch mode=full）：data-processing.md 第 5.3 节现写明提案 §11.3 的七个日历日与 III.E.4.g 一致，适用于用户请求删除存储数据；III.D.2.c.i 经应用内撤销 7 日、III.D.2.c.ii 经 Google 安全设置页撤销 30 日、III.E.4.c/d 一般与非授权数据 30 日分列成表；并写明删除本地数据不影响 YouTube 数据的告知要求。逐条核对全文：III.E.4.g『delete it as soon as possible and within 7 calendar days』、III.D.2.c.i『within 7 calendar days of the revocation』、III.D.2.c.ii『within 30 calendar days』、III.E.4.c/d『no longer than 30 calendar days』、III.E.4.h『must not replace API Data... or create new or derived data or metrics』、III.I.15『offer an API service that allows users to access any data or functionality... provided by the YouTube API Services』、III.L『only applicable to audited developers... starting June 01, 2026』——材料转述与原文一致（R09）。status-and-gaps.md 第 3 节已删去『Owner 可决定是否修订提案措辞』，第 5.2 表与第 5.3 节改为全文依据，N7 的 III.E.4.h/I.15/L 已确认（R10）。『用户』是否含发言观众列为待平台确认，未否定 7 日期限本身。B3 的相反结论已消除。

<a id="vw-s031-inherit-022"></a>
**VW-S031-INHERIT-022@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-022@1）

- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-007；完整验证：VOXWARD-EPIC-007。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 acb37d1 材料审查：本单未做演示/英文材料/视频/参赛提交，status-and-gaps.md 第 2、6.2 节写明这些由 EPIC-007 承接，公开范围/许可证/条款接受待 Owner 决定、未执行。相关段落本轮未变，复用结论。

## 9. VOXWARD-SUB-055 本单行（10 行，全部 satisfied；work:03ed7f149506ee6314265eeb rev 4）

<a id="vw-sub055-ac001"></a>
**VW-SUB055-AC001@1：satisfied**（source-behavior-review；要求 work:03ed7f149506ee6314265eeb#VW-SUB055-R001@1）

- expected：不虚构配额需求/重新审核/Cloud 编号或许可；不把内部改名、主播同意或 HMAC 当自动合规；外部反馈独立跟踪且不阻塞合成开发。
- 依据：候选 acb37d1 材料审查（docs/policy 四份；R09 政策全文、R10 文档差异）：不虚构——申请现状逐项照录提案 §15.3（无配额扩展需求、未收到重新审核、Cloud 项目编号未创建、表单未提交），本轮 docs/policy 差异只落在删除期限与保留期限段落（R10）。不把改名/主播同意/HMAC 当合规——platform-questions.md 第 3 节、data-processing.md 第 5.4 节未变。外部反馈独立跟踪且不阻塞合成开发——status-and-gaps.md 第 2 节未变。删除时限段落本轮已改正并经全文核对（见 INHERIT-021），不再与原文相反。

<a id="vw-sub055-story"></a>
**VW-SUB055-STORY@1：satisfied**（source-behavior-review；要求 work:c9c3c501eab15d2b2e980f45#VW-S031-R001@1）

- expected：不虚构配额需求/重新审核/Cloud 编号或许可；不把内部改名、主播同意或 HMAC 当自动合规；外部反馈独立跟踪且不阻塞合成开发。 本单只证明所承担部分；VOXWARD-STORY-031 的完整判据（VW-S031-AC001@1）保持。
- 依据：候选 acb37d1 材料审查（docs/policy 四份；R09 政策全文、R10 文档差异）：不虚构——申请现状逐项照录提案 §15.3（无配额扩展需求、未收到重新审核、Cloud 项目编号未创建、表单未提交），本轮 docs/policy 差异只落在删除期限与保留期限段落（R10）。不把改名/主播同意/HMAC 当合规——platform-questions.md 第 3 节、data-processing.md 第 5.4 节未变。外部反馈独立跟踪且不阻塞合成开发——status-and-gaps.md 第 2 节未变。删除时限段落本轮已改正并经全文核对（见 INHERIT-021），不再与原文相反。

<a id="vw-sub055-parent"></a>
**VW-SUB055-PARENT@1：satisfied**（source-behavior-review；要求 work:38f6781a2897f516ae7c2c81#VW-E007-R031@1）

- expected：不虚构配额需求/重新审核/Cloud 编号或许可；不把内部改名、主播同意或 HMAC 当自动合规；外部反馈独立跟踪且不阻塞合成开发。
- 依据：候选 acb37d1 材料审查（docs/policy 四份；R09 政策全文、R10 文档差异）：不虚构——申请现状逐项照录提案 §15.3（无配额扩展需求、未收到重新审核、Cloud 项目编号未创建、表单未提交），本轮 docs/policy 差异只落在删除期限与保留期限段落（R10）。不把改名/主播同意/HMAC 当合规——platform-questions.md 第 3 节、data-processing.md 第 5.4 节未变。外部反馈独立跟踪且不阻塞合成开发——status-and-gaps.md 第 2 节未变。删除时限段落本轮已改正并经全文核对（见 INHERIT-021），不再与原文相反。

<a id="vw-sub055-inherit-001"></a>
**VW-SUB055-INHERIT-001@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-001@1）

- expected：保持远端自托管、版本化模块契约和既定栈；不引入生产托管/新本机代理或供应商对象贯穿业务层。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1 材料审查（本轮只改 docs/policy，R10）：data-processing.md 第 1 节与 self-hosting-responsibilities.md 第 1 节写明远端自托管、不提供官方生产托管、不新开发本机代理、版本化契约、既定栈；本单不涉及代码与依赖方向。相关段落本轮未变，复用 0a1da29 结论。

<a id="vw-sub055-inherit-009"></a>
**VW-SUB055-INHERIT-009@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-009@1）

- expected：只使用必要文本和临时编号；不新增完整会话/提示/工具轨迹的长期副本，不宣称 Archive 或应用清理等于提供方删除。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1 材料审查：data-processing.md 第 6 节写明只发送任务说明、规则摘要、临时 itemId、必要正文与有限上下文，不发送平台用户 ID、稳定昵称索引、令牌与账本；临时 ID 是假名化，不证明匿名；不长期保存完整提示/对话/思维链/工具轨迹；不留存不等于提供方零留存；Archive/导出/回收区不等于删除。该段本轮未变，复用结论。

<a id="vw-sub055-inherit-011"></a>
**VW-SUB055-INHERIT-011@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-011@1）

- expected：写入经单后端短事务和服务器本地 SQLite；不让浏览器/AI 直写，不在队列或额外日志复制正文。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1 材料审查：data-processing.md 第 1 节写明业务数据在服务器本机 SQLite，写入经单个后端，浏览器不直写，AI 任务经受控接口发起，正文不复制到队列/Crew/额外日志。该段本轮未变，复用结论。

<a id="vw-sub055-inherit-012"></a>
**VW-SUB055-INHERIT-012@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-012@1）

- expected：频道/角色/字段校验保留，输出凭据只读可撤销，不泄露生产凭据；不把待审文本当工具指令。 仅记录本单实际触及和观察的内容；运行时完整验证由对应责任单承接。
- 依据：候选 acb37d1 材料审查：data-processing.md 第 2 节列五类角色、服务端逐次校验频道与角色不只信任客户端 roomId，第 7 节下游用可撤销只读凭据、不能读管理页，第 6 节消息命令只作待审数据；四份文件不含任何凭据（R09 机械检查沿用，相关段落本轮未变）。复用结论。

<a id="vw-sub055-inherit-017"></a>
**VW-SUB055-INHERIT-017@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-017@1）

- expected：不虚构配额需求/重新审核/Cloud 编号或许可；不把内部改名、主播同意或 HMAC 当自动合规；外部反馈独立跟踪且不阻塞合成开发。 继续遵守 VW-R-017 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 acb37d1 材料审查：data-processing.md 第 4 节逐类列保留建议（7 天内容、30 天元数据标为提案建议，评分期限未确认，本轮改正 III.E.4.b/c/d 的转述使之与全文一致，R09），第 5.2 节删除先阻止旧任务、覆盖评分/账本/缓存/日志/索引/AI 会话/WAL/备份、恢复不复活已删数据。不虚构配额/重新审核/Cloud 编号，不把改名/同意/HMAC 当合规，外部反馈独立跟踪。相关段落的改动只提升准确性，结论成立。

<a id="vw-sub055-inherit-021"></a>
**VW-SUB055-INHERIT-021@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-021@1）

- expected：不虚构配额需求/重新审核/Cloud 编号或许可；不把内部改名、主播同意或 HMAC 当自动合规；外部反馈独立跟踪且不阻塞合成开发。 继续遵守 VW-R-021 原始要求；本贡献结果不替代 INIT 对该需求的全量验收。
- 依据：候选 acb37d1 材料审查对 YouTube 开发者政策全文（R09，页面 Last updated 2026-11-06 UTC，web_fetch mode=full）：data-processing.md 第 5.3 节现写明提案 §11.3 的七个日历日与 III.E.4.g 一致，适用于用户请求删除存储数据；III.D.2.c.i 经应用内撤销 7 日、III.D.2.c.ii 经 Google 安全设置页撤销 30 日、III.E.4.c/d 一般与非授权数据 30 日分列成表；并写明删除本地数据不影响 YouTube 数据的告知要求。逐条核对全文：III.E.4.g『delete it as soon as possible and within 7 calendar days』、III.D.2.c.i『within 7 calendar days of the revocation』、III.D.2.c.ii『within 30 calendar days』、III.E.4.c/d『no longer than 30 calendar days』、III.E.4.h『must not replace API Data... or create new or derived data or metrics』、III.I.15『offer an API service that allows users to access any data or functionality... provided by the YouTube API Services』、III.L『only applicable to audited developers... starting June 01, 2026』——材料转述与原文一致（R09）。status-and-gaps.md 第 3 节已删去『Owner 可决定是否修订提案措辞』，第 5.2 表与第 5.3 节改为全文依据，N7 的 III.E.4.h/I.15/L 已确认（R10）。『用户』是否含发言观众列为待平台确认，未否定 7 日期限本身。B3 的相反结论已消除。

<a id="vw-sub055-inherit-022"></a>
**VW-SUB055-INHERIT-022@1：satisfied**（source-behavior-review；要求 work:8bd4977aa0770aa2f41229a2#VW-R-022@1）

- expected：本单交付保留原始要求且不改变其它模块职责；实施：VOXWARD-EPIC-007；完整验证：VOXWARD-EPIC-007。记录本单的连接/审查证据，未由本单观察的完整行为继续引用责任单的实际结果，不填写虚构通过。
- 依据：候选 acb37d1 材料审查：本单未做演示/英文材料/视频/参赛提交，status-and-gaps.md 第 2、6.2 节写明这些由 EPIC-007 承接，公开范围/许可证/条款接受待 Owner 决定、未执行。相关段落本轮未变，复用结论。

## 10. 未验证与范围说明

- B2 的危险形状在准入被拒，无法再产生运行耗时；以准入拒绝码与 admitted 形状在输入上限内的实测耗时替代上轮 E31–E34 的秒级复现。数字只来自本机（Node v24.16.0，8 CPU）；V8 正则优化随版本变化，升级 Node 后应复跑 `regex-cost.test.ts`（设计 §5 已注明）。
- 计时用墙钟中位数；重负载下 admitted 形状的单次结果可能偶发抖动，但距 20 ms 预算有数倍余量。
- 政策全文只核对了开发者政策页；派生指标补充条款页仍为前 8000 字符片段，材料已标注，36 个月数值据该片段。OAuth 政策、验证例外、API 表单等外链未核对。
- STORY-002 为复用，未在 acb37d1 重跑；依据为 S002 相关文件 0a1da29..acb37d1 无变化（R10）。
- 本文只写入临时目录 `$KIROCREW_SCRATCH/vw-accept-b2r-out`，不写引擎工单、不提交、不推送。主线程链写时将本文件复制到 `.kiro/specs/voxward-batch2/evidence/rework/acceptance.md`，证据行 locator 指向该路径。
