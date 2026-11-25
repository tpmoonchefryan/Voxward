# 申请现状、缺项与提案映射（草案）

状态：草案，供 Owner 审核，未对外发布。本文不提交任何表单，不接受任何条款，不声称任何平台审批已经发生。

来源：`docs/proposal/y3_project_proposal.md`（2026-11-09 对话决策整合版）。第 6、17、18 节在材料写作后补读，已列入第 4 节映射。

## 1. 申请现状

下表依据提案第 15.3 节。个人身份资料和联系方式不写入本文，提案也要求如此。

| 项目 | 现状 |
| --- | --- |
| 申请主体 | 个人申请。联系方式已私下提供，不写入项目文档 |
| 当前目的 | 确认频道评分用途是否允许 |
| 配额扩展 | 当前没有需求 |
| 平台重新审核通知 | 当前没有收到 |
| Cloud 项目编号 | 尚未创建或提供 |
| 官网、隐私政策、演示地址 | 尚未准备 |
| 法定姓名及表单所需的其他身份资料 | 正式申请时补全 |
| 表单状态 | 已有未完成草稿。未提交，未接受新增条款，未获得平台结论 |

提案还记录，表单的入口选项与“单纯用途咨询”并不完全吻合，表单中有默认的配额和用途说明项。正式操作时应如实填写，不虚构配额需求或重新审核通知。

本包不改变上述状态。

## 2. 缺项清单

| 缺项 | 类型 | 提案写明的责任方或处理方式 | 来源 |
| --- | --- | --- | --- |
| Q1 至 Q6 的平台书面答复 | 平台答复 | 项目申请方准备材料，取得覆盖实际用途的反馈 | 第 15.2、20.1 节 |
| 逐观众频道评分的许可 | 平台答复 | 项目申请方准备第 15 节的材料 | 第 20.1 节 |
| 自托管项目的审核覆盖与下游输出的适用范围 | 平台答复 | 向平台询问软件分发、独立 Cloud 项目和受控输出的责任边界 | 第 20.1 节 |
| 观众告知文本 | 材料 | 尚未起草，见 `platform-questions.md` 的 Q2 | 第 15.2 节第 2 问 |
| 公开用途说明，数据流与权限图 | 材料 | 数据流与角色草稿已在 `data-processing.md` 中起草，公开版待 Owner 决定 | 第 15.3 节 |
| 隐私政策 | 材料 | 已落地 5 语 [`PRIVACY.md`](../../PRIVACY.md)（`en`/`zh-CN`/`ja`/`ko`/`fr`），正式提交前由部署方核对自托管联系信息 | 第 15.3 节 |
| 用户删除界面与可访问演示 | 实现与材料 | 数据合规查询、两阶段删除、记分例外与异步清理执行已在 [`DataPanel.tsx`](../../apps/web/src/pages/data/DataPanel.tsx) 及 `data-lifecycle-service`（含 `EVENT_PAYMENT` 目标）落地；`/sandbox` 演示已提供 | 第 15.3 节 |
| 有效的 Cloud 项目编号 | 平台资源 | 项目申请方与实际部署方按职责准备。当前不虚构已存在的编号 | 第 15.3、20.1 节 |
| 官网与演示地址 | 材料 | 同上（`/sandbox` 演示已可访问，正式官网按部署方规划补齐） | 第 15.3、20.1 节 |
| 申请主体的身份资料 | 身份 | 正式申请时补全，不写入仓库 | 第 15.3 节 |
| AI 服务的实际留存与训练选项 | 核对 | 部署时展示所选服务的实际条款。本包未核对 | 第 8.4、20.1 节 |
| Kiro 与 Crew 的清理行为 | 实测 | 适配器、孤儿目录回收及真实本机实测验收随 VOXWARD-INIT-003 归档 | 第 20.1 节 |
| 第三方接入的版本兼容（OneComme、VTube Studio、blivechat） | 实测 | 协议层 `vw-output.v1` 与 `blivechat-v1.x-json-ws` 已有自动化验证；真实桌面端兼容抽检仍属外部条件 | 第 13.2、20.1 节 |
| 模型推荐、reasoning、延迟与容量 | 实测 | 真实三提供商基线测量随 `VOXWARD-SUB-050`（Q60）执行归档，未测前不作承诺 | 第 20.1 节 |
| 删除与恢复的验证 | 实测 | 墓碑账本、WAL/备份恢复与 `event_payments` 清除已纳入服务端集成测试 | 第 12.4、19.2 节 |
| 公开仓库的开源许可证 | 决定 | 已确定采用 **Apache-2.0**（见根目录 [`LICENSE`](../../LICENSE) 与 [`NOTICE`](../../NOTICE)） | 第 19.3 节 |
| 提交材料（英文版、视频、表单字段） | 材料 | 由 VOXWARD-EPIC-007 承接，不在本包范围内 | 第 19.3 节；INHERIT-022 |

