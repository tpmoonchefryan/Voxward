# S006 返工 2（B3）修复前后的逐输入对照

- 修复前：`fe93a49`（main，B3 被判定时的代码）。修复后：`95b7997`。两次运行除 `rules/normalize.ts` 外完全相同：修复前的一次把该文件换回 `fe93a49` 的版本，运行后立即恢复并核对了哈希。
- 输入表：`apps/server/test/moderation-engine/rules/sound-mark-cases.ts`，与回归测试 `sound-marks.test.ts` 用同一张表。探针：同目录下的 `rework2-probe.ts`（用法见文件头）。
- 每个格子是真实检查器（`createModerationChecker`，昵称固定为 `Viewer`，规则放在一个 BLOCK 组或 DEDUCT 组）对该输入的路由结果和命中区间。区间 `[起,止)` 是正文中的 UTF-16 偏移；多个命中用逗号分隔。「期望」列的区间由正文的写法直接得出（命中文本在正文中的位置），不是代码算出来的。
- **粗体**是与期望不符的结果。
- 汇总：规则用例 94 条，修复前 39 条与期望不符，修复后 0 条；五个词 × 11 种写法 × 3 种规则共 165 项检查，修复前 131 项不符，修复后 0 项。
- 输入中的不可见字符、浊点和组合字符写成 `\uXXXX`。「组合副本」指正则规则匹配的副本；表中的「副本」是归一化规则匹配的副本（默认选项）。

### E20 section 1 (B1 contrast and neighbours)

| 编号 | 规则 → 正文 | 修复前 | 修复后 | 期望 |
| --- | --- | --- | --- | --- |
| E20-01 | normalized badword → `ba\u0301dword` | BLOCK [0,8) | BLOCK [0,8) | BLOCK [0,8) |
| E20-02 | normalized badword → `bádword` | BLOCK [0,7) | BLOCK [0,7) | BLOCK [0,7) |
| E20-03 | normalized ばか → `ばか` | BLOCK [0,2) | BLOCK [0,2) | BLOCK [0,2) |
| E20-04 | normalized ばか → `はかまいりにいく` | PASS | PASS | PASS |
| E20-05 | normalized バカ → `ハカセ` | PASS | PASS | PASS |
| E20-06 | regex ばか → `ばか` | BLOCK [0,2) | BLOCK [0,2) | BLOCK [0,2) |
| E20-07 | regex バカ → `バカ` | BLOCK [0,2) | BLOCK [0,2) | BLOCK [0,2) |
| E20-08 | regex café → `café` | BLOCK [0,4) | BLOCK [0,4) | BLOCK [0,4) |
| E20-09 | exact ばか → `ばか` | BLOCK [0,2) | BLOCK [0,2) | BLOCK [0,2) |
| E20-10 | regex café → `cafe\u0301` | BLOCK [0,5) | BLOCK [0,5) | BLOCK [0,5) |
| E20-11 | normalized ばか → `は\u3099か` | BLOCK [0,3) | BLOCK [0,3) | BLOCK [0,3) |
| E20-12 | regex ばか → `は\u3099か` | BLOCK [0,3) | BLOCK [0,3) | BLOCK [0,3) |
| E20-13 | normalized バカ → `ﾊ\uFF9Eｶ` | **PASS** | BLOCK [0,3) | BLOCK [0,3) |
| E20-14 | normalized はか → `ばか` | PASS | PASS | PASS |
| E20-15 | normalized ハカ → `バカ` | PASS | PASS | PASS |
| E20-16 | normalized ぱん → `はん` | PASS | PASS | PASS |
| E20-17 | regex badword → `ba\u0301dword` | PASS | PASS | PASS |

### E21 (half-width, spacing mark, whole-string NFKC)

