<!-- EINZBERN-SPEC:MANAGED-START -->
# Design

<!-- Einzbern source: work=work:c9c3c501eab15d2b2e980f45 revision=4 sha256=29f8c48435f86e1e87fba3a6609cd7325b8e5265199685ea4a8665254fc967ae -->

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


## S031 政策材料结构设计（本地段，受管段之外）

本段由 VOXWARD-SUB-055 的实施子代理写入，只规划 `docs/policy/` 下的草案结构。它不是产品设计权威，不改变 VOXWARD-STORY-031 的受管需求，也不构成完成证据。受管段显示 design authority 未配置；本段不推断任何设计权威。

### 1. 范围与来源基线

- 交付范围：VOXWARD-SUB-055 的 deliverables，四份文件位于仓库内 `docs/policy/`。
- 材料性质：政策与数据处理草案，供 Owner 决定对外用途。它不是提交给平台的表单内容，也不是法律意见。
- 来源基线：
  - S-PROPOSAL：`docs/proposal/y3_project_proposal.md`（2026-11-09 对话决策整合版）。完整读取 §1–§5、§7–§16、§19–§20；§6、§17、§18 于材料写作后补读，已在 `status-and-gaps.md` 第 4 节映射。
  - S-STEERING：`.kiro/steering/00-harness.md` 至 `90-subagent-lifecycle.md`，共 10 份，全部读取。
  - S-WORK：实时工单读回（work-show，2026-11-10）。VOXWARD-STORY-031 为 revision 4；VOXWARD-SUB-055 为 revision 3。
  - S-EXT：web_fetch 核对（2026-11-10）。见第 5 节。

### 2. 文件清单与章节

| 文件 | 章节 | 主要来源 | 覆盖的需求或验收 |
| --- | --- | --- | --- |
| `docs/policy/platform-questions.md` | 0 使用说明；1 六类平台问题（Q1–Q6）；2 每问的前置事实与所需答复形式；3 当前无答复的事项 | 提案 §15.1、§15.2、§5.1、§8、§11、§13.2、§3.3 | VW-S031-R001 的“六类平台问题”；VW-SUB055-AC001 |
| `docs/policy/data-processing.md` | 1 数据流；2 角色与授权；3 评分公式与计分规则；4 保留与刷新期限；5 删除与记分例外；6 外部 AI 披露；7 下游输出范围 | 提案 §2.1、§2.2、§3.1、§3.2、§4.2、§5.1–§5.4、§8、§9.3、§10、§11、§12、§13.1、§16 | VW-S031-R001 的数据流/角色/授权/评分公式、保留/删除/例外说明、外部 AI 披露；INHERIT-009、011、012、017 |
| `docs/policy/self-hosting-responsibilities.md` | 1 部署方与 VoxWard 的职责划分；2 YouTube 凭据与 OAuth；3 Cloud 项目与审核覆盖；4 备份、日志与数据请求；5 未决边界 | 提案 §2.2、§3.3、§11.1、§12.2、§12.3、§12.4、§15.2 第 4 问、§16、§20.1 | VW-S031-R001 的自托管 Cloud/API Client 责任；INHERIT-001 |
| `docs/policy/status-and-gaps.md` | 1 申请现状（不含个人身份信息）；2 缺项清单；3 待 Owner 确认项；4 提案条款映射（§1–§20）；5 来源核对记录；6 未验证项与不做的事 | 提案 §15.3、§20.1、§19.3、§20.2；工单 VW-S031-R001；web_fetch 记录 | VW-S031-R001 的现状和缺项清单；VW-SUB055-AC001 的逐项映射；INHERIT-021、022 |

每份文件开头写明：草案状态、来源列表、本文不构成平台批准或法律结论。文件内的仓库引用使用仓库相对路径。

### 3. 验收行对应表（VW-SUB055-*）

| 验收行 | 判定要求（工单原文摘要） | 对应位置 |
| --- | --- | --- |
| VW-SUB055-AC001 | 将提案与计划契约逐项映射到政策材料，核对已有申请事实；不虚构配额、重新审核、Cloud 编号或许可；不把内部改名、主播同意或 HMAC 当自动合规 | `status-and-gaps.md` 第 1 节（§15.3 逐项核对）与第 4 节（§1–§20 映射）；四份文件的来源节 |
| VW-SUB055-STORY | 承担 VW-S031-R001 的全部交付：六类平台问题、数据流/角色/授权/评分公式、保留/删除/例外、外部 AI 披露、自托管责任、现状与缺项 | 六类问题见 `platform-questions.md` 第 1 节；其余各项见上表对应章节 |
| VW-SUB055-PARENT | 复用父 Story 同候选版本的材料证据，保留来源与实际观察 | `evidence/self-check.md` 第 2 节列出父 Story 条款与本包覆盖关系；不声称父级完整判据已满足 |
| VW-SUB055-INHERIT-001 | 远端自托管，版本化模块契约，不引入生产托管或新本机代理 | `data-processing.md` 第 1 节（数据流与拓扑）；`self-hosting-responsibilities.md` 第 1 节 |
| VW-SUB055-INHERIT-009 | 只使用必要文本与临时编号；不长期保存完整会话；Archive 不等于提供方删除 | `data-processing.md` 第 6 节 |
| VW-SUB055-INHERIT-011 | 所有写入经单后端短事务与服务器本地 SQLite；浏览器与 AI 不直写 | `data-processing.md` 第 1 节 |
| VW-SUB055-INHERIT-012 | 角色与服务端鉴权；输出凭据只读、可撤销；不泄露生产凭据 | `data-processing.md` 第 2、7 节；`self-hosting-responsibilities.md` 第 2 节 |
| VW-SUB055-INHERIT-017 | 保留、删除与备份覆盖评分、账本、缓存、两类日志、队列、AI 目录、WAL 与备份 | `data-processing.md` 第 4、5 节 |
| VW-SUB055-INHERIT-021 | 真实申请状态与缺项；不虚构已存在的地址、编号或审批 | `status-and-gaps.md` 第 1、2 节 |
| VW-SUB055-INHERIT-022 | 保留原始要求；本单不做演示、英文材料或参赛提交，这些归 VOXWARD-EPIC-007 | `status-and-gaps.md` 第 6 节 |