## 3. 待 Owner 确认项

以下事项只列出，不阻塞本包的写作。每项后面写明材料中的当前处理方式。

1. 咨询入口与提交形式。提案称表单入口与“单纯用途咨询”不完全吻合。材料中的处理：`platform-questions.md` 只列问题，不作为表单内容。
2. 派生指标补充条款的接受。接受是对平台的承诺，页面要求选择指定的用例。材料中的处理：未接受，未选择任何用例。
3. 保留期限建议值。提案建议原文与映射最多 7 天，元数据 30 天。材料中的处理：标为“提案建议，待确认”。
4. 评分与计分账本的保存期限。提案称待平台确认。材料中的处理：标为“未确认”。
5. Cloud 项目与审核覆盖（Q4）。材料中的处理：不假定审核结论可以复用。
6. 所用 AI 服务及其留存条款。材料中的处理：披露文字为草稿，提供方条款未核对。
7. 外部 AI 披露文字是否采用。材料中的处理：`data-processing.md` 第 6 节的草稿，待审定。
8. 下游输出的限制（Q5）。材料中的处理：只列输出字段范围，不作结论。
9. 公开范围与时间。包括 `docs/policy/` 是否公开，哪些内容需要删减。材料中的处理：草案只存在于仓库内，未公开。
10. 隐私政策、官网和演示地址的承担方与形式。材料中的处理：标为缺项。
11. 申请人的身份资料与联系方式。材料中的处理：不写入仓库。
12. 公开仓库的许可证选择（提案第 19.3 节）。现状：已确定并落地为 **Apache-2.0**（`LICENSE` 与 `NOTICE`）。

## 4. 提案条款映射（§1–§20）

“处理方式”列说明每一节的处理：写入（有对应的政策内容）、节选写入（只取相关部分）、引用（指向其他文件）、不适用（不属于政策材料，并说明原因）。

