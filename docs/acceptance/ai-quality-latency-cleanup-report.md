# VoxWard AI 质量、延迟与清理实测报告（`VOXWARD-STORY-027` / `VOXWARD-SUB-050`）

状态：已完成真实模型多提供方实测（`bench:real`）与可复现替身基线对照（`bench:quality` / `bench:latency` / `bench:cleanup`）。  
数据来源声明：全部测试使用 81 条人工合成样本（`bench/samples/moderation-samples.json`，`provenance: "synthetic-authored"`，`containsRealViewerData: false`），**不含真实观众消息或平台日志**；任何场景均**不声称**第三方 AI 提供方具备“零留存”保证。

## 1. 测试环境与样本集

- **硬件与运行时**：`linux` (`7.0.0-44-generic`, `x64`), AMD Ryzen 7 5800X (8 cores), `30.3 GiB` RAM, Node `v24.16.0`, `kiro-cli 3.6.0`
- **样本集规模（81 条）**：`zh` (13), `ja` (7), `en` (12), `mixed` (8), `homophone` (6), `nickname-combo` (8), `cross-line` (8), `noise` (6), `evasion` (7), `false-positive` (6)
- **规则引擎前置基线（`moderation-engine` + 昵称组合）**：`81 / 81` 命中预期路由（`falseBlock: 0`, `miss: 0`, `falseReview: 0`, `missedReview: 0`），作为真实 AI 分流前的本地确定性第一道防线。
- **确定性替身基线（`pnpm bench:quality`）**：两次独立运行输出逐字节一致（`cmp` exit `0`），带 `--real-model` 时按设计 `exit 2` 拒绝。

## 2. 实时审核三提供方实测对比（`VOXWARD_BENCH_REAL_MODEL=1 pnpm bench:real --real-model`）

批大小 `MAX_ITEMS = 10`（共 `9` 批 / `81` 条样本），全部响应经真实 `validateModerationBatch` 契约校验（枚举、必需键、`itemId` 一一对应与 Unicode 码点范围校验）并结合 `TaskCoordinator` (`maxBatchItems: 10`, `concurrency: 2`) 记录队列停留最老年龄（`maxQueueAgeMs`）。

| 提供方 | 模型 | 完成批 / 失败批 | `ENUM_INVALID` / 契约拒绝 | P50 延迟 (ms) | P95 延迟 (ms) | 最大队龄 (ms) | 已分类 | 下游一致 (`ALLOW/BLOCK`) | 三分类严格一致 | 误拦 (`falseBlock`) | 漏检 (`miss`) | 输入 / 输出 Tokens | 估算费用（USD / 1K 消息） |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `openai-compat` | `gpt-4.1-mini` | `9 / 0` | `0` | `2446.55` | `4641.57` | `4643.52` | `81 / 81` | `75 / 81` | `70 / 81` | `5` | `1` | `4139 / 1676` | `$0.054`（按 `$0.40/$1.60 per 1M` 公开价估算） |
| `anthropic-compat` | `claude-haiku-4-5-20251001` | `8 / 1`（`ANTHROPIC_HTTP_502` x1） | `0` | `1951.07` | `2105.06` | `2105.26` | `71 / 81` | `59 / 71` | `48 / 71` | `11` | `1` | `null`（上游网关未返回 `usage`） | 未计量（依赖上游计费字段） |
| `kiro-cli` | `default` (`3.6.0`) | `9 / 0` | `0` | `13196.56` | `20123.39` | `20123.63` | `81 / 81` | `70 / 81` | `61 / 81` | `3` | `8` | `null`（CLI 返回 `credit` 用量，不直接报告 Token 单价） | 未计量（按 Kiro 订阅/Credit 计费） |

关键观察：
1. **Fail-closed 与零契约漂移**：三个提供方的全部成功返回均通过 `validateModerationBatch`，`enumOrContractErrors === 0`。`anthropic-compat` 遇到的 `1` 次上游网关 `HTTP 502` 由协调器安全转入 `reportFailure("MODEL_CALL_FAILED")`，未发生零扣分破窗或结构损坏。
2. **跨条 / 反讽 / 语境误差分布**：三家模型均未接入跨消息线程上下文（`benchmark` 按单条判定，与 `quality.ts` 一致），导致 `cl-a1/a2/b1` 与 `fp-01/04` 出现少量误判，验证了规则预过滤 + 人工复核队列的必要性。