### 4. 写作规则

- 只写来源支持的事实。没有来源的法律结论、平台审批状态、保留期限数值一律标为“未确认”或“待 Owner 确认”。
- 提案已否定的说法不写入，包括“昵称不是 PII”、“自托管即免除责任”和“HMAC 即匿名”。
- 不写个人联系邮箱、法定姓名、Cloud 项目编号或任何真实用户数据。提案 §15.3 明确这些信息不写入公开项目文档。
- 外部链接使用提案原链接；核对过的条款用改写表述并附链接，不直接大段抄录。
- 文件中不出现本机绝对路径，仓库内引用使用仓库相对路径。
- 文档用中文撰写，英文术语保留原文。

### 5. 外部条款核对记录（web_fetch，2026-11-10）

| 来源 | 核对到的内容 | 与提案的对应 |
| --- | --- | --- |
| YouTube 开发者政策页（`developers.google.com/youtube/terms/developer-policies`），只取到前 8000 字符片段 | 撤销授权后，经授权撤销机制执行的数据删除应尽快进行，且不迟于撤销后 7 个日历日；经 Google 安全设置页撤销的，相关 API 数据删除不迟于 30 个日历日；存储条款（E.4）规定授权数据在 30 个日历日内删除或刷新，并每 30 天核验授权仍有效；非授权数据不得超过 30 天 | 提案 §11.3 把 7 日规定与 III.E.4 关联。核对结果显示 7 日规定针对“撤销授权”的情形，E.4 的存储期限是 30 日。两者适用条件不同，本包不把 7 日写成所有删除请求的统一期限，列入待确认 |
| 派生指标补充条款页（`developers.google.com/youtube/terms/derived-metrics-policy`），前 8000 字符 | 通常禁止创建替代或修改 API 数据的指标；获准 Analytics & Reporting 类用例后，可计算特定派生指标。统计数据与派生指标可保存至 36 个日历月；标题、名称、评论正文等仍按 30 天刷新或删除。示例包括频道级评分，未见逐观众审核分的明确示例 | 与提案 §12.3、§15.1 的读法一致。提案 §15.1 引用的“III.E.4.h”编号本次未在核对片段中见到，列为未确认 |

提案其余引用的外部页面（OAuth 政策、验证例外、发布状态说明、YouTube API 表单、Kiro 文档等）本次未逐条核对，材料中标注为“提案引用，未核对”。

### 6. 待 Owner 确认项（只列出，不阻塞写作）

1. 六类平台问题的提交入口与形式。提案称表单入口与“单纯用途咨询”不完全吻合，需要 Owner 确认。
2. 是否接受派生指标补充条款。页面要求在接受条款时选择特定用例，接受属于不可逆的承诺，材料不代为接受。
3. 提案 §11.3 的“七日”表述与条款原文的适用条件是否一致，由 Owner 或平台确认。
4. 保留期限数值（原文与映射 7 天、元数据 30 天）是否采用，以及真实评分期限。提案称真实期限待平台确认。
5. 自托管分发时，软件项目与部署方 Cloud 项目的审核责任与覆盖范围（提案 §15.2 第 4 问）。
6. 所选 AI 服务的提供方留存、训练选项与部署页面展示的实际政策（提案 §8.4）。
7. 下游输出是否触及再提供 API 数据的限制（提案 §15.2 第 5 问，并涉及开发者政策 III.I.15，本次未核对）。
8. 公开材料的范围与时间，包括是否公开 `docs/policy/` 草案、删减哪些内容。
9. 隐私政策、官网、演示地址的承担方与形式。
10. 申请主体的身份资料，只在正式申请时补全，不写入仓库。

### 7. 不做的事

- 不提交平台表单、不接受条款、不创建或修改 Cloud 项目或 OAuth 配置、不发布、不推送。
- 不写引擎工单，不修改 VOXWARD-STORY-031 或 VOXWARD-SUB-055 的受管内容。
- 不修改主工作区、`.kiro/steering` 或 skills，不触碰同批其它工作树。
- 不做法律结论，不替 Owner 做角色认定。
- 不把自测写成独立验收或外部批准。