| 提案章节 | 与政策材料相关的内容 | 写入位置 | 处理方式 |
| --- | --- | --- | --- |
| 1、1.1 项目概述与产品边界 | Middleware 定位，自托管，频道内评分，首期接入 YouTube，AI 一次性会话，SQLite | `data-processing.md` 第 1、2、3 节 | 写入 |
| 1.2 首期不纳入的能力 | 不做官方托管、统一 OAuth 托管代理、跨主播信誉、TTS、下游上传弹幕 | `self-hosting-responsibilities.md` 第 1 节；`data-processing.md` 第 7 节 | 写入 |
| 2.1 使用者与权限 | 五类角色、各自约束、服务端逐次校验 | `data-processing.md` 第 2 节 | 写入 |
| 2.2 远端部署结构 | 数据流与拓扑，本机卷上的 SQLite，浏览器和 OBS 主动连接远端 | `data-processing.md` 第 1 节 | 写入 |
| 3.1 YouTube 消息接入 | 接入方式，去重，补发消息，凭据选择，配额成本 | `data-processing.md` 第 1 节；`self-hosting-responsibilities.md` 第 2 节 | 写入 |
| 3.2 平台身份标记 | 身份能力的来源，unknown 的处理，不假定订阅标记 | `data-processing.md` 第 3 节 | 写入 |
| 3.3 自托管与开发者身份 | 常规准备，OAuth 方式，Testing 状态，不能用共享 Secret | `self-hosting-responsibilities.md` 第 2、3 节；`platform-questions.md` 的 Q4 | 写入 |
| 4.1、4.2 结果语义与处理顺序 | ALLOW 与 BLOCK 两层，处理顺序 | `data-processing.md` 第 1 节 | 写入 |
| 4.3 基础内容检查 | 检测对象（昵称、正文、组合），误报风险，白名单仍需检查 | `data-processing.md` 第 1 节 | 节选写入 |
| 4.4 保护范围 | 只保护经 VoxWard 输出的内容，已展示内容不能保证撤回 | `data-processing.md` 第 1 节 | 写入 |
| 5.1 评分作用域与计分规则 | 评分键，公式，计分表，不公开 | `data-processing.md` 第 3 节；`platform-questions.md` 的 Q1 | 写入 |
| 5.2 身份基础分与变化 | 幂等，只应用一次，身份降级的语义 | `data-processing.md` 第 3 节 | 写入 |
| 5.3 昵称检查与读音缓存 | 缓存键，不跳过正文检查，默认不把平台昵称传给外部模型 | `data-processing.md` 第 3、6 节 | 写入 |
| 5.4 快速通道的后台复盘 | 待复盘标记，复盘结果经同一校验 | `data-processing.md` 第 3 节 | 写入 |
| 6 并发、队列与延迟控制 | 调度参数不属于政策要点。与删除和投递相关的两点：删除时优先阻止继续读取、输出和落库；过期消息不自动补播 | `data-processing.md` 第 5.2、7 节 | 节选写入 |
| 7.1 人工操作 | 人工纠错按原账本的实际变化处理 | `data-processing.md` 第 3 节 | 节选写入 |
| 7.2 晚到的 AI 结果 | 任务携带版本与代次，条件不符则丢弃结果 | `data-processing.md` 第 5.2 节 | 节选写入 |
| 7.3 从原生聊天室删除 | 可选操作，每次 20 个配额单位，需要写权限 | `data-processing.md` 第 1 节 | 写入 |
| 8.1 发送内容与任务范围 | 发送的内容，不发送的内容，临时 ID 的假名化性质 | `data-processing.md` 第 6 节 | 写入 |
| 8.2、8.3 结构化输出与校验 | 业务契约，校验项，批次的完整性 | `data-processing.md` 第 6 节 | 节选写入 |
| 8.4 保存什么，不保存什么 | 保存与不保存的对象，提供方留存 | `data-processing.md` 第 4、6 节；`platform-questions.md` 的 Q6 | 写入 |
| 9.1 用户自主选择模型 | 模型可替换，不同提供方条款不同 | `data-processing.md` 第 6 节 | 写入 |
| 9.2 Kiro CLI 与 Crew 的职责 | 协调件的职责，运行时 agent 的最小权限 | `data-processing.md` 第 2、6 节 | 节选写入 |
| 9.3 模块契约 | 模块职责与边界 | `data-processing.md` 第 1 节 | 节选写入 |
| 10 数据库与多房管协作 | 数据组，单写者，日志表 | `data-processing.md` 第 1、4 节；`self-hosting-responsibilities.md` 第 4 节 | 写入 |
| 11.1 自托管的数据管理责任 | 部署方责任，不认定法律角色 | `self-hosting-responsibilities.md` 第 1 节 | 写入 |
| 11.2 数据面板与请求流程 | 面板功能，两种删除选项，执行顺序 | `data-processing.md` 第 5.1 节；`self-hosting-responsibilities.md` 第 4 节 | 写入 |
| 11.3 删除的执行范围 | 删除范围，删除 VoxWard 数据不等于删除原始内容，7 日表述 | `data-processing.md` 第 5.2、5.3 节 | 写入 |
| 11.4 记分例外名单 | 属性表，HMAC 标记的性质 | `data-processing.md` 第 5.4 节 | 写入 |
| 12.1 两类日志 | Change Log 与 Technical Log 的用途 | `data-processing.md` 第 4 节；`self-hosting-responsibilities.md` 第 4 节 | 写入 |
| 12.2 关联字段与查看器 | 内部查询，不提供公开日志 API | `self-hosting-responsibilities.md` 第 4 节 | 节选写入 |
| 12.3 保留策略 | 初始建议值，与 YouTube 条款的关系 | `data-processing.md` 第 4 节 | 写入 |
| 12.4 恢复与删除的可靠性 | WAL、备份，提供方删除不能由本地清理代替 | `data-processing.md` 第 5.2 节；`self-hosting-responsibilities.md` 第 4 节 | 写入 |
| 13.1 VoxWard 输出契约 | 输出字段，拦截事件 | `data-processing.md` 第 7 节 | 写入 |
| 13.2 集成范围与真实限制 | 第三方支持状态均未验证 | 本文第 2 节 | 写入（作为缺项） |
| 13.3 接入指引页面 | 指引的组成 | 由实现阶段的接入指引承担 | 不适用（实现文档） |
| 14 前端页面与演示体验 | 页面清单，SC 卡片的来源标注，安全渲染 | `data-processing.md` 第 2、7 节 | 节选写入 |
| 15.1 频道评分的政策路径 | 政策路径，不能证明自动合规 | `platform-questions.md` 的 Q1 | 写入 |
| 15.2 需要明确询问的问题 | 六项问题 | `platform-questions.md` 第 1 节 | 写入 |
| 15.3 申请现状 | 申请状态 | 本文第 1 节 | 写入 |
| 16 安全边界与故障行为 | 凭据隔离，运行时权限，远端页面安全 | `self-hosting-responsibilities.md` 第 2 节；`data-processing.md` 第 2 节 | 节选写入 |
| 17 选型原因、投入与回报 | 非政策内容 | 无 | 不适用 |
| 18 验收方案与可观测指标 | 18.1 中与数据、删除、下游相关的验收标准 | 可作为后续核对依据，本包不执行验收。性能指标列入本文第 2 节 | 引用 |
| 19 Kiroween 交付与开发计划 | 截止时间，提交清单 | 本文第 2、3、6 节 | 引用 |
| 20.1 尚未完成的外部确认或验证 | 缺口清单 | 本文第 2 节 | 写入 |
| 20.2 本对话决策覆盖 | 与政策相关的决策 | 见第 4.1 节 | 写入 |