| 编号 | 规则 → 正文 | 修复前 | 修复后 | 期望 |
| --- | --- | --- | --- | --- |
| E21-01 | normalized バカ → `ﾊ\uFF9Eｶ` | **PASS** | BLOCK [0,3) | BLOCK [0,3) |
| E21-02 | normalized ブス → `ﾌ\uFF9Eｽ` | **PASS** | BLOCK [0,3) | BLOCK [0,3) |
| E21-03 | normalized デブ → `ﾃ\uFF9Eﾌ\uFF9E` | **PASS** | BLOCK [0,4) | BLOCK [0,4) |
| E21-04 | normalized ハゲ → `ﾊｹ\uFF9E` | **PASS** | BLOCK [0,3) | BLOCK [0,3) |
| E21-05 | normalized ポンコツ → `ﾎ\uFF9Fﾝｺﾂ` | **PASS** | BLOCK [0,5) | BLOCK [0,5) |
| E21-06 | regex バカ → `ﾊ\uFF9Eｶ` | **PASS** | BLOCK [0,3) | BLOCK [0,3) |
| E21-07 | normalized ハカ → `ﾊ\uFF9Eｶ` | **BLOCK [0,3)** | PASS | PASS |
| E21-08 | normalized バカ → `ハ\u309Bカ` | **PASS** | BLOCK [0,3) | BLOCK [0,3) |
| E21-09 | normalized ばか → `は\u200B\u3099か` | **PASS** | BLOCK [0,4) | BLOCK [0,4) |
| E21-10 | normalized バカ → `バカ` | BLOCK [0,2) | BLOCK [0,2) | BLOCK [0,2) |

### E20 section 2 (kana and format characters)

| 编号 | 规则 → 正文 | 修复前 | 修复后 | 期望 |
| --- | --- | --- | --- | --- |
| ZW-03 | normalized ばか → `ば\u200Bか` | BLOCK [0,3) | BLOCK [0,3) | BLOCK [0,3) |
| ZW-04 | regex ばか → `ば\u200Bか` | BLOCK [0,3) | BLOCK [0,3) | BLOCK [0,3) |
| ZW-05 | normalized ばか → `は\u200B\u3099か` | **PASS** | BLOCK [0,4) | BLOCK [0,4) |
| ZW-06 | normalized ばか → `は\u2060\u3099か` | **PASS** | BLOCK [0,4) | BLOCK [0,4) |
| ZW-07 | normalized ばか → `は\u00AD\u3099か` | **PASS** | BLOCK [0,4) | BLOCK [0,4) |
| ZW-08 | normalized はか → `は\u200B\u3099か` | **BLOCK [0,4)** | PASS | PASS |
| ZW-09 | normalized ばか → `ば\u200B\u3099か` | BLOCK [0,4) | BLOCK [0,4) | BLOCK [0,4) |

### E20 section 2 (Korean, Vietnamese, Arabic, Latin, Cyrillic, Chinese)

