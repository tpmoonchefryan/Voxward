# VOXWARD-SUB-055 返工自查：验收 B3 与 N7

- 依据：`.kiro/specs/voxward-batch2/evidence/judgment.md` 的 B3（删除期限）与 N7（条款“未核对”项），以及 `acceptance.md` §3.1（E41）。
- 修复提交：`884107f`。本文件所在提交单独记录自查结果。
- 条款来源：YouTube 开发者政策全文，2026-11-10 以 web_fetch full 模式读取，页面 Last updated 2026-11-06 UTC。

## 1. 条款核对（全文，改写）

| 条款 | 要点 |
| --- | --- |
| III.E.4.g | 用户请求删除存储数据后，尽快且不迟于 7 个日历日删除。须说明删除方法：删除 API Client 中的数据，不影响 YouTube 上的数据。用户在 Client 中删除账号时，同样适用 7 日。 |
| III.D.2.c.i | 经应用内撤销机制撤销授权，撤销后应立即撤销 token，并在 7 个日历日内删除已授权数据。 |
| III.D.2.c.ii | 经 Google 安全设置页撤销授权，应尽快删除相关 API 数据，不迟于撤销后 30 个日历日。 |
| III.E.4.b | 统计类授权数据可在与授权用途相符时保存更久，但每 30 日须确认用户仍授权。非授权统计数据不得超过 30 日。 |
| III.E.4.c、III.E.4.d | 其余授权数据与非授权数据最多保存 30 个日历日，到期删除或刷新。 |
| III.E.4.h | 不得用独立计算的类似数据替换 API 数据，不得用 API 数据生成新的或派生的数据、指标。 |
| III.I.15 | 不得提供让用户直接或间接访问 YouTube API 服务所提供数据或功能的 API 服务。 |
| III.L | 派生指标与数据存储附加政策，只适用于经审核、通过标准配额扩展申请明确申请许可的分析用例（自 2026-06-01 起）。 |

## 2. 与验收记录的差异

1. III.L 原文为“explicitly applied for permission”（明确申请许可）。`judgment.md` N7 与 `acceptance.md` §3.1 写作“明确取得许可”。材料按原文写作。
2. III.E.4.g 中的“用户”是否包括发言观众，原文未直接说明。材料把它列为平台问题（`platform-questions.md` 的 Q3），未作判断。
3. 派生指标补充条款页的 36 个月条文仍只核对到前 8000 字符片段。本次未全文核对，列入第 5 节。

## 3. 改动位置

| 文件 | 位置 | 改动 |
| --- | --- | --- |
| `docs/policy/data-processing.md` | 第 4 节末尾 | 30 日上限按 III.E.4.b、c、d 分列；36 个月条件补 III.L；派生指标条款标明依据片段 |
| `docs/policy/data-processing.md` | 第 5.3 节 | 7 日（III.E.4.g）与撤销的 7 日、30 日（III.D.2.c）单列；删去“7 日只针对撤销”的表述 |
| `docs/policy/status-and-gaps.md` | 第 3 节 | 删去“是否修订提案措辞”一项，重排编号 |
| `docs/policy/status-and-gaps.md` | 第 5.2 节 | 开发者政策一行改为全文记录，写明 Last updated 日期 |
| `docs/policy/status-and-gaps.md` | 第 5.3 节第 1–4 项 | 7 日对应、III.E.4.h、III.I.15、III.L 按全文更新；36 个月保留片段说明 |
| `docs/policy/status-and-gaps.md` | 第 6.1 节 | 删去已核对的条文项，保留派生指标全文未核对项 |
| `docs/policy/platform-questions.md` | Q3 缺口、Q5 缺口、第 4 节 | 7 日对应 III.E.4.g，“用户”范围列为平台问题；III.I.15 已全文核对；来源记录改为全文 |
| `docs/policy/self-hosting-responsibilities.md` | 第 5 节倒数第 2 行 | 撤销入口与删除时限按全文记录，撤销入口的实现状态未确认 |
| `.kiro/specs/voxward-s031-policy/design.md` | 本地段第 5 节、第 6 节 | 外部条款记录改为全文；删去待 Owner 确认的 7 日项，重排编号 |
| `.kiro/specs/voxward-s031-policy/tasks.md` | 本地段第 12 项 | 登记本次返工 |