### 4.1 决策覆盖（提案 §20.2 中与政策相关的条目）

| 决策（摘要） | 政策材料位置 |
| --- | --- |
| Middleware 定位；不做跨主播或跨平台的信誉共享；需要时对接真正的 CRM | `data-processing.md` 第 3 节；`platform-questions.md` 的 Q1 |
| 频道内评分为核心，需找到符合 YouTube 政策的适用方案 | `platform-questions.md` 的 Q1 与第 3 节 |
| 平台身份标记按各平台实际能力提供，不假定 YouTube 订阅标记 | `data-processing.md` 第 3 节 |
| 白名单仍经过基础内容检查 | `data-processing.md` 第 1 节 |
| 统一放行或拦截，不拆视觉和语音，不做仅显示 | `data-processing.md` 第 7 节 |
| 主播与多名房管通过页面协作 | `data-processing.md` 第 2 节 |
| 不假定主播本机部署，短期不提供官方生产托管 | `self-hosting-responsibilities.md` 第 1 节 |
| 全部真实消息直接取自平台，下游不能上传弹幕 | `data-processing.md` 第 1 节 |
| 不开发新的本机代理，提供集成方案与接入指引 | `data-processing.md` 第 7 节；本文第 2 节 |
| 先用 SQLite，多个操作者通过后端写入 | `data-processing.md` 第 1 节 |
| 模型由用户选择，Kiro 与 Crew 可替换 | `data-processing.md` 第 6 节 |
| 包含 Change Log、Technical Log、数据面板，由主播或授权人员处理请求 | `data-processing.md` 第 4、5 节；`self-hosting-responsibilities.md` 第 4 节 |
| 提供“删除并加入记分例外名单”，不再计分，新消息全部进入审核 | `data-processing.md` 第 5.1、5.4 节 |
| AI 只接收临时编号与必要文本，不发送稳定用户 ID | `data-processing.md` 第 6 节 |
| 不长期保存完整 AI 对话，任务一次性，归档不等于删除 | `data-processing.md` 第 4、6 节 |
| AI 强制结构化结果，计分由服务端决定 | `data-processing.md` 第 3、6 节 |
| 日志仅提供受权限约束的内部查询，不提供公开日志 API，不声称昵称天然匿名或提供方零留存 | `self-hosting-responsibilities.md` 第 4 节；`data-processing.md` 第 6 节 |
| 协助 YouTube 用途确认，当前没有配额扩展或重新审核需求，申请未提交 | 本文第 1 节 |
| 保留 SC 精翻和后台复盘 | `data-processing.md` 第 3、6 节 |

## 5. 来源核对记录

### 5.1 本地来源

| 来源 | 版本或范围 | 核对内容 |
| --- | --- | --- |
| `docs/proposal/y3_project_proposal.md` | 2026-11-09 对话决策整合版，761 行 | 全部 20 节完整读取。第 6、17、18 节在材料写作后补读，已列入第 4 节映射 |
| `.kiro/steering/` 下的十份规范 | 项目当前版本 | 全部读取 |
| 工单 VOXWARD-STORY-031 | revision 4，active | 实时读回，取得目标、需求、验收、分配和来源 |
| 工单 VOXWARD-SUB-055 | revision 3，active | 实时读回，取得交付物、依赖、验收和继承约束 |

### 5.2 外部来源（2026-11-10 核对）