| 编号 | 规则 → 正文 | 修复前 | 修复后 | 期望 |
| --- | --- | --- | --- | --- |
| KO-01 | normalized 바보 → `바보` | BLOCK [0,2) | BLOCK [0,2) | BLOCK [0,2) |
| KO-02 | normalized 바보 → `\u1107\u1161\u1107\u1169` | BLOCK [0,4) | BLOCK [0,4) | BLOCK [0,4) |
| KO-03 | regex 바보 → `\u1107\u1161\u1107\u1169` | BLOCK [0,4) | BLOCK [0,4) | BLOCK [0,4) |
| KO-04 | normalized 바보 → `파보` | PASS | PASS | PASS |
| KO-05 | normalized 바보 → `바부` | PASS | PASS | PASS |
| KO-06 | normalized 바보 → `바\u200B보` | BLOCK [0,3) | BLOCK [0,3) | BLOCK [0,3) |
| KO-07 | normalized 바보 → `ㅂㅏㅂㅗ` | PASS | PASS | PASS |
| VI-01 | normalized má → `má` | BLOCK [0,2) | BLOCK [0,2) | BLOCK [0,2) |
| VI-02 | normalized má → `ma` | BLOCK [0,2) | BLOCK [0,2) | BLOCK [0,2) |
| VI-03 | normalized má → `mà` | BLOCK [0,2) | BLOCK [0,2) | BLOCK [0,2) |
| VI-04 | regex má → `ma` | PASS | PASS | PASS |
| VI-05 | regex má → `ma\u0301` | BLOCK [0,3) | BLOCK [0,3) | BLOCK [0,3) |
| VI-06 | exact má → `má` | BLOCK [0,2) | BLOCK [0,2) | BLOCK [0,2) |
| AR-01 | normalized كلب → `ك\u064Eل\u0652ب\u064C` | BLOCK [0,6) | BLOCK [0,6) | BLOCK [0,6) |
| AR-02 | regex كلب → `ك\u064Eل\u0652ب\u064C` | BLOCK [0,6) | BLOCK [0,6) | BLOCK [0,6) |
| AR-03 | normalized كلب → `ﻛﻠﺐ` | BLOCK [0,3) | BLOCK [0,3) | BLOCK [0,3) |
| AR-04 | normalized كلب → `كـلـب` | PASS | PASS | PASS |
| ZW-01 | normalized badword → `ba\u200B\u0301dword` | BLOCK [0,9) | BLOCK [0,9) | BLOCK [0,9) |
| ZW-02 | normalized badword → `b\u200Dad\u2060word` | BLOCK [0,9) | BLOCK [0,9) | BLOCK [0,9) |
| RU-01 | normalized мой → `мои` | BLOCK [0,3) | BLOCK [0,3) | BLOCK [0,3) |
| RU-02 | normalized ёж → `еж` | BLOCK [0,2) | BLOCK [0,2) | BLOCK [0,2) |
| ZH-01 | normalized 笨蛋 → `笨蛋` | BLOCK [0,2) | BLOCK [0,2) | BLOCK [0,2) |
| ZH-02 | normalized 笨蛋 → `笨\u200B蛋` | BLOCK [0,3) | BLOCK [0,3) | BLOCK [0,3) |

### Extra combinations of this rework

