# S006 返工 2 自测证据（VOXWARD-STORY-006 / VOXWARD-SUB-012，阻断 B3）

简报：`/home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/briefs/b5-s006-fix2.md`。分支 `voxward/s006-fix2`，基于 `fe93a49`（main）。授权 minutes:fd542a49a57a9e6526440dac：本地提交，不推送。
实施模型：宿主报告的当前模型是 claude-sonnet-5.5；简报给出的引擎解析结果是 kiro / claude-sonnet-5.5 / max（rejections=2）。
环境：Node v24.16.0（ICU 78.3，Unicode 17.0），pnpm 12.18.0，非交互（`CI=1`）。

## 1. 提交序列

| 项 | 提交 | 改动 |
| --- | --- | --- |
| B3 修复 | 95b7997 | `apps/server/src/modules/moderation-engine/rules/normalize.ts`；测试：新增 `rules/sound-marks.test.ts`、`rules/sound-mark-cases.ts`，增补 `rules/normalize.test.ts`、`rules/transliterate.test.ts`、`routing/classification.test.ts` |
| spec 与证据 | 本文件所在提交 | `.kiro/specs/voxward-s006-routing/design.md`（4.4、4.8 修订，新增 4.11，第 1、5、7、10 节）；`evidence/rework2-self-check.md`、`rework2-before-after.md`、`rework2-probe.ts`、`rework2-fuzz.mjs`、`rework2-bench.mjs`、`rework2-mutate.py` |

下面的自测都在 95b7997 上运行；第二个提交只含 design.md 与 evidence，不含代码。

## 2. 自测命令与退出码（工作树根）

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | 依赖与锁文件一致 |
| `pnpm build` | 0 | 服务端与 web 构建完成 |
| `pnpm typecheck` | 0 | contracts、server、web 通过 |
| `pnpm test` | 0 | 89 个文件，1370 项通过（简报引用的基线是 88 个文件 941 项；本包新增 1 个测试文件、429 项）。耗时 31 s，运行期间 1 分钟负载 5.2 → 9.7（8 核，其它工作树在运行） |
| `pnpm check:deps` | 0 | 162 个文件，0 违规 |
| `bash …/tools/smoke.sh <工作树> $KIROCREW_SCRATCH/s006-fix2` | 0 | dev：`ok=1 code=200 after 2s`；dist：`ok=1 code=200 after 1s`；结束后无监听 |

在最终提交上（第二个提交，只比上面多 design.md 与 evidence）又运行了 `pnpm typecheck`、`pnpm check:deps`、`pnpm test`：退出码都是 0；`check:deps` 162 个文件 0 违规；`pnpm test` 89 个文件 1370 项通过，耗时 29 s。全量 `pnpm test` 共运行两次，两次都通过。上一轮记录过高负载下的计时类用例（scrypt、`regex-cost`）会失败，本轮两次都没有出现，这不说明它们稳定。

## 3. 修法

- 归一化仍以「单元」为粒度，`normalizeText`（规则模式、噪声判定）、`normalizeField`（归一化副本与正则用的组合副本）、`createTableTransliterator`（键校验与读音）仍共用 `splitUnits` 与 `normalizeUnit`，没有第二套实现。
- `splitUnits`：U+FF9E、U+FF9F（半角浊点、半浊点）与 U+309B、U+309C（独立浊点、半浊点）并入前一个单元，与 `\p{M}`、`\p{Cf}` 同样处理。
- `normalizeUnit` 的顺序：删除不可见字符（全部 `\p{Cf}`，以及同属 `\p{M}` 与 `\p{Default_Ignorable_Code_Point}` 的变体选择符、U+034F 等）→ U+309B、U+309C 转为 U+3099、U+309A → NFKC（`stripCombiningMarks` 开启时先 NFKD 并删组合附加符号区块的标记）→ 小写 → 删除剩下的 `\p{M}`、`\p{Cf}`。半角浊点由 NFKC 直接变成组合浊点，不需单独处理。
- 原文区间映射没有改：单元记录自己的原文区间，命中取所覆盖单元的并集。并入单元的浊点和格式字符因此在区间内，紧跟命中末字符的格式字符在区间内，命中首字符之前的格式字符不在。
- 选了简报给出的第二种做法（在 `splitUnits` 里并入），没有整段 NFKC：整段 NFKC 还会把兼容谚文字母 `ㅂㅏ` 折叠成音节，改变判断 N11 记录的行为，超出 B3。
- 超出判断所列 `\p{Cf}` 的一点：默认可忽略的组合标记（变体选择符 U+FE00–FE0F、U+034F 等）也在组合前删除。它们同样不可见，同样会拦住 NFKC 的组合；只删 `\p{Cf}` 时，`は` + U+FE0F + U+3099 + `か` 仍丢浊点（用例 X-18、X-20，变异 M4）。
- 设计见 `design.md` 4.11：处理顺序、三条路径一致、原文区间、例子表（输入写法 → 匹配副本 → 原文区间）。