## 3. Super Chat 精翻、后台复盘与 Kiro 清理实测

- **SC 精翻实测（`runScBatch` + `validateScBatch`，5 条多语种 SC 样本）**：
  - `openai-compat` (`gpt-4.1-mini`, `4643.20 ms`) 与 `anthropic-compat` (`claude-haiku-4-5-20251001`, `2532.78 ms`) 均返回了结构化 JSON 译文，但因当前 `apps/server/src/adapters/openai-compat/provider.ts` 中的 `buildScTranslationPrompt` 列出 `SC_ITEM_FIELDS`（含可选对象字段 `matchedSpan`）而未限定其为 `{start, end}` 对象或省略，模型将原文字符串填入了 `matchedSpan`，被真实契约校验器 `validateScBatch` 以 `NOT_OBJECT (/items/*/matchedSpan)` **fail-closed 整批拒绝（`BATCH_REJECTED`）**。
  - `kiro-cli` 仅输出审核分类字段，不承担 SC 翻译负载（设计已知边界 `Q47`）。
- **后台复盘契约实测（`validateReviewBatch`，5 条样本）**：
  - `openai-compat` (`gpt-4.1-mini`, `1699.67 ms`) 通过 `validateReviewBatch`（`ok: true`，`contractErrors: []`，`itemsValidated: 5`）。
- **Kiro 运行目录与会话清理实测（`kiro-cli 3.6.0`）**：
  - `bench:real` 全部 9 批执行完成后，`sweepOrphanRunDirectories` 观察到 `removed: 0, skipped: 0, refused: 0, manualAction: 0`（正常收尾已清理全部 9 个临时运行目录）。
  - 在独立的 `S029` 崩溃孤儿演练中，带已观测 `sessionId` 的中断目录由 `sweepOrphanRunDirectories` 自动终止残留进程并调用 `kiro-cli chat --delete-session <id>` 清理完毕（`removed: 1, terminated: 1, kiroSessions.requested: 1`，残留目录 `0`）；当未记录 `sessionId` 且遇到 `kiro-cli 3.6.0` `--list-sessions -f json` 包装格式（`[{"cwd":...,"sessions":[...]}]`）时，清理器安全保守保留目录并生成 `needs-manual.json` 等待人工核查。

## 4. 按车道模型与配置建议

| 任务车道 | 推荐提供方与模型 | Reasoning 配置建议 | 依据与边界 |
| --- | --- | --- | --- |
| 实时弹幕审核（低延迟优先） | `openai-compat`（`gpt-4.1-mini`） | 默认关闭推理思考（`temperature: 0`, `reasoning: null`） | 9/9 批稳定完成，`downstreamCorrect` 最高（`75/81`），P50 `2.45s`，成本约 `$0.054 / 1K` 条；适合配合 `TaskCoordinator` 微批（`8..10` 条/批）使用 |
| 离线独立 CLI 运行（免 HTTP 密钥配置） | `kiro-cli`（`3.6.0` headless `stream-json` v2） | 使用 CLI 默认配置（不传递额外 `--effort`/`reasoning`） | P50 `13.20s`、P95 `20.12s`，延迟显著高于 HTTP 直连，不建议用于高并发实时首屏队列；适合受控低频批量任务 |
| SC 精翻与后台复盘 | `openai-compat` / `anthropic-compat` | `temperature: 0` | SC 通道在开启生产翻译前，须先在 `buildScTranslationPrompt` 中显式约束 `matchedSpan` 为可选 `{start, end}` 对象 |

## 5. 未验证项与非保证声明

1. **第三方留存与训练政策**：应用侧清理会话与本地临时目录**不等于** OpenAI、Anthropic、Kiro 或代理网关侧零留存，部署前须在政策披露页如实告知主播。
2. **人工推翻率与真实直播长尾**：`81` 条合成样本不含真实弹幕高并发爆发，未测真实主播人工推翻率（`human overturn rate`）及 YouTube 配额联动表现。
