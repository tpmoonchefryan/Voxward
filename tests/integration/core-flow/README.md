# Core Flow Cross-Module Integration Fixtures (`VOXWARD-STORY-026` / `VOXWARD-SUB-048`)

本目录包含固定候选版本 `fcad360` 下核心消息处理闭环的**确定性合成重放场景与故障夹具**，全部输入均为合成构造，不依赖真实 YouTube OAuth 或真实 Kiro CLI。

## 目录结构与 Vitest 映射关系

| 夹具文件 | 对应 Vitest 测试套件（`apps/server/test/integration/core-flow/`） | 覆盖范围与关联 Q 项 |
| --- | --- | --- |
| `fixtures/routing-scoring.json` | `routing-scoring.test.ts` | 多语种/谐音/规范化规则、匿名/噪声/白名单/中分抽查/高分快通/例外 `REALTIME_REVIEW(reason="EXCEPTION")`、上下限钳制与身份基准分离重算（`Q20`、`Q43`） |
| `fixtures/dedupe-replay-sc.json` | `dedupe-replay-sc.test.ts` | `MessageIdStore` + `channel_events_dedupe_uq` 双重去重（`Q39`）、`classifyReplay` 时间戳边界（`Q41`）、SC 文本与 `PAID` 车道（`Q46`/`Q52`）、会员里程碑事件、平台删除重试与失败降级/审计 |
| `fixtures/manual-coordinator-wiring.json` | `manual-coordinator-wiring.test.ts` | 人工裁决并发冲突与改判纠分重算（`Q49`/`Q55`）、异常不扣分与评分例外零分窗口、`TaskCoordinator` 优先级/微批/未知任务收敛（`Q57`）、以及组合根现状对照（`N7`/`N12b` `NO_SUBJECT_CACHES` 与默认 `CandidateStore`、`N13` `output-store.ts` `TRANSLATION` JSON 读取） |

## 约束说明

- 本目录与对应测试严格遵守 `VOXWARD-SUB-048` 只读边界：**不修改** `apps/server/src/**`、`apps/web/src/**`、`packages/contracts/src/**`、`scripts/**` 或 `vitest.workspace.ts`。
- 实测中发现的既有边界缺陷或未装配缺口均以最小可复现断言固定，并记录于 [core-flow-matrix.md](file:///home/ryanlan/Code/Voxward/.worktrees/s026-core-flow/docs/acceptance/core-flow-matrix.md)。