| 编号 | 规则 → 正文 | 修复前 | 修复后 | 期望 |
| --- | --- | --- | --- | --- |
| X-01 | normalized バカ → `ハ\uFF9Eカ` | **PASS** | BLOCK [0,3) | BLOCK [0,3) |
| X-02 | normalized バカ → `ﾊ\uFF9Eカ` | **PASS** | BLOCK [0,3) | BLOCK [0,3) |
| X-03 | normalized ばか → `は\uFF9Eか` | **PASS** | BLOCK [0,3) | BLOCK [0,3) |
| X-04 | regex バカ → `ハ\uFF9Eカ` | **PASS** | BLOCK [0,3) | BLOCK [0,3) |
| X-05 | normalized ハカ → `ハ\uFF9Eカ` | **BLOCK [0,3)** | PASS | PASS |
| X-06 | normalized パン → `ﾊ\uFF9Fﾝ` | **PASS** | BLOCK [0,3) | BLOCK [0,3) |
| X-07 | normalized ハン → `ﾊ\uFF9Fﾝ` | **BLOCK [0,3)** | PASS | PASS |
| X-08 | normalized パン → `ハ\u309Cン` | **PASS** | BLOCK [0,3) | BLOCK [0,3) |
| X-09 | normalized パン → `ハ\u2060\u309Aン` | **PASS** | BLOCK [0,4) | BLOCK [0,4) |
| X-10 | normalized パン → `ﾊ\uFF9Eﾝ` | PASS | PASS | PASS |
| X-11 | normalized バン → `ﾊ\uFF9Fﾝ` | PASS | PASS | PASS |
| X-12 | normalized バーカ → `ﾊ\uFF9Eｰｶ` | **PASS** | BLOCK [0,4) | BLOCK [0,4) |
| X-13 | normalized バカ → `ﾊ\uFF9Eｰｶ` | PASS | PASS | PASS |
| X-14 | normalized ハーカ → `ﾊ\uFF9Eｰｶ` | **BLOCK [0,4)** | PASS | PASS |
| X-15 | regex バーカ → `ﾊ\uFF9Eｰｶ` | **PASS** | BLOCK [0,4) | BLOCK [0,4) |
| X-16 | normalized 바보 → `\u1107\u200B\u1161\u1107\u1169` | **PASS** | BLOCK [0,5) | BLOCK [0,5) |
| X-17 | normalized 바보 → `\u1107\u1161\u200B\u1107\u1169` | BLOCK [0,5) | BLOCK [0,5) | BLOCK [0,5) |
| X-18 | normalized ばか → `は\uFE0F\u3099か` | **PASS** | BLOCK [0,4) | BLOCK [0,4) |
| X-19 | normalized ばか → `は\u034F\u3099か` | BLOCK [0,4) | BLOCK [0,4) | BLOCK [0,4) |
| X-20 | normalized はか → `は\uFE0F\u3099か` | **BLOCK [0,4)** | PASS | PASS |
| X-21 | normalized badword → `ba\uFF9Edword` | BLOCK [0,8) | BLOCK [0,8) | BLOCK [0,8) |
| X-22 | normalized badword → `ba\u309Bdword` | **PASS** | BLOCK [0,8) | BLOCK [0,8) |
| X-23 | normalized バカ → `😀ﾊ\uFF9Eｶ` | **PASS** | BLOCK [2,5) | BLOCK [2,5) |
| X-24 | normalized バカ → `ﾊ\uFF9Eｶ ﾊ\uFF9Eｶ` | **PASS** | BLOCK [0,3), [4,7) | BLOCK [0,3), [4,7) |
| X-25 | normalized バカ → `あ\u200Bﾊ\uFF9Eｶ` | **PASS** | BLOCK [2,5) | BLOCK [2,5) |
| X-26 | normalized バカ → `ﾊ\uFF9Eｶ\u200Bx` | **PASS** | BLOCK [0,4) | BLOCK [0,4) |
| X-27 | normalized バカ → `\u200Bﾊ\uFF9Eｶ` | **PASS** | BLOCK [1,4) | BLOCK [1,4) |
| X-28 | normalized ﾊ\uFF9Eｶ → `バカ` | **PASS** | BLOCK [0,2) | BLOCK [0,2) |
| X-29 | normalized ﾊ\uFF9Eｶ → `ハカ` | **BLOCK [0,2)** | PASS | PASS |
| X-30 | normalized は\u200B\u3099か → `ばか` | **PASS** | BLOCK [0,2) | BLOCK [0,2) |
| X-31 | normalized tieng → `tie\u0302\u0301ng` | BLOCK [0,7) | BLOCK [0,7) | BLOCK [0,7) |
| X-32 | normalized tieng → `tie\u0302\u200B\u0301ng` | BLOCK [0,8) | BLOCK [0,8) | BLOCK [0,8) |
| X-33 | normalized tieng → `tiếng` | BLOCK [0,5) | BLOCK [0,5) | BLOCK [0,5) |
| X-34 | normalized tieng → `tiêu` | PASS | PASS | PASS |
| X-35 | regex café → `cafe\u200B\u0301` | **PASS** | BLOCK [0,6) | BLOCK [0,6) |
| X-36 | regex ﾊ\uFF9Eｶ → `バカ` | PASS | PASS | PASS |
| X-37 | regex ﾊ\uFF9Eｶ → `ﾊ\uFF9Eｶ` | PASS | PASS | PASS |

### 五个词 × 写法（规则在正文 `x <写法> y` 中的结果；括号内是区间）

**バカ**

