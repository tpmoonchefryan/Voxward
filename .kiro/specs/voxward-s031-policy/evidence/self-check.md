# S031 自查证据（VOXWARD-SUB-055 政策材料）

本文件是自查记录，不是独立验收。独立审查由子单 verificationOwner 指定的批末审查代理承担。自查只说明材料草稿与验收行的对应关系，不表示平台已批准、法律已确认或工单已完成。

## 1. 基本信息

| 项目 | 内容 |
| --- | --- |
| 父 Story | VOXWARD-STORY-031，`work:c9c3c501eab15d2b2e980f45`，revision 4，active |
| 子单 | VOXWARD-SUB-055，`work:03ed7f149506ee6314265eeb`，revision 3，active |
| 分支与基线 | `voxward/s031-policy`，基于 `main` 的 `3af4a5f` |
| 提交 | `e24a058` VOXWARD-STORY-031: add S031 spec；`2ce5e2e` VOXWARD-SUB-055: draft policy materials；本文件所在提交为最后一个提交 |
| 基线文件 | `docs/proposal/y3_project_proposal.md`，SHA-256 `cad909c1f8e839bfef64b5e2b7ba0569059cef953e4e652d8dda734750a133ee`，761 行。与工单决策 D2 记录的产品基线一致 |

## 2. 父 Story 条款的覆盖

依据 VOXWARD-STORY-031 的需求 VW-S031-R001（交付：六类平台问题、数据流/角色/授权/评分公式、保留/删除/例外说明、外部 AI 披露、自托管 Cloud/API Client 责任、现状和缺项清单）。

| 父 Story 条款 | 草稿位置 | 状态 |
| --- | --- | --- |
| 六类平台问题 | `docs/policy/platform-questions.md` 第 1 节（Q1 至 Q6） | 草稿完成。平台答复未获得 |
| 数据流 | `docs/policy/data-processing.md` 第 1 节 | 草稿完成 |
| 角色与授权 | `docs/policy/data-processing.md` 第 2 节 | 草稿完成 |
| 评分公式 | `docs/policy/data-processing.md` 第 3 节 | 草稿完成。描述的是提案设计目标，尚未实现 |
| 保留、删除与例外 | `docs/policy/data-processing.md` 第 4、5 节 | 草稿完成。期限数值与删除时限的适用仍待确认 |
| 外部 AI 披露 | `docs/policy/data-processing.md` 第 6 节；`platform-questions.md` 的 Q6 | 草稿完成。AI 提供方条款未核对 |
| 自托管 Cloud/API Client 责任 | `docs/policy/self-hosting-responsibilities.md` 第 1 至 3 节 | 草稿完成。Cloud 项目的审核覆盖未确认 |
| 现状和缺项清单 | `docs/policy/status-and-gaps.md` 第 1、2 节 | 草稿完成 |

父 Story 的完整判据（VW-S031-AC001）包含其它责任单的交付和独立审查。本包只覆盖子单承担的部分，不宣称父级判据已满足。

## 3. AC001 逐条覆盖

判据来自 VW-SUB055-AC001：将 proposal 和计划契约逐项映射到政策材料，核对已有申请事实。

| 判据要点 | 覆盖位置 | 结论 |
| --- | --- | --- |
| 逐项映射 proposal 与计划契约 | `status-and-gaps.md` 第 4 节（提案 §1 至 §20，含子节）；第 4.1 节（§20.2 中与政策相关的决策） | 覆盖 |
| 核对已有申请事实 | `status-and-gaps.md` 第 1 节（逐项对照提案 §15.3） | 覆盖 |
| 不虚构配额需求 | `status-and-gaps.md` 第 1 节（配额扩展：当前没有需求） | 覆盖 |
| 不虚构重新审核 | `status-and-gaps.md` 第 1 节（平台重新审核通知：当前没有收到） | 覆盖 |
| 不虚构 Cloud 编号 | `status-and-gaps.md` 第 1、2 节；`self-hosting-responsibilities.md` 第 3 节 | 覆盖 |
| 不虚构许可或平台结论 | `platform-questions.md` 第 1 节 Q1；`status-and-gaps.md` 第 1 节（未获得平台结论） | 覆盖 |
| 不把内部改名当自动合规 | `platform-questions.md` 开头的边界说明与第 3 节 | 覆盖 |
| 不把主播同意当自动合规 | `platform-questions.md` 第 3 节；Q2 | 覆盖 |
| 不把 HMAC 标记当自动合规 | `data-processing.md` 第 5.4 节；`platform-questions.md` 第 3 节 | 覆盖 |
| 外部反馈独立跟踪 | `platform-questions.md` 第 3 节 | 覆盖 |
| 外部反馈不阻塞合成开发 | `platform-questions.md` 第 3 节 | 覆盖 |
| 材料与基线逐项核对 | 本文第 5 节；`status-and-gaps.md` 第 4 节 | 覆盖 |
| 列出需实际部署或身份信息补齐处 | `status-and-gaps.md` 第 2 节；`self-hosting-responsibilities.md` 第 2 节部署检查清单 | 覆盖 |
| 不提交或接受条款 | `status-and-gaps.md` 开头与第 6.2 节。本包未执行提交或接受操作 | 覆盖 |