受管段（`design.md` 第 1–53 行、`tasks.md` 第 1–16 行）未改动。

## 4. 自查结果

### 4.1 错误结论与旧表述

命令：`grep -rn -e '只适用于撤销' -e '仅针对撤销' -e '针对撤销授权' -e '撤销授权的情形' -e '统一期限' -e '修订提案' -e 'Owner 可决定' docs/policy/ .kiro/specs/voxward-s031-policy/design.md .kiro/specs/voxward-s031-policy/tasks.md`

结果：0 处。

### 4.2 “未核对”与“片段”残留的判定

- “未核对”共 9 处，全部针对外部材料：AI 服务的留存、训练和披露条款（`data-processing.md` 第 6 节、`platform-questions.md` 的 Q6、`status-and-gaps.md` 第 2 节与第 3 节第 6 项、`self-hosting-responsibilities.md` 第 5 节）；OAuth 政策、验证例外、发布状态说明、YouTube API 表单（`status-and-gaps.md` 第 5.4 节、`platform-questions.md` 第 4 节、`self-hosting-responsibilities.md` 第 2 节）。这些不在本次修复范围。
- “片段”共 7 处，全部针对派生指标补充条款页，与开发者政策无关。
- 开发者政策页在本次修改中已无“片段”或“未核对”的残留。
- `platform-questions.md` Q5 与 `status-and-gaps.md` 第 5.3 节第 3 项中的“未经平台确认”指适用性，条文本身已全文核对。

### 4.3 受管段与工单来源

- `design.md` 第 1–53 行 sha256 前 16 位为 `d4fb5e1062cee4d0`，与 `2482f40` 相同。
- `tasks.md` 第 1–16 行 sha256 前 16 位为 `08977db523e91c3c`，与 `2482f40` 相同。
- `kiro-specs.mjs check` 未能运行成功。`--workspace` 需要可解析的工作区路径。以 `Ether` 运行返回 `WORKSPACE_PATH_INVALID`，以主工作区路径运行返回 `LIBRARY_NOT_FOUND`。因此引擎侧的 SPEC_CURRENT 状态未经本次 check 确认。

### 4.4 仓库内路径

以下路径均存在：`docs/policy/data-processing.md`、`docs/policy/platform-questions.md`、`docs/policy/self-hosting-responsibilities.md`、`docs/policy/status-and-gaps.md`、`docs/proposal/y3_project_proposal.md`、`.kiro/specs/voxward-s031-policy/evidence/self-check.md`、`.kiro/specs/voxward-s031-policy/evidence/rework-self-check.md`。

### 4.5 外链

`docs/policy/` 中共 6 个不同外链。用 `curl -L` 发 GET 请求，全部返回 HTTP 200：

- `developers.google.com/youtube/terms/developer-policies`：全文已核对。
- `developers.google.com/youtube/terms/derived-metrics-policy`：可访问，内容只核对到片段。
- `support.google.com/youtube/contact/yt_api_form`：可访问，提案引用，内容未核对。
- `support.google.com/cloud/answer/15549945?hl=en`：可访问，提案引用，内容未核对。
- `support.google.com/cloud/answer/13464323?hl=en`：可访问，提案引用，内容未核对。
- `developers.google.com/identity/protocols/oauth2/policies`：可访问，提案引用，内容未核对。

## 5. 未验证项

1. 派生指标补充条款页的全文，包括 36 个月条文。
2. III.E.4.g 中“用户”是否包括发言观众，待平台确认。
3. AI 提供方的留存、训练选项与删除能力。
4. 撤销授权入口的实现状态。提案未列出该入口。
5. OAuth 政策、验证例外、发布状态说明、YouTube API 表单、Kiro 文档的内容。
6. `kiro-specs.mjs check` 未运行成功（见 4.3）。

本次只修改 Markdown 与 spec 文件，未运行代码检查。
