# VoxWard 主线程总流程（master spec）

主线程（main 档）用。每批开工前先读本文件，按顺序逐项打勾。
本文件只是本地清单：打勾不改变工单状态，也不能当完成证据。正式状态以 Einzbern 引擎为准。

## 固定输入

| 项 | 值 |
|---|---|
| 库 | `/home/ryanlan/GoogleDrive/Cloud Workspace/Ether`（workspace:7732a51de4c38afb83bb77cf） |
| 项目 | project:f824c7861e6888255132af42 |
| INIT | VOXWARD-INIT-001 |
| 拆单决定 | minutes:a791ac5683fc0b966d851c2f（Epic/Story）、minutes:be2ce03bcd6fda69f1db9839（Subtask/分配） |
| 连续推进授权 | minutes:fd542a49a57a9e6526440dac：spec 免审，按批量原则做到底；只有产品方向改动或完全硬阻断时才停下。推送、发布、真实平台操作、参赛提交不在授权内 |
| 引擎 | `node ~/.einzbern/engine/einzbern.mjs <verb>`；work-show 很慢（约 40 秒）、输出很大（约 1.9MB），一律重定向到文件再提取 |

## 每批固定步骤

每一批都按顺序做下面这些步骤，不能跳过。

- [ ] A1. 读引擎实时状态：本批 Story 和 Subtask 的 status、revision、blockedBy 是否都已满足
- [ ] A2. 确认 Owner 授权已经覆盖本批；把授权（minutes 编号和原话）写进派工任务里
- [ ] A3. 按本文件末尾的批次表定本批的包：有依赖或改同一批文件的放进同一个包
- [ ] A4. **每个 Story 都要先写 spec**：在该包的工作树里运行 `kiro-specs.mjs init`，补写 design.md 和 tasks.md（写在受管段外），再 `check` 得到 SPEC_CURRENT。第 2 批起，spec 由实施子代理在写代码之前完成，并作为该分支的第一个 commit；之后才能开始写代码。独立验收时也要核对 spec 和实际做出来的东西是否一致
- [ ] A5. ~~把 spec 给 Owner 看~~：从第 1 批之后跳过（minutes:fd542a49a57a9e6526440dac D2）
- [ ] A6. 每个包建一个工作树：`git worktree add .worktrees/<name> -b voxward/<name> main`
- [ ] A7. 把本批的 Story 和 Subtask 转成 ready→active（work-batch），然后读回
- [ ] A8. 选模型：`execution-policy-resolve --host kiro --category economy --rejections <n>`，返回什么就用什么，不自己挑
- [ ] A9. 派工：每个包派一个**新**子代理。任务里写明 spec 路径、授权、工作树、自测命令、交付格式、停止条件。`include_memory=false` 时，需要的事实都写进任务里
- [ ] A10. 等完成通知，中途不轮询；子代理有疑问时先自己筛一遍，能按已有授权处理的就自己处理，不转给 Owner
- [ ] A11. 子代理完成后：`spawn_release` 收掉它；把它的证据复制到能长期保存的位置（scratch 会被清理）
- [ ] A12. 本批所有包合回 main（只在本地，不推送）；有冲突交给一个集成子代理处理。**合并后、交给验收前**，主线程要在一个干净检出里跑 `pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm test && pnpm check:deps`。没有文本冲突也可能有类型冲突（第 2 批的 B1 就是这样）。跑完再做一步默认配置的启动冒烟：不设任何 `VOXWARD_*` 数据库变量，跑 `pnpm dev`，确认 `/healthz` 返回 200（第 3 批的 B1 就是漏了这一步）
- [ ] A13. 独立验收：派一个 main 档子代理，验收人不能是实施人。被打回时记录 rejection 次数，下次派工按 A8 升档
- [ ] A14. 链写一次：转态和证据通过 work-batch 写入，然后读回；新学到的东西用 knowledge-capture 记下（最多 5 条）
- [ ] A15. 收工作树和分支；只有全部完成或全部卡住时，才向 Owner 汇报一次

## 批次

| 批 | Story | 包 | 状态 |
|---|---|---|---|
| 1 | S001 | P1：SUB-001→002→003 | **done**：main ffa1ddc；验收 47/47 行 satisfied（8890cf9）；工单已转 done；知识卡 4 张 |
| 2 | S002, S004, S031 | SUB-004→005；SUB-008→009；SUB-055 | **done**：S002 在 0a1da29 完成；S004 和 S031 各被打回 1 次，返工后在 acb37d1 完成；证据在 `.kiro/specs/voxward-batch2/evidence/`（含 rework/）；知识卡新增 6 张。复验那一轮 opus-5.5 拒绝执行，宿主改用 claude-opus-4.8 完成 |
| 3 | S003, S005, S007 | SUB-006→007（两张都属 S003，合成一个包，共用一份 spec）；SUB-010→011；SUB-013→014 | S005、S007 **done**（9b7a7f8）。S003 被打回（B1 默认配置起不来、B2 URL 里的令牌进日志），返工中，rejections=1。证据在 `.kiro/specs/voxward-batch3/evidence/` |
| 4 | S006, S008, S012, S016 | SUB-012；SUB-015→016；SUB-023；SUB-029→030 | 未开始 |
| 5 | S009, S013, S017, S018 | SUB-017→018；SUB-024→025；SUB-031→032；SUB-033→034 | 未开始 |
| 6 | S010, S011, S014 | SUB-019→020；SUB-021→022；SUB-026→027 | 未开始 |
| 7 | S015, S019, S021, S027 | SUB-028；SUB-035→036；SUB-039→040；SUB-049→050 | 未开始 |
| 8 | S020, S022, S023, S024, S026 | SUB-037→038→042；SUB-041；SUB-043；SUB-044→045；SUB-048 | 未开始 |
| 9 | S025, S028 | SUB-046→047；SUB-051 | 未开始 |
| 10–13 | S029, S030, S032, S033 | SUB-052→053；SUB-054；SUB-056；SUB-057、SUB-058 | 未开始 |

