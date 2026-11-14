# Core Flow Cross-Module Integration Fixtures (`VOXWARD-STORY-026` / `VOXWARD-SUB-048`)

本目录包含只读产品 `src/` 基线提交 `6a6af8a`（分支 `voxward/s026-fix1`）下核心消息处理闭环的**确定性合成重放场景与故障夹具**，全部输入均为合成构造，不依赖真实 YouTube OAuth 或真实 Kiro CLI。

## 目录结构与 Vitest 映射关系

| 夹具 / 套件 | 对应 Vitest 测试套件（`apps/server/test/integration/core-flow/`） | 覆盖范围与关联 Q 项 |
| --- | --- | --- |
| `fixtures/routing-scoring.json` | `routing-scoring.test.ts` | 多语种/谐音/规范化规则、匿名/噪声/白名单/中分抽查/高分快通/例外 `REALTIME_REVIEW(reason="EXCEPTION")`、上下限钳制与身份基准分离重算（`Q20`、`Q43`） |
| `fixtures/dedupe-replay-sc.json` | `dedupe-replay-sc.test.ts` | `MessageIdStore` + `channel_events_dedupe_uq` 组件去重与 `Q39` 入站事务边界、`classifyReplay` 时间戳边界与 `Q41` 稳态时钟偏移误丢复现、SC 文本与 `Q46` 里程碑评论丢弃/缺付费标记复现、`PAID` 车道（`Q52`）、平台删除重试与失败降级/审计 |
| `fixtures/manual-coordinator-wiring.json` | `manual-coordinator-wiring.test.ts` | 人工裁决并发冲突与 `operationId` 幂等（`Q49`）、`Q55` `C6` 上限改判偏差最小复现、评分例外零分窗口（`score_exceptions`）、`TaskCoordinator` 优先级/微批/未知任务收敛与 `Q57` `R7` 跨实例跳过最小复现、以及组合根现状对照（`N7`/`N12b`、`N13`） |
| （纯程序化 SQLite + 真实模块构造） | `failure-no-penalty.test.ts` | **异常不扣分（`VW-R-004` / `B14b`）**：实时 `TaskCoordinator.reportFailure` 耗尽重试转 `pending_review` 与后台 `ReviewRunner` AI 超时（`MODEL_CALL_FAILED`）/ 非法 JSON（`AI_OUTPUT_INVALID`）下观众 `0` 扣分与 `0` 账本行 |

## 约束说明

- 本目录与对应测试严格遵守 `VOXWARD-SUB-048` 只读边界：**不修改** `apps/*/src/**`、`packages/*/src/**`、`scripts/**`、`deploy/**` 或 `vitest.workspace.ts`。
- 实测中发现的既有边界缺陷或未装配缺口均以最小可复现断言固定，并如实记录于 [core-flow-matrix.md](../../docs/acceptance/core-flow-matrix.md)。
