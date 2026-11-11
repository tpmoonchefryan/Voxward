# 第 5a 批判断（第 4 批返工 S006、S008 复验；第 5 批提前的 S017、S018 新验）

- 实际模型：kiro / claude-opus-5.5 / max。宿主报告的当前模型是 claude-opus-5.5，没有改用其它模型。
- 候选：本地 main `b1a1471`（`fa5dc19` 系列 main 上依次合入 `voxward/s006-fix`、`voxward/s008-fix`、`voxward/s017-log-viewer`、`voxward/s018-data-panel`）。
- 范围：11 张工单、134 行验收（简报写 10 张单，工单表实为 11 张，本轮按表覆盖）。satisfied 132 行，failed 2 行，unverified 0 行。逐条依据见 `.kiro/specs/voxward-batch5a/evidence/acceptance.md`，证据草稿见 `evidence-records.json`。
- 判断人：独立验收兼判断子代理（main 档），未参与实现，也没有做过第 4 批验收；验收、判断与 lessons 一次完成。

| Story | 判定 | 行数 | 阻断 | 归属 |
| --- | --- | --- | --- | --- |
| VOXWARD-STORY-006 | **打回** | 21 satisfied、2 failed（STORY INHERIT-003、SUB-012 INHERIT-003） | B3 | SUB-012 |
| VOXWARD-STORY-008 | **通过** | 35/35 satisfied（STORY 11、SUB-015 12、SUB-016 12） | 无 | — |
| VOXWARD-STORY-017 | **通过** | 38/38 satisfied（STORY 12、SUB-031 13、SUB-032 13） | 无 | — |
| VOXWARD-STORY-018 | **通过** | 38/38 satisfied（STORY 12、SUB-033 13、SUB-034 13） | 无 | — |