批次表根据 2026-11-10 拆单报告的依赖层整理。开工前仍以 A1 读到的实时 blockedBy 为准。

## 问题清单（只登记范围外的新问题，等到对应批次再处理）

| # | 来源 | 问题 | 归到哪批处理 |
|---|---|---|---|
| Q1 | 第 1 批验收 N1 | check-deps 规定模块里不能导入外部包，`apps/server/src/db/` 现在也没有归到任何分区。S002 要先在 check-deps 里给 db 层定好分区和规则，再接 Drizzle 和 SQLite | 第 2 批 S002 |
| Q2 | 第 1 批验收 N2 | 主机名解析失败或端口被占用时，服务会打印整段堆栈后退出，报错不受控 | 第 2 批 S002 包（也改启动入口，顺带修） |
| Q3 | 第 1 批验收 N3 | `InferenceRequest` 用 `correlationId` 当唯一编号；但提案 §8.1 要求模型输入只带临时 `itemId`，需要由适配器生成，并记下两者的对应关系 | 第 3 批 S007 / 第 4 批 S008 |
| Q4 | 第 1 批验收 N5 | 类型级契约断言只在 `pnpm typecheck` 时生效；验收必须同时跑 typecheck 和 test | 每批验收 |
| Q5 | 第 1 批验收 N6 | `vitest.workspace.ts` 已被标为弃用，以后升级 vitest 时要迁移 | 以后升级时 |
| Q6 | 第 2 批验收 N1 | 可组合的组合标记（如 U+0301）能绕过归一化规则 | 第 4 批 S006 |
| Q7 | 第 2 批验收 N2 | 昵称缓存没有按主体失效的接口；删除请求之后，缓存最多还会留 1 小时 TTL | 第 7 批 S019 |
| Q8 | 第 2 批验收 N3 | 昵称检查有两套存放方式：持久表 `subject_nickname_checks` 和进程内缓存，只能保留一套 | 第 4 批 S006 |
| Q9 | 第 2 批验收 N4 | esbuild 打包参数在接入 better-sqlite3 后无法运行，迁移目录在打包后也找不到 | 第一个把 db 接进 `main.ts` 的 Story（第 3 批 S003 或 S005） |
| Q10 | 第 2 批验收 N5/N6 | S002 spec 的「来源缺口」一节重复了两次；SUB-008/009 交付清单写的路径是 `moderation/`，实际是 `moderation-engine/` | 下次修改时一并处理 |
| Q11 | 第 2 批验收 N8 | 工单链写后，已完成 Story 的 spec 会报 SPEC_STALE，这是正常的；如果还要用当前 spec，用 `refresh --approved-in` 刷新 | 每批 |
| Q12 | 第 2 批复验 N1 | 正则准入收紧后，`(a|b)` 这种分组内分支，以及「无界量词 + 变长有界量词」的组合都会被拒绝。规则配置界面要提示用户改用顶层分支，或拆成多条规则 | 第 4 批 S006 |
| Q13 | 第 2 批复验 N8 | 派生指标补充条款页只读到了片段，36 个月的保留数值还没按全文核对 | S031 后续材料轮 / S032 |
| Q14 | 第 2 批复验 | 派工时指定的 claude-opus-5.5 拒绝执行一次，宿主自动改用 claude-opus-4.8。以后每次读结果都要看实际用的是哪个模型，并记下来 | 每批 |
| Q15 | 第 3 批验收 N2 | bidi 与零宽字符原样保留，页面要用 `<bdi>` 隔离 | S022 |
| Q16 | 第 3 批验收 N3 | 浏览器类下游（OBS Browser Source、WebSocket）没法带 Authorization 头，需要一种不经过查询串的令牌交付方式 | S021、S023 |
| Q17 | 第 3 批验收 N4 | 还没有创建首个账号和频道的入口 | S029（部署初始化）、S022（成员邀请） |
| Q18 | 第 3 批验收 N7 | `output_grants` 和 `credential_refs` 里的输出用途目前没人用 | S021 |
| Q19 | 第 3 批验收 N8/N9/N13 | ① 首次决策没有效果时不留幂等记录；② 人工补偿和身份事件的幂等键是全局的；③ 计分入口和业务事务组合不起来 | S014 |
| Q20 | 第 3 批验收 N10 | 分数顶到上限时，会员升级不加分，到期却扣分。提案 §5.2 已建议「把身份基准与行为调整分开记录，再算最终钳制分数」，照提案改，不需要 Owner 决定 | S013（身份事件）实现，S026 验证 |
| Q21 | 第 3 批验收 N11 | 例外守卫只在模块层，端口本身不拒绝对例外主体的写入 | S014、S019 |
| Q22 | 第 3 批验收 N12 | Verdict 不带规则命中列表 | S006 |
| Q23 | 第 3 批验收 N14 | SC 里判为 BLOCK 的条目，译文如果命中规则，会让整批失败 | S010 |
| Q24 | 第 3 批验收 N15/N16 | 输出条数和错误条数都没有上限；契约不导出 JSON Schema | S008 |
| Q3 | 更新 | S007 已完成契约和校验；生成 itemId、记录映射、改 `InferenceRequest` 仍归 S008 | S008 |
| Q9 | 更新 | 已修（第 3 批 E08） | — |