## 4. 修复前先跑回归测试

在 `fe93a49` 的源码上（只把 `normalize.ts` 换回 `fe93a49` 的版本，测试是新增版）运行 `pnpm exec vitest run test/moderation-engine`：742 项中 249 项失败，493 项通过。修复后同一组 742 项全部通过。

| 测试文件 | 修复前失败 / 总数 | 修复后失败 |
| --- | --- | --- |
| `rules/sound-marks.test.ts` | 216 / 387 | 0 |
| `rules/normalize.test.ts` | 21 / 44 | 0 |
| `rules/transliterate.test.ts` | 8 / 19 | 0 |
| `routing/classification.test.ts` | 4 / 25 | 0 |
| 其它 12 个文件（含 B1 的原有用例、真值表、路由器、Q12） | 0 | 0 |

失败的全是 B3 的输入：E20 第 13 行、E21 第 1–9 行、ZW-05 至 ZW-08，以及自补的 37 种组合中的 25 种（含半角浊点、独立浊点、被不可见字符隔开的浊点、谚文字母间的格式字符，或组合副本里被格式字符隔开的锐音符）。E20 的其余 16 行（B1 对照）修复前后都通过，说明用例表本身与检查器的接法没有问题。一致性测试（三条路径的单元边界与副本一致）修复前也通过：三条路径本来就共用同一个函数，缺陷在这个共用函数里；该测试防止以后分叉。

## 5. 修复前后对照（B3 关键行）

完整的逐输入对照（94 条规则用例、五个词 × 11 种写法、副本与单元、读音、扣分、分类）在 `rework2-before-after.md`。规则用例 94 条中修复前 39 条与期望不符，修复后 0 条；五个词 × 写法的 165 项检查中修复前 131 项不符，修复后 0 项。

规则 → 正文，格子内是路由结果与命中区间（正文中的 UTF-16 偏移）。粗体是与期望不符。

| 编号 | 规则 → 正文 | 修复前 | 修复后 | 期望 |
| --- | --- | --- | --- | --- |
| E20-13 / E21-01 | 归一化 `バカ` → `ﾊ` U+FF9E `ｶ` | **PASS** | BLOCK [0,3) | BLOCK [0,3) |
| E21-02 | 归一化 `ブス` → `ﾌ` U+FF9E `ｽ` | **PASS** | BLOCK [0,3) | BLOCK [0,3) |
| E21-03 | 归一化 `デブ` → `ﾃ` U+FF9E `ﾌ` U+FF9E | **PASS** | BLOCK [0,4) | BLOCK [0,4) |
| E21-04 | 归一化 `ハゲ` → `ﾊｹ` U+FF9E | **PASS** | BLOCK [0,3) | BLOCK [0,3) |
| E21-05 | 归一化 `ポンコツ` → `ﾎ` U+FF9F `ﾝｺﾂ` | **PASS** | BLOCK [0,5) | BLOCK [0,5) |
| E21-06 | 正则 `バカ` → `ﾊ` U+FF9E `ｶ` | **PASS** | BLOCK [0,3) | BLOCK [0,3) |
| E21-07 | 归一化 `ハカ` → `ﾊ` U+FF9E `ｶ` | **BLOCK [0,3)** | PASS | PASS |
| E21-08 | 归一化 `バカ` → `ハ` U+309B `カ` | **PASS** | BLOCK [0,3) | BLOCK [0,3) |
| E21-09 / ZW-05 | 归一化 `ばか` → `は` U+200B U+3099 `か` | **PASS** | BLOCK [0,4) | BLOCK [0,4) |
| ZW-06 | 归一化 `ばか` → `は` U+2060 U+3099 `か` | **PASS** | BLOCK [0,4) | BLOCK [0,4) |
| ZW-07 | 归一化 `ばか` → `は` U+00AD U+3099 `か` | **PASS** | BLOCK [0,4) | BLOCK [0,4) |
| ZW-08 | 归一化 `はか` → `は` U+200B U+3099 `か` | **BLOCK [0,4)** | PASS | PASS |
| E21-10 | 归一化 `バカ` → `バカ`（`ﾊﾞｶ` 整段 NFKC 的结果） | BLOCK [0,2) | BLOCK [0,2) | BLOCK [0,2) |
| E20-01 至 E20-12、14 至 17 | B1 的全部对照输入 | 与期望相符 | 与期望相符 | 见 `rework2-before-after.md` |