| 写法 | 归一化规则 修复前 | 归一化规则 修复后 | 正则 修复前 | 正则 修复后 | 无浊点规则 修复前 | 无浊点规则 修复后 |
| --- | --- | --- | --- | --- | --- | --- |
| precomposed: `バカ` | BLOCK [2,4) | BLOCK [2,4) | BLOCK [2,4) | BLOCK [2,4) | PASS | PASS |
| kana + combining mark: `ハ\u3099カ` | BLOCK [2,5) | BLOCK [2,5) | BLOCK [2,5) | BLOCK [2,5) | PASS | PASS |
| half-width kana + half-width mark: `ﾊ\uFF9Eｶ` | **PASS** | BLOCK [2,5) | **PASS** | BLOCK [2,5) | **BLOCK [2,5)** | PASS |
| full-width kana + half-width mark: `ハ\uFF9Eカ` | **PASS** | BLOCK [2,5) | **PASS** | BLOCK [2,5) | **BLOCK [2,5)** | PASS |
| kana + spacing mark: `ハ\u309Bカ` | **PASS** | BLOCK [2,5) | **PASS** | BLOCK [2,5) | PASS | PASS |
| kana + U+200B + combining mark: `ハ\u200B\u3099カ` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,6)** | PASS |
| half-width kana + U+200B + half-width mark: `ﾊ\u200B\uFF9Eｶ` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,6)** | PASS |
| kana + U+2060 + combining mark: `ハ\u2060\u3099カ` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,6)** | PASS |
| half-width kana + U+2060 + half-width mark: `ﾊ\u2060\uFF9Eｶ` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,6)** | PASS |
| kana + U+00AD + combining mark: `ハ\u00AD\u3099カ` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,6)** | PASS |
| half-width kana + U+00AD + half-width mark: `ﾊ\u00AD\uFF9Eｶ` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,6)** | PASS |

**ブス**

| 写法 | 归一化规则 修复前 | 归一化规则 修复后 | 正则 修复前 | 正则 修复后 | 无浊点规则 修复前 | 无浊点规则 修复后 |
| --- | --- | --- | --- | --- | --- | --- |
| precomposed: `ブス` | BLOCK [2,4) | BLOCK [2,4) | BLOCK [2,4) | BLOCK [2,4) | PASS | PASS |
| kana + combining mark: `フ\u3099ス` | BLOCK [2,5) | BLOCK [2,5) | BLOCK [2,5) | BLOCK [2,5) | PASS | PASS |
| half-width kana + half-width mark: `ﾌ\uFF9Eｽ` | **PASS** | BLOCK [2,5) | **PASS** | BLOCK [2,5) | **BLOCK [2,5)** | PASS |
| full-width kana + half-width mark: `フ\uFF9Eス` | **PASS** | BLOCK [2,5) | **PASS** | BLOCK [2,5) | **BLOCK [2,5)** | PASS |
| kana + spacing mark: `フ\u309Bス` | **PASS** | BLOCK [2,5) | **PASS** | BLOCK [2,5) | PASS | PASS |
| kana + U+200B + combining mark: `フ\u200B\u3099ス` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,6)** | PASS |
| half-width kana + U+200B + half-width mark: `ﾌ\u200B\uFF9Eｽ` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,6)** | PASS |
| kana + U+2060 + combining mark: `フ\u2060\u3099ス` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,6)** | PASS |
| half-width kana + U+2060 + half-width mark: `ﾌ\u2060\uFF9Eｽ` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,6)** | PASS |
| kana + U+00AD + combining mark: `フ\u00AD\u3099ス` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,6)** | PASS |
| half-width kana + U+00AD + half-width mark: `ﾌ\u00AD\uFF9Eｽ` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,6)** | PASS |

**デブ**