## 4. 其它验收行

| 验收行 | 覆盖位置 | 结论 |
| --- | --- | --- |
| VW-SUB055-STORY | 本文第 2 节 | 覆盖（草稿） |
| VW-SUB055-PARENT | 本文第 2 节。不宣称父级判据已满足 | 覆盖（草稿） |
| VW-SUB055-INHERIT-001（远端自托管、版本化模块契约、不引入生产托管或新本机代理） | `data-processing.md` 第 1 节 | 覆盖（设计描述） |
| VW-SUB055-INHERIT-009（只用必要文本与临时编号；不长期保存完整会话；Archive 不等于删除） | `data-processing.md` 第 6 节 | 覆盖 |
| VW-SUB055-INHERIT-011（经后端短事务写入，SQLite；浏览器与 AI 不直写；不复制正文） | `data-processing.md` 第 1、5.2 节 | 覆盖 |
| VW-SUB055-INHERIT-012（频道与角色校验；输出凭据只读可撤销；待审文本不作指令） | `data-processing.md` 第 2、6、7 节；`self-hosting-responsibilities.md` 第 2 节 | 覆盖 |
| VW-SUB055-INHERIT-017（生命周期：评分、账本、缓存、两类日志、队列、AI 目录、WAL、备份） | `data-processing.md` 第 4、5.2 节 | 覆盖 |
| VW-SUB055-INHERIT-021（真实申请状态与缺项，不虚构地址、编号或审批） | `status-and-gaps.md` 第 1、2 节 | 覆盖 |
| VW-SUB055-INHERIT-022（保留原始要求；参赛演示与提交归 VOXWARD-EPIC-007） | `status-and-gaps.md` 第 2、6.2 节 | 覆盖 |

## 5. 格式、路径与内容检查

- 外链格式：全部外链使用 Markdown 链接形式。检查 `(^|[^(<])https?://` 无匹配，没有裸 URL。
- 外链清单（均在 `platform-questions.md` 第 4 节或 `status-and-gaps.md` 第 5 节）：开发者政策、派生指标补充条款、YouTube API 表单、OAuth 政策、两个 Google 支持页、以及 OAuth 发布状态说明。
- 仓库内路径：文档中反引号引用的仓库路径全部存在，包括 `docs/proposal/y3_project_proposal.md`、`docs/policy/` 下四份文件、`.kiro/steering/`。
- 绝对路径：`docs/policy/` 中没有本机绝对路径。
- 个人信息：没有邮箱，没有法定姓名，没有 Cloud 项目编号，没有真实用户数据。
- 否定性表述：检索“PII”“匿名”“已批准”“已合规”“昵称不是”等词，出现的位置都在否定或限定语境中，见 `data-processing.md` 第 5.4、6 节与 `platform-questions.md` 第 3 节。
- 外部条款核对范围：只核对了开发者政策与派生指标补充条款两页的前 8000 字符片段，见 `status-and-gaps.md` 第 5.2 节。其它外链未核对，材料中已标注。

## 6. 工程与规范检查

| 步骤 | 命令 | 退出码 | 摘要 |
| --- | --- | --- | --- |
| 依赖安装 | `pnpm install --frozen-lockfile` | 0 | 157 个包，锁文件未改变 |
| 构建 | `pnpm build` | 0 | `apps/server` 与 `apps/web` 构建完成 |
| 类型检查 | `pnpm typecheck` | 0 | `packages/contracts`、`apps/server`、`apps/web` 通过 |
| 测试 | `pnpm test` | 0 | 5 个测试文件，41 个用例全部通过 |
| Spec 检查 | `kiro-specs.mjs check` | 0 | `SPEC_CURRENT`，工单 revision 4，源摘要 `29f8c48435f86e1e87fba3a6609cd7325b8e5265199685ea4a8665254fc967ae` |

以上检查在本工作树当前状态下运行。临时文件放在会话暂存区，没有放在共享的 `/tmp`。

## 7. 未验证项与缺口

- 外部条款：开发者政策只核对了片段，`III.E.4.h` 与 `III.I.15` 未核对。提案引用的其它外链未核对。
- 删除时限：提案 §11.3 的 7 日表述与条款原文的适用条件不一致，待确认。
- 平台答复：Q1 至 Q6 均无平台书面答复。
- 保留期限：提案给出的 7 天和 30 天是建议值，未经平台或实测确认。
- 未执行的实测：Kiro 与 Crew 的清理行为、AI 提供方的留存、第三方接入兼容性、模型性能与容量。这些属于提案缺项，不在本包范围内。
- 法律角色：本包不认定任何一方的法律角色。

## 8. 结论

- 草稿已覆盖 VW-SUB055-AC001 及子单的各条验收行，对应关系见本文第 3、4 节。
- 草稿中没有平台批准、合规或完成的声明。
- 待 Owner 确认的事项见 `status-and-gaps.md` 第 3 节，本包没有等待这些事项。