五个词（バカ、ブス、デブ、ハゲ、ポンコツ）× 11 种写法（预组合、假名加组合浊点、半角、全角假名加半角浊点、独立浊点、以及 U+200B、U+2060、U+00AD 各自夹在假名与组合浊点之间和夹在半角假名与半角浊点之间）：归一化规则与正则规则都 BLOCK，区间为整个写法（正文 `x <写法> y` 中为 `[2, 2+长度)`）；对应的无浊点规则（ハカ、フス、テフ、ハケ、ホンコツ）一律不命中。修复前：半角、全角假名加半角浊点、独立浊点和 6 种格式字符写法全部漏拦，且无浊点规则命中其中的半角与格式字符写法。

其它：

| 项 | 修复前 | 修复后 |
| --- | --- | --- |
| 读音，表 `{ガ: ga, カ: ka}`，`ｶﾞｶ`（`ｶ` U+FF9E `ｶ`） | `kaka`，complete=true | `gaka`，complete=true，单元原文 `[0,2) [2,3)` |
| 同表，`カ` U+309B `カ` | `kaka`，complete=true | `gaka`，complete=true |
| 同表，`カ` U+200B U+3099 `カ` | `kaka`，complete=true | `gaka`，complete=true，单元原文 `[0,3) [3,4)` |
| 扣分规则 归一化 `カス`（扣 5），`ガス代が高い` | PASS | PASS |
| 同规则，`ｶ` U+FF9E `ｽ代が高い` | REVIEW [0,3)，扣分 5 | PASS，扣分 0 |
| 同规则，`カスタード`、`ｶｽﾀｰﾄ` U+FF9E | REVIEW [0,2)，扣分 5 | REVIEW [0,2)，扣分 5 |
| 噪声分类 `ﾊ` U+FF9E `ﾊ` U+FF9F `ﾊ`（バパハ） | NOISE（读成 ハハハ） | UNCERTAIN |
| 噪声分类 `ﾊ` U+FF9E 三次（バババ） | NOISE | NOISE |

## 6. 用变异检查测试本身

每次撤销修复的一部分，运行 `test/moderation-engine`（742 项，脚本 `rework2-mutate.py`），修复版在最后恢复并核对。

| 变异 | 失败数 | 分布 |
| --- | --- | --- |
| M1 U+309B、U+309C、U+FF9E、U+FF9F 不并入前一单元 | 176 | sound-marks 150、normalize 16、transliterate 7、classification 3 |
| M2 NFKC 之前不删不可见字符 | 129 | sound-marks 115、normalize 12、transliterate 2 |
| M3 U+309B、U+309C 不转为组合浊点 | 31 | sound-marks 18、normalize 10、transliterate 2、classification 1 |
| M4 只删 `\p{Cf}`，不删默认可忽略的组合标记 | 8 | sound-marks 5、normalize 3 |
| M5 并入单元的字符不更新原文区间的终点 | 68 | sound-marks 60、normalize 7、transliterate 1 |
| M6 只有 U+FF9E 并入，U+FF9F 不并入 | 27 | sound-marks 21、normalize 5、transliterate 1 |

## 7. 随机语料与耗时

随机语料（`rework2-fuzz.mjs`）：30 万个长 1–12 的随机串，字母表含 ASCII、全角拉丁、平假名、片假名、半角假名、六种浊点、九种格式字符、五种不可见标记、组合音符、越南语、谚文音节与字母、兼容谚文字母、阿拉伯语、西里尔字母、汉字、表情及其连接符、兼容字符；每串用两种选项各比一次（共 60 万次）。