| 写法 | 归一化规则 修复前 | 归一化规则 修复后 | 正则 修复前 | 正则 修复后 | 无浊点规则 修复前 | 无浊点规则 修复后 |
| --- | --- | --- | --- | --- | --- | --- |
| precomposed: `デブ` | BLOCK [2,4) | BLOCK [2,4) | BLOCK [2,4) | BLOCK [2,4) | PASS | PASS |
| kana + combining mark: `テ\u3099フ\u3099` | BLOCK [2,6) | BLOCK [2,6) | BLOCK [2,6) | BLOCK [2,6) | PASS | PASS |
| half-width kana + half-width mark: `ﾃ\uFF9Eﾌ\uFF9E` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,5)** | PASS |
| full-width kana + half-width mark: `テ\uFF9Eフ\uFF9E` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,5)** | PASS |
| kana + spacing mark: `テ\u309Bフ\u309B` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | PASS | PASS |
| kana + U+200B + combining mark: `テ\u200B\u3099フ\u200B\u3099` | **PASS** | BLOCK [2,8) | **PASS** | BLOCK [2,8) | **BLOCK [2,8)** | PASS |
| half-width kana + U+200B + half-width mark: `ﾃ\u200B\uFF9Eﾌ\u200B\uFF9E` | **PASS** | BLOCK [2,8) | **PASS** | BLOCK [2,8) | **BLOCK [2,7)** | PASS |
| kana + U+2060 + combining mark: `テ\u2060\u3099フ\u2060\u3099` | **PASS** | BLOCK [2,8) | **PASS** | BLOCK [2,8) | **BLOCK [2,8)** | PASS |
| half-width kana + U+2060 + half-width mark: `ﾃ\u2060\uFF9Eﾌ\u2060\uFF9E` | **PASS** | BLOCK [2,8) | **PASS** | BLOCK [2,8) | **BLOCK [2,7)** | PASS |
| kana + U+00AD + combining mark: `テ\u00AD\u3099フ\u00AD\u3099` | **PASS** | BLOCK [2,8) | **PASS** | BLOCK [2,8) | **BLOCK [2,8)** | PASS |
| half-width kana + U+00AD + half-width mark: `ﾃ\u00AD\uFF9Eﾌ\u00AD\uFF9E` | **PASS** | BLOCK [2,8) | **PASS** | BLOCK [2,8) | **BLOCK [2,7)** | PASS |

**ハゲ**

| 写法 | 归一化规则 修复前 | 归一化规则 修复后 | 正则 修复前 | 正则 修复后 | 无浊点规则 修复前 | 无浊点规则 修复后 |
| --- | --- | --- | --- | --- | --- | --- |
| precomposed: `ハゲ` | BLOCK [2,4) | BLOCK [2,4) | BLOCK [2,4) | BLOCK [2,4) | PASS | PASS |
| kana + combining mark: `ハケ\u3099` | BLOCK [2,5) | BLOCK [2,5) | BLOCK [2,5) | BLOCK [2,5) | PASS | PASS |
| half-width kana + half-width mark: `ﾊｹ\uFF9E` | **PASS** | BLOCK [2,5) | **PASS** | BLOCK [2,5) | **BLOCK [2,4)** | PASS |
| full-width kana + half-width mark: `ハケ\uFF9E` | **PASS** | BLOCK [2,5) | **PASS** | BLOCK [2,5) | **BLOCK [2,4)** | PASS |
| kana + spacing mark: `ハケ\u309B` | **PASS** | BLOCK [2,5) | **PASS** | BLOCK [2,5) | **BLOCK [2,4)** | PASS |
| kana + U+200B + combining mark: `ハケ\u200B\u3099` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,6)** | PASS |
| half-width kana + U+200B + half-width mark: `ﾊｹ\u200B\uFF9E` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,5)** | PASS |
| kana + U+2060 + combining mark: `ハケ\u2060\u3099` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,6)** | PASS |
| half-width kana + U+2060 + half-width mark: `ﾊｹ\u2060\uFF9E` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,5)** | PASS |
| kana + U+00AD + combining mark: `ハケ\u00AD\u3099` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,6)** | PASS |
| half-width kana + U+00AD + half-width mark: `ﾊｹ\u00AD\uFF9E` | **PASS** | BLOCK [2,6) | **PASS** | BLOCK [2,6) | **BLOCK [2,5)** | PASS |

**ポンコツ**