| 页面 | 核对范围 | 结论与差异 |
| --- | --- | --- |
| [YouTube 开发者政策](https://developers.google.com/youtube/terms/developer-policies) | 全文，2026-11-10 以 full 模式读取；页面 Last updated 2026-11-06 UTC | III.D.2.c.i：经应用内撤销机制撤销授权后，已授权数据应尽快删除，且不迟于撤销后 7 个日历日。III.D.2.c.ii：经 Google 安全设置页撤销后，相关 API 数据不迟于撤销后 30 个日历日删除。III.E.4.g：用户请求删除存储数据时，应尽快且不迟于 7 个日历日删除，并须说明删除方法。III.E.4.c、III.E.4.d：一般授权数据与非授权数据最多保存 30 个日历日。III.E.4.h、III.I.15、III.L 已在全文中确认（见第 5.3 节） |
| [派生指标补充条款](https://developers.google.com/youtube/terms/derived-metrics-policy) | 前 8000 字符的片段 | 通常不允许创建替代或修改 API 数据的指标。获准 Analytics & Reporting 类用例后，可计算特定派生指标。统计数据和派生指标最长保存 36 个日历月。标题、名称、评论正文等仍按 30 天规则处理。示例为频道级评分，未见逐观众审核分的明确示例 |

### 5.3 来源差异

1. 提案第 11.3 节把“最迟七个日历日”的删除要求关联到 III.E.4.g（用户请求删除存储数据），两者一致。同一 7 日期限也见于 III.D.2.c.i（经应用内撤销机制撤销授权）。III.D.2.c.ii 的 30 日（经 Google 安全设置页撤销）与 III.E.4 的 30 日存储上限，是另外两条规定，`data-processing.md` 第 5.3 节分别列出。
2. III.E.4.h 已在全文中确认：不得用独立计算的类似数据替换 API 数据，也不得访问或使用 API 数据生成新的或派生的数据、指标。提案第 15.1 节的引用正确。
3. III.I.15 已在全文中确认：不得提供让用户直接或间接访问 YouTube API 服务所提供数据或功能的 API 服务。提案第 15.2 节对下游输出的说明引用该条，引用正确。该条是否适用于下游输出，仍待平台确认（见 `platform-questions.md` 的 Q5）。
4. 提案第 12.3 节把派生指标的 36 个月与 30 天规则放在一起说明，与派生指标补充条款页的片段一致。III.L 已在全文中确认：派生指标与数据存储的附加政策，只适用于经审核、通过标准配额扩展申请明确申请许可的分析用例（自 2026-06-01 起）。36 个月的数值来自派生指标补充条款页，本包只核对到前 8000 字符片段，未全文核对。

### 5.4 提案引用但本包未核对的外部页面

- OAuth 政策：[OAuth 政策](https://developers.google.com/identity/protocols/oauth2/policies)
- 验证例外：[验证例外](https://support.google.com/cloud/answer/13464323?hl=en)
- OAuth 发布状态说明：[发布状态说明](https://support.google.com/cloud/answer/15549945?hl=en)
- YouTube API 表单：[YouTube API 表单](https://support.google.com/youtube/contact/yt_api_form)
- YouTube 的 liveChatMessages 资源、streamList 与 delete 参考页，授权说明，流式聊天指南
- Kiro 文档：无头模式、会话管理、Crew 系统与存储、数据保护说明
- SQLite WAL 文档、OneComme 的 HTTP API 与插件文档、VTube Studio 的官方 API、Streamer.bot 文档
- Kiroween 2026 的规则与 FAQ

## 6. 未验证项与不做的事

### 6.1 未验证项

- 第 5.4 节列出的外部页面。
- 派生指标补充条款页的全文，本包只核对到前 8000 字符片段。
- AI 提供方的留存、训练选项和删除能力。
- Kiro 与 Crew 的清理行为（提案第 8.4、20.1 节）。
- 第三方接入的版本兼容性（OneComme、VTube Studio、blivechat、Streamer.bot）。
- 模型性能、延迟与容量（提案第 18 节）。
- 法律角色认定。本包不做认定。

### 6.2 本包不做的事

- 不提交平台表单，不接受条款或派生指标补充条款，不创建或修改 Cloud 项目和 OAuth 配置。
- 不发布，不推送，不做任何真实平台操作。
- 不写引擎工单，不改动 VOXWARD-STORY-031 和 VOXWARD-SUB-055 的受管内容。
- 不写入个人身份资料、联系方式或真实用户数据。
- 不把自测写成独立验收或外部批准。
- 参赛演示、英文材料、视频和提交由 VOXWARD-EPIC-007 承接（提案第 19.3 节）。