- rejection 计数：实施包 P-S006 第 2 次打回，记在 SUB-012，下次派工按 master A8 用 `--rejections 2` 解析模型。P-S008 本轮通过（此前 1 次）。P-S017、P-S018 为 0。
- 本批整体门禁：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`（941/941）、`pnpm check:deps`（162 个文件 0 违规）通过；默认配置下 `pnpm dev` 与 `node dist/main.js` 启动、`/healthz` 200、只绑 127.0.0.1；`drizzle-kit check` 通过；全量测试在外连拦截下对外部主机 0 次连接，真实 `kiro-cli` 0 次调用。门禁全绿，但 STORY-006 被打回，主线程汇报时不能写成「本批全部通过」。
- Spec：S006 为 SPEC_STALE（rev 5）、S008 为 SPEC_STALE（rev 6），原因是第 4 批链写与 D1 改版，属预期；S017、S018 为 SPEC_CURRENT（rev 4）。设计与代码的不一致见 B3、N1、N5、N7。

## 阻断发现

### B3 匹配副本仍会丢失日文浊点与半浊点：半角写法与被格式字符隔开的组合浊点（B1 同类，归属 SUB-012）

- 触发：规则集使用归一化或正则规则（或读音规则加转写表），规则中的词含浊音、半浊音假名；正文用半角片假名书写（浊点、半浊点是单独的 U+FF9E、U+FF9F），或用独立浊点符号 U+309B、U+309C，或在假名与组合浊点 U+3099/U+309A 之间夹了格式字符（U+200B、U+2060、U+00AD 等 `\p{Cf}`）（acceptance.md E20、E21，§2.0、§2.1）。
- 当前行为（b1a1471）：`splitUnits` 只把 `\p{M}`、`\p{Cf}` 与谚文中、终声字母并入前一单元，`normalizeUnit` 逐单元做 NFKC。U+FF9E、U+FF9F（`\p{Lm}`）各自成单元，NFKC 把它们变成组合浊点后没有可组合的基字，随后被删除 `\p{M}` 的一步去掉；格式字符与组合浊点同在一个单元时，NFKC 在格式字符处停止组合，浊点同样被删。于是 `ﾊﾞｶ`→`ハカ`、`ﾌﾞｽ`→`フス`、`ﾃﾞﾌﾞ`→`テフ`、`ﾊｹﾞ`→`ハケ`、`ﾎﾟﾝｺﾂ`→`ホンコツ`、`ハ゛カ`→`ハ カ`、`は` + U+200B + U+3099 + `か`→`はか`，而整段 NFKC 本应得到 バカ、ブス、デブ、ハゲ、ポンコツ。实测：
  - 漏拦：归一化规则 バカ、ブス、デブ、ハゲ、ポンコツ 对上述半角写法全部 PASS；正则 バカ 对 ﾊﾞｶ PASS；归一化规则 ばか 对夹 U+200B、U+2060、U+00AD 的三种写法 PASS。
  - 误伤：归一化规则 ハカ 命中 ﾊﾞｶ；归一化扣分规则 カス（扣 5）对「ガス代が高い」为 PASS，对写成半角的「ｶﾞｽ代が高い」为 REVIEW 并带扣分 5。
  - 转写：表 `{ガ: ga, カ: ka}` 把 ｶﾞｶ 读成 kaka 且 complete=true。
  - S004 基线 f4808fb 对这些输入的结果相同；c67db24（fa5dc19 的规则代码）只因规则与正文两侧都删全部标记而偶然命中，同时带来了 B1。
- 契约：VW-R-003「基础检查覆盖昵称、正文和组合，包含精确、归一化、读音/转写及有界正则」，本组两行 INHERIT-003 要求继续遵守；提案 §4.3 把 NFKC 列为归一化步骤，并要求「规则需区分语言与误报风险，不能用未经校准的同音相似性自动惩罚所有匹配文本」；提案 §9.1、§18.2 把日文列为评估语种；第 4 批 B1 的复验要求「ば/は、バ/ハ 不再互相命中」，而 ﾊﾞ 与 バ 在 NFKC 下是同一个字；本轮简报要求另构造「组合符号与零宽字符混用」等组合，确认既没有漏拦也没有误伤。
- 影响：含浊音、半浊音片假名的归一化与正则 BLOCK 规则，可以被半角写法绕过。半角片假名是日文网络书写的常见形式，不需要特意构造。被绕过的消息在基础检查中为 PASS，白名单或达到评分阈值的观众随即走快速放行，不经 AI 审核就下发；其余观众进入 AI 审核。写成半角的无辜词会被不带浊点的规则命中并扣分；读音规则把半角浊音读成清音且标为完整。S006 设计 §4.8 写的「U+3099 保留，经 NFKC 重新组合」只对与前字处于同一单元的组合浊点成立；返工测试只覆盖了预组合的 が 与「か + U+3099」，所以自测与门禁发现不了。
- 判为阻断的理由：这是 B1 的同一类缺陷（匹配副本丢失浊点，导致 バ/ハ 互相命中、正则与转写失效），只是输入换成了 NFKC 等价的写法；B1 复验的明确要求在这些写法下不成立；日文是提案点名的语种。它在 S004 基线上已经存在，不是本批引入的回归，但 S006 本批改的正是这段归一化，并在设计中声称已保留日文浊点。
- 文件：`apps/server/src/modules/moderation-engine/rules/normalize.ts`（`splitUnits` 的 `ATTACHES_TO_PREVIOUS`，`normalizeUnit` 中 NFKC 与删除 `\p{M}\p{Cf}` 的先后）、`rules/transliterate.ts`（逐单元读音）、`apps/server/test/moderation-engine/rules/normalize.test.ts`、`transliterate.test.ts`、`engine.test.ts`；提交 `58e2ced`（VOXWARD-SUB-012 B1）。
- 修复方向（实现由 SUB-012 选择，验收只看结果）：先删除 `\p{Cf}`，再对整段做 NFKC，然后按码点对应关系重建单元与区间映射；或者在 `splitUnits` 中把 U+FF9E、U+FF9F、U+309B、U+309C 并入前一单元，并在 NFKC 之前删除单元内的 `\p{Cf}`。U+309B/U+309C 的 NFKC 结果带一个空格，需要先映射为 U+3099/U+309A。正则副本与转写表读音走同一路径。测试至少加入半角浊音与半浊音（ﾊﾞｶ、ﾎﾟﾝｺﾂ）、独立浊点（ハ゛カ）、浊点前夹格式字符（は + U+200B + U+3099 + か）、反向误伤（カス 对 ｶﾞｽ）与读音（ｶﾞｶ）。
- 复验：E20（B1 对照与额外组合）与 E21 全部输入：上述规则对半角与格式字符写法为 BLOCK，ハカ 不命中 ﾊﾞｶ，カス 不命中 ｶﾞｽ，ｶﾞｶ 读作 gaka；第 4 批 B1 的复验输入保持通过；S004 规则测试、本组路由测试（`classification.ts` 也调用 `normalizeText`）与完整门禁。

## 第 4 批阻断与决定的复验结论

- B1：E20 §3 那组对照输入全部符合：拉丁字母绕过仍被拦截（归一化 badword 对 ba 加 U+0301 加 dword 与预组合 bádword 都 BLOCK）；ば/は、バ/ハ 的全角写法不再互相命中；正则 ばか、バカ、café 命中原文；含 が 键的转写表能构建并读出 gaka。第 4 批 N1 已修正（真值表与流程图 96/96 一致），N9、N10 已写进 S006 设计。但 B1 同类的缺口在半角与格式字符写法下仍在，见 B3。
- B2：已修复。崩溃演练删除请求 1 次、notObserved 0；存活孤儿在 `/proc/<pid>/cwd` 确认身份后才被终止，删除请求在 CLI 退出之后发出；没有流出会话 ID 的孤儿经会话列表找到并删除；pid 被同用户无关进程复用时不发信号，被另一用户进程复用时保留目录并写原因码（acceptance.md E30 §4–§7）。第 4 批 N3（agent 模板与分账号说明）、N4（结果回传 itemId、理由码、命中区间）、N9 的 S008 部分已完成。
- D1：Owner 已决定（b）。S008 组 18 行第 2 版按「假 CLI 替身测试，真实调用未验证，移到 STORY-029」判定，全部 satisfied；真实演练由 VOXWARD-STORY-029 的 VW-S029-KIRO-REAL 承接。

## 非阻断建议

编号为本轮编号；引用第 4 批的编号时写「第 4 批 Nx」。

| 编号 | 内容 | 依据 | 建议归属 |
| --- | --- | --- | --- |
| N1 | S008 设计 §9 自称「与上文不一致处以本节为准」，却仍写「孤儿扫描：进程仍存活的目录跳过，不强制终止进程」与「`deploy/kiro-runtime/` 没有 agent 配置模板」，与返工后的代码、README、`ai-retention-boundary.md` 相反；§2 记录的仍是 3.1.0 的帮助。 | acceptance.md §1.1、E30 | SUB-016 下次修改时更新，最迟在 STORY-009 接线之前 |
| N2 | 本机 kiro-cli 在 2026-11-11 02:20 自动升级为 3.2.0（第 4 批 E11 为 3.1.0），代码中的 `KIRO_CLI_TESTED_VERSION` 与 D1 方法写的是 3.1.0。适配器用到的参数在 3.2.0 的帮助中仍在、含义不变，3.2.0 新增 `--all-cwds`、`--sessions` 等。不固定版本、不关自动更新，「固定版本」的演练与部署都无法保证。 | E11 | STORY-029：VW-S029-KIRO-REAL 演练写明所用版本，部署说明写版本固定方式 |
| N3 | Kiro 适配器与孤儿扫描（启动一次加周期执行）都还没有接入组合根，运行中的服务不会执行扫描；README 与 `ai-retention-boundary.md` 如实写明。 | E30 §7、`main.ts` | STORY-009（TaskCoordinator 接线） |
| N4 | 查看器缓存的失效总线由 `buildApp` 自建，`main.ts` 不传 `invalidation`，组合根之外拿不到这条总线。以后的删除路径若另建 AuditStore 与总线，删除不会让查看器缓存失效；本轮在同一进程共用总线时失效正常。 | E40 删除用例、`app.ts`、`main.ts` | STORY-019：删除编排接线时在组合根创建一条总线，同时交给 `buildApp` 与 AuditStore |
| N5 | 查看器显示的「契约版本」取读取时的 `CONTRACT_VERSION` 常量，不是条目写入时校验所用的 AI 契约版本，技术日志也没有记录这个值。目前只有版本 1，显示正确；契约升级后旧条目会被标成新版本。 | E41、`viewer/queries.ts` 的 `toTechnicalItem` | STORY-009：写入方在 data 中记录契约名与版本；查看器随后改读条目值 |
| N6 | 按流程图修正第 4 批 N1 后，例外用户的付费文本走 REALTIME_REVIEW，复核上下文不带付费标记。提案 §4.2 第 3 条「需要精翻时在同一任务生成小抄」对例外用户的 Super Chat 是否仍要做，尚未定义。 | E20 §3–4、`router.ts` 的 `ReviewContext` | STORY-010（SC 任务）决定；STORY-009 接线时保留付费标记 |
| N7 | 同一账号在同一频道只能有一条有效授权，主播账号因此不能同时持有 CHANNEL_OWNER 与 DATA_ADMIN：授予 DATA_ADMIN 会撤销主播角色（E52）。S003 设计 §4.1「主播要处理数据请求，需要另外持有 DATA_ADMIN 成员身份」与 S018 设计 §6「需同时持有」在现有数据模型下做不到，主播只能用另一个账号处理数据请求。提案 §2.1 写数据管理员「可由主播本人兼任」，§11.2 写面板「面向主播及获授权的数据管理员」。验收行只要求有、无数据权限两类人员，所以不阻断。 | E50、E52 | STORY-022（成员与角色管理）：给主播提供显式开启的数据权限（类似 `log_access` 的单独授予），或写明第二账号做法；同时改正 S003、S018 设计中的说法 |
| N8 | 主体只能按内部 `subjects.id` 定位。观众提出请求时给出的是平台身份，面板没有从平台身份到主体的入口；没有日志权限的数据管理员在产品内无法得知 `subjects.id`。`platform_subject_key` 的派生方式也还没有定义。 | E50、S018 设计 §6 | STORY-019（受理观众请求时需要定位主体），依赖 STORY-013 定下派生方式 |
| N9 | 「仅删除数据」的说明末句「之后的发言仍按现有规则计分」，对已有记分例外的主体容易被理解为恢复计分；提案 §11.2 的写法是「后续处理遵循有效授权、现有偏好和频道规则」。前半句「不新增、也不撤销记分例外」是清楚的。 | E51 | STORY-019 接入执行时一并改文案：主体有例外时写明例外继续有效 |
| N10 | 受控材料只含标识与计数，不含主体数据，用于访问请求时不足以交付。S018 设计已写明访问请求的执行与材料格式未定义。 | `export-material.ts`、E50 | 实现访问请求执行的 Story（STORY-019） |
| N11 | 归一化副本的其它文字表现：越南语声调与西里尔字母 й、ё 自 Q6 起被折叠（má 命中 ma 与 mà，мой 命中 мои），正则与精确规则仍区分；阿拉伯语 tatweel（U+0640）与韩文兼容字母（ㅂㅏㅂㅗ）各版本都不折叠。这些语种不在提案点名的评估语种内。 | E20 §2 | 规则配置界面所在的 Story（STORY-022）：提供按文字或按规则集的选项，并在界面说明 |
| N12 | D1 改版脚本只改了方法与版本号：S008 组 10 行子单场景的后缀仍写「继承自 … @1」，SUB-015、SUB-016 的 STORY 行 expected 仍写「VW-S008-AC001@1」。引擎没有报结构问题，不影响判定。 | E01 | 主线程：下次注解这些工单时顺带改；以后改版脚本同时改写交叉引用 |
| N13 | `toRequestRecord` 遇到 `subject_id` 为空的数据请求会抛错（接口返回 500），而该列可空；目前只有直接改库才会出现。 | `db/data-request-store.ts` | STORY-019（出现其它写入路径时处理） |

## 复验范围

- 证据失效：B3 返工会改 `moderation-engine/rules/`（可能还有调用 `normalizeText` 的 `routing/classification.ts` 的结果），使 STORY-006 组全部 23 行失效，要在新候选上重新盖章。重跑 E20 全部（B1 对照、额外组合、96 组合与流程图比对、路由器场景、Q12）与 E21；源码不在 `rules/`、`routing/` 的部分（Q8 迁移，E60）若 diff 为空可以复用。
- STORY-008、STORY-017、STORY-018：在 `b1a1471` 上通过，可以按本轮证据以 `b1a1471` 链写关单。若主线程改在 S006 返工后的新候选上关单，先确认下列路径的 diff 为空，再复用本轮证据并重新盖 codeVersion；有改动则重跑对应探针：
  - S008：`apps/server/src/adapters/kiro-cli/`、`apps/server/src/adapters/synthetic/`、`apps/server/src/modules/inference-provider/`、`packages/contracts/src/modules/inference-provider.ts`、`packages/contracts/src/ai/`、`deploy/kiro-runtime/`、`docs/security/`、`apps/server/test/adapters/`（E30、E32）。
  - S017：`apps/server/src/modules/audit-store/`、`apps/server/src/auth/`、`apps/server/src/db/audit-log.ts`、`apps/server/src/app.ts`、`packages/contracts/src/viewer/`、`packages/contracts/src/ports/audit-log.ts`、`apps/web/src/pages/logs/`、`apps/web/src/components/untrusted-text/`、`apps/web/vite.config.ts`（E40、E41）。
  - S018：`apps/server/src/modules/data-lifecycle-service/`、`apps/server/src/auth/`、`apps/server/src/db/`（含 `schema/` 与 `migrations/`）、`docs/data-dictionary.md`、`packages/contracts/src/ports/data-request.ts`、`apps/web/src/pages/data/`、`apps/server/src/app.ts`、`apps/web/vite.config.ts`（E50、E51、E60、E61）。
- 每个新候选都要重跑：install --frozen-lockfile、build、typecheck、test、check:deps（E02–E06）、默认配置冒烟（E07）、外连拦截下的全量测试（E31）、迁移链与数据字典（E60、E61）、跨包检查（E70、E71）、四份 spec 的 check（E10）。
- 探针、假 CLI、联调夹具与浏览器脚本的副本在交付目录 `probes/`，复验时可直接复用（需要 `apps/server/node_modules/.bin/tsx` 与 headless shell 路径）。