| 写法 | 归一化规则 修复前 | 归一化规则 修复后 | 正则 修复前 | 正则 修复后 | 无浊点规则 修复前 | 无浊点规则 修复后 |
| --- | --- | --- | --- | --- | --- | --- |
| precomposed: `ポンコツ` | BLOCK [2,6) | BLOCK [2,6) | BLOCK [2,6) | BLOCK [2,6) | PASS | PASS |
| kana + combining mark: `ホ\u309Aンコツ` | BLOCK [2,7) | BLOCK [2,7) | BLOCK [2,7) | BLOCK [2,7) | PASS | PASS |
| half-width kana + half-width mark: `ﾎ\uFF9Fﾝｺﾂ` | **PASS** | BLOCK [2,7) | **PASS** | BLOCK [2,7) | **BLOCK [2,7)** | PASS |
| full-width kana + half-width mark: `ホ\uFF9Fンコツ` | **PASS** | BLOCK [2,7) | **PASS** | BLOCK [2,7) | **BLOCK [2,7)** | PASS |
| kana + spacing mark: `ホ\u309Cンコツ` | **PASS** | BLOCK [2,7) | **PASS** | BLOCK [2,7) | PASS | PASS |
| kana + U+200B + combining mark: `ホ\u200B\u309Aンコツ` | **PASS** | BLOCK [2,8) | **PASS** | BLOCK [2,8) | **BLOCK [2,8)** | PASS |
| half-width kana + U+200B + half-width mark: `ﾎ\u200B\uFF9Fﾝｺﾂ` | **PASS** | BLOCK [2,8) | **PASS** | BLOCK [2,8) | **BLOCK [2,8)** | PASS |
| kana + U+2060 + combining mark: `ホ\u2060\u309Aンコツ` | **PASS** | BLOCK [2,8) | **PASS** | BLOCK [2,8) | **BLOCK [2,8)** | PASS |
| half-width kana + U+2060 + half-width mark: `ﾎ\u2060\uFF9Fﾝｺﾂ` | **PASS** | BLOCK [2,8) | **PASS** | BLOCK [2,8) | **BLOCK [2,8)** | PASS |
| kana + U+00AD + combining mark: `ホ\u00AD\u309Aンコツ` | **PASS** | BLOCK [2,8) | **PASS** | BLOCK [2,8) | **BLOCK [2,8)** | PASS |
| half-width kana + U+00AD + half-width mark: `ﾎ\u00AD\uFF9Fﾝｺﾂ` | **PASS** | BLOCK [2,8) | **PASS** | BLOCK [2,8) | **BLOCK [2,8)** | PASS |

### 匹配副本、规则命中与原文区间（默认选项）

| 输入写法（正文） | 规则 | 副本 修复前 | 副本 修复后 | 命中 修复前 | 命中 修复后 | 修复后单元（副本←原文） |
| --- | --- | --- | --- | --- | --- | --- |
| half-width kana + half-width mark: `ﾊ\uFF9Eｶ` | normalized バカ | `ハカ` | `バカ` | PASS | BLOCK [0,3) | [0,1)←[0,2) [1,2)←[2,3) |
| same, inside a sentence: `x ﾊ\uFF9Eｶ y` | normalized バカ | `x ハカ y` | `x バカ y` | PASS | BLOCK [2,5) | [0,1)←[0,1) [1,2)←[1,2) [2,3)←[2,4) [3,4)←[4,5) [4,5)←[5,6) [5,6)←[6,7) |
| kana + spacing mark U+309B: `ハ\u309Bカ` | normalized バカ | `ハ カ` | `バカ` | PASS | BLOCK [0,3) | [0,1)←[0,2) [1,2)←[2,3) |
| kana + ZWSP + combining mark: `は\u200B\u3099か` | normalized ばか | `はか` | `ばか` | PASS | BLOCK [0,4) | [0,1)←[0,3) [1,2)←[3,4) |
| half-width kana + word joiner + half-width mark: `ﾊ\u2060\uFF9Eｶ` | normalized バカ | `ハカ` | `バカ` | PASS | BLOCK [0,4) | [0,1)←[0,3) [1,2)←[3,4) |
| kana + variation selector + combining mark: `は\uFE0F\u3099か` | normalized ばか | `はか` | `ばか` | PASS | BLOCK [0,4) | [0,1)←[0,3) [1,2)←[3,4) |
| Latin + half-width mark: `ba\uFF9Edword` | normalized badword | `badword` | `badword` | BLOCK [0,8) | BLOCK [0,8) | [0,1)←[0,1) [1,2)←[1,3) [2,3)←[3,4) [3,4)←[4,5) [4,5)←[5,6) [5,6)←[6,7) [6,7)←[7,8) |
| Hangul jamo + ZWSP + jamo: `\u1107\u200B\u1161\u1107\u1169` | normalized 바보 | `\u1107\u1161보` | `바보` | PASS | BLOCK [0,5) | [0,1)←[0,3) [1,2)←[3,5) |
| astral character before the match: `😀ﾊ\uFF9Eｶ` | normalized バカ | `😀ハカ` | `😀バカ` | PASS | BLOCK [2,5) | [0,2)←[0,2) [2,3)←[2,4) [3,4)←[4,5) |
| format character before the match: `あ\u200Bﾊ\uFF9Eｶ` | normalized バカ | `あハカ` | `あバカ` | PASS | BLOCK [2,5) | [0,1)←[0,2) [1,2)←[2,4) [2,3)←[4,5) |
| format character after the match: `ﾊ\uFF9Eｶ\u200Bx` | normalized バカ | `ハカx` | `バカx` | PASS | BLOCK [0,4) | [0,1)←[0,2) [1,2)←[2,4) [2,3)←[4,5) |
| prolonged sound mark: `ﾊ\uFF9Eｰｶ` | normalized バーカ | `ハーカ` | `バーカ` | PASS | BLOCK [0,4) | [0,1)←[0,2) [1,2)←[2,3) [2,3)←[3,4) |
| mark at the start of the text: `\uFF9Eｶ` | normalized カ | `カ` | `カ` | BLOCK [1,2) | BLOCK [1,2) | [0,0)←[0,1) [0,1)←[1,2) |
| Latin letter + ZWSP + acute, normalized rule: `ba\u200B\u0301dword` | normalized badword | `badword` | `badword` | BLOCK [0,9) | BLOCK [0,9) | [0,1)←[0,1) [1,2)←[1,4) [2,3)←[4,5) [3,4)←[5,6) [4,5)←[6,7) [5,6)←[7,8) [6,7)←[8,9) |
| Latin letter + ZWSP + acute, regex rule: `cafe\u200B\u0301` | regex café | `cafe` | `cafe` | PASS | BLOCK [0,6) | [0,1)←[0,1) [1,2)←[1,2) [2,3)←[2,3) [3,4)←[3,6) |

