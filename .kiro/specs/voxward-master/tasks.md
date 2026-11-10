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
- [ ] A4. **每个 Story 都要先写 spec**：在该包的工作树里运行 `kiro-specs.mjs init`，补写 design.md 和 tasks.md（写在受管段外），再 `check` 得到 SPEC_CURRENT
- [ ] A5. ~~把 spec 给 Owner 看~~：从第 1 批之后跳过（minutes:fd542a49a57a9e6526440dac D2）
- [ ] A6. 每个包建一个工作树：`git worktree add .worktrees/<name> -b voxward/<name> main`
- [ ] A7. 把本批的 Story 和 Subtask 转成 ready→active（work-batch），然后读回
- [ ] A8. 选模型：`execution-policy-resolve --host kiro --category economy --rejections <n>`，返回什么就用什么，不自己挑
- [ ] A9. 派工：每个包派一个**新**子代理。任务里写明 spec 路径、授权、工作树、自测命令、交付格式、停止条件。`include_memory=false` 时，需要的事实都写进任务里
- [ ] A10. 等完成通知，中途不轮询；子代理有疑问时先自己筛一遍，能按已有授权处理的就自己处理，不转给 Owner
- [ ] A11. 子代理完成后：`spawn_release` 收掉它；把它的证据复制到能长期保存的位置（scratch 会被清理）
- [ ] A12. 本批所有包合回 main（只在本地，不推送）；有冲突交给一个集成子代理处理
- [ ] A13. 独立验收：派一个 main 档子代理，验收人不能是实施人。被打回时记录 rejection 次数，下次派工按 A8 升档
- [ ] A14. 链写一次：转态和证据通过 work-batch 写入，然后读回；新学到的东西用 knowledge-capture 记下（最多 5 条）
- [ ] A15. 收工作树和分支；只有全部完成或全部卡住时，才向 Owner 汇报一次

## 批次

| 批 | Story | 包 | 状态 |
|---|---|---|---|
| 1 | S001 | P1：SUB-001→002→003 | A1–A8 已完成；A9 实施中 |
| 2 | S002, S004, S031 | SUB-004→005；SUB-008→009；SUB-055 | 未开始 |
| 3 | S003, S005, S007 | SUB-006；SUB-007；SUB-010→011；SUB-013→014 | 未开始 |
| 4 | S006, S008, S012, S016 | SUB-012；SUB-015→016；SUB-023；SUB-029→030 | 未开始 |
| 5 | S009, S013, S017, S018 | SUB-017→018；SUB-024→025；SUB-031→032；SUB-033→034 | 未开始 |
| 6 | S010, S011, S014 | SUB-019→020；SUB-021→022；SUB-026→027 | 未开始 |
| 7 | S015, S019, S021, S027 | SUB-028；SUB-035→036；SUB-039→040；SUB-049→050 | 未开始 |
| 8 | S020, S022, S023, S024, S026 | SUB-037→038→042；SUB-041；SUB-043；SUB-044→045；SUB-048 | 未开始 |
| 9 | S025, S028 | SUB-046→047；SUB-051 | 未开始 |
| 10–13 | S029, S030, S032, S033 | SUB-052→053；SUB-054；SUB-056；SUB-057、SUB-058 | 未开始 |

批次表根据 2026-11-10 拆单报告的依赖层整理。开工前仍以 A1 读到的实时 blockedBy 为准。