- 修复前后的副本不同：65717 次；其中输入不含 U+309B、U+309C、U+FF9E、U+FF9F、`\p{Cf}`、默认可忽略的组合标记的：0 次。即副本只在含这几类字符的文本上改变，其它文本不变。其中 937 次的输入不含四个浊点字符，只含不可见字符，例如谚文字母之间的 U+00AD、组合副本里拉丁字母与锐音符之间的变体选择符：这些是原来被拦住的组合现在完成了。
- 修复后的副本与「先删不可见字符、独立浊点转组合浊点、再整段归一化」的参照不同：3879 次，全部含兼容谚文字母（判断 N11，修复前后相同）；不含兼容谚文字母的输入：0 次。
- 单元映射检查（原文区间首尾相接且覆盖全文，副本区间首尾相接，副本等于 `normalizeText`）：违反 0 次。

耗时（`rework2-bench.mjs`，`normalizeField` 处理 300–500 字符的正文，每格 9 轮 × 300 次的中位数，修复前后交替运行两次取平均，负载约 2）：

| 样本 | 选项 | 修复前 ms/次 | 修复后 ms/次 | 倍数 |
| --- | --- | --- | --- | --- |
| ASCII 聊天行（500 字符） | strip=true | 0.0840 | 0.1355 | 1.61 |
| ASCII 聊天行（500 字符） | strip=false | 0.0471 | 0.0961 | 2.04 |
| 日文（420 字符） | strip=true | 0.1208 | 0.1880 | 1.56 |
| 日文（420 字符） | strip=false | 0.0832 | 0.1478 | 1.78 |
| 半角假名加浊点（500 字符） | strip=true | 0.1717 | 0.1964 | 1.14 |
| 半角假名加浊点（500 字符） | strip=false | 0.1223 | 0.1582 | 1.29 |
| 含格式字符（300 字符） | strip=true | 0.0613 | 0.0841 | 1.37 |
| 含格式字符（300 字符） | strip=false | 0.0398 | 0.0643 | 1.61 |

归一化变慢约 1.1–2.0 倍，每次调用增加 0.02–0.07 ms。它发生在规则预算（20 ms）开始之前。没有加快速路径：绝对值很小，且简报没有要求。

## 8. 行为变化（除 B3 要求之外的后果）

- 副本中的 U+309B、U+309C 不再留下一个空格：`ba゛dword` 现在命中 `badword`（修复前副本是 `ba dword`）。
- 组合副本里，不可见字符不再拦住组合：`cafe` + U+200B + U+0301 的组合副本是 `café`，正则 `café` 命中（修复前不命中，用例 X-35）。
- 谚文字母之间的格式字符不再拦住音节的组合：`ᄇ` + U+200B + `ᅡ` 的副本是 `바`（用例 X-16）。
- 噪声分类：`ﾊﾞﾊﾟﾊ` 这类由不同浊点假名组成的串不再被读成同一字符重复三次而判为 NOISE。

## 9. 未验证项与残余风险

- 真实直播语料、真实平台消息：未涉及，测试全部是合成数据。
- 判断 N11 的各项（兼容谚文字母不折叠、tatweel 不删、越南语声调与 й、ё 折叠）：行为没变，按简报不扩大。用例 KO-07、AR-04、VI-02、VI-03、RU-01、RU-02 把当前结果固定下来，只是为了证明没有被这次修改带动，不表示这些结果是需求。
- 同形异码（如西里尔字母 а 与拉丁字母 a）、谚文填充字符等其它写法：未验证。
- 正则规则的模式源串不归一化（设计 4.8 未改）：写成半角的正则源串既不命中全角也不命中半角正文（用例 X-36、X-37）。
- 简报自测清单之外未运行：`kiro-specs.mjs check`（E10）、`drizzle-kit check`、迁移链探针（E60、E61）、外连拦截下的全量测试（E31）、跨包探针（E70、E71）。`design.md` 的改动全部在受管段（第 1–53 行）之后。
- 全量 `pnpm test` 运行了两次（见第 2 节），都通过；没有在空闲宿主上取得更多样本。

## 10. 偏离与自定

- 做法：在 `splitUnits` 并入浊点（简报的第二种），不整段 NFKC。
- 默认可忽略的组合标记也在组合前删除，超出判断所列的 `\p{Cf}`（理由见第 3 节）。
- 新增的测试辅助模块 `sound-mark-cases.ts` 不是测试文件，由 `sound-marks.test.ts` 和对照探针共用，保证两处跑的是同一张输入表。
- 没有改：`transliterate.ts`、`groups.ts`、`engine.ts`、`span-map.ts`、`classification.ts`、主工作区、`.kiro/steering`、skills；没有写引擎工单；没有推送。