### 读音（表 `{ガ: ga, カ: ka}`）

| 输入 | 修复前 | 修复后 |
| --- | --- | --- |
| `ガカ` | `gaka` complete=true 单元原文 [0,1) [1,2) | `gaka` complete=true 单元原文 [0,1) [1,2) |
| `ｶ\uFF9Eｶ` | `kaka` complete=true 单元原文 [0,1) [1,2) [2,3) | `gaka` complete=true 单元原文 [0,2) [2,3) |
| `カ\u309Bカ` | `kaka` complete=true 单元原文 [0,1) [1,2) [2,3) | `gaka` complete=true 单元原文 [0,2) [2,3) |
| `カ\u200B\u3099カ` | `kaka` complete=true 单元原文 [0,3) [3,4) | `gaka` complete=true 单元原文 [0,3) [3,4) |

### 扣分规则 归一化 `カス`（扣 5）

| 正文 | 修复前 | 修复后 |
| --- | --- | --- |
| `ガス代が高い` | PASS 扣分 0 | PASS 扣分 0 |
| `ｶ\uFF9Eｽ代が高い` | REVIEW [0,3) 扣分 5 | PASS 扣分 0 |
| `カスタード` | REVIEW [0,2) 扣分 5 | REVIEW [0,2) 扣分 5 |
| `ｶｽﾀｰﾄ\uFF9E` | REVIEW [0,2) 扣分 5 | REVIEW [0,2) 扣分 5 |

### 无意义互动分类（classification.ts）

| 正文 | 修复前 | 修复后 |
| --- | --- | --- |
| `ﾊ\uFF9Eﾊ\uFF9Eﾊ\uFF9E` | NOISE | NOISE |
| `ﾊ\uFF9Eﾊ\uFF9Fﾊ` | NOISE | UNCERTAIN |
| `ｶｶ\uFF9Eｶ` | NOISE | UNCERTAIN |
| `ハ\u309Bハ\u309Bハ\u309B` | UNCERTAIN | NOISE |
