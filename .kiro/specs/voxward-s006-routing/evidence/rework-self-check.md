# S006 返工自测证据（VOXWARD-STORY-006 / VOXWARD-SUB-012）

简报：`/home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/briefs/b4-s006-fix.md`。分支 `voxward/s006-fix`，基于 `fa5dc19`。
实施模型：claude-haiku-5.5（引擎解析结果为 kiro / claude-haiku-5.5 / max，rejections=1）。

## 1. 提交序列

| 项 | 提交 | 改动 |
| --- | --- | --- |
| B1 | 58e2ced | 归一化、转写表、正则副本、检查器工厂与对应测试；`design.md` 4.8 |
| N1 | e8df444 | 真值表顺序与真值表测试；`design.md` 4.3 |
| N9 | 5441ffa | `design.md` §1、§3、§4.9、§5；`tasks.md` 1.4 |
| N10 | f919d25 | `design.md` §3 |
| 证据 | 本文件所在提交 | `evidence/rework-self-check.md` |

B1 的空行修正已本地并入 58e2ced（未推送）。

## 2. 自测命令与退出码（工作树根，`CI=1`，pnpm 12.18.0）

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | 依赖与锁文件一致（f919d25） |
| `pnpm build` | 0 | 服务端与 web 构建完成（f919d25） |
| `pnpm typecheck` | 0 | 服务端与 web 通过（f919d25） |
| `pnpm test` | 1（f919d25 上 5 次）；0（830c4b2 上 1 次） | 见第 5 节 |
| `pnpm check:deps` | 0 | 123 个文件，0 违规（f919d25） |
| `smoke.sh <工作树> $KIROCREW_SCRATCH/s006-fix` | 0 | dev：`ok=1 code=200 after 3s`；dist：`ok=1 code=200 after 2s`；结束后无监听（f919d25） |

## 3. B1 修复前后对照（E20 §3 同一组输入）

修复前为 `fa5dc19` 的源码，即候选 c67db24 的规则代码。修复后为 f919d25。每行为一次检查的路由结果。

| 规则 / 正文 | 修复前 | 修复后 | E20 §3 期望 |
| --- | --- | --- | --- |
| 精确 `ばか` / `ばか` | BLOCK | BLOCK | BLOCK |
| 归一化 `badword` / `ba\u0301dword` | BLOCK | BLOCK | 拉丁绕过仍拦截 |
| 归一化 `badword` / `bádword` | BLOCK | BLOCK | 拉丁绕过仍拦截 |
| 归一化 `ばか` / `ばか` | BLOCK | BLOCK | BLOCK |
| 归一化 `ばか` / `はかまいりにいく` | BLOCK（误判） | PASS | PASS |
| 归一化 `バカ` / `ハカセ` | BLOCK（误判） | PASS | PASS |
| 正则 `ばか` / `ばか` | PASS | BLOCK | BLOCK |
| 正则 `バカ` / `バカ` | PASS | BLOCK | BLOCK |
| 正则 `café` / `café` | PASS | BLOCK | BLOCK |
| 正则 `café` / `cafe\u0301` | PASS | BLOCK | 分解形式命中 |
| 正则 `badword` / `ba\u0301dword` | BLOCK | PASS | 残余风险，见第 6 节 |

转写表（`createTableTransliterator`）：

| 表 / 读取 | 修复前 | 修复后 |
| --- | --- | --- |
| `{が: ga, か: ka}` 读 `がか` | 构造时抛 `TypeError` | 读出 `gaka`，complete=true |
| `{か: ka}` 读 `が` | 读出 `ka`，complete=true（误判） | 空，complete=false |

规则成本（`regex-cost` 的最坏情形：选择积达到上限，正文 500，昵称 100；每轮 5 次检查的中位数，单位 ms；修复前后交替运行，宿主负载约 13）：修复前 5.78 / 2.95 / 1.60，修复后 5.73 / 3.43 / 1.94。无可测回归。

## 4. 各项修法

### B1 组合标记（E20 §3）

- 去除步骤只删组合附加符号区块：U+0300–036F、U+1AB0–1AFF、U+1DC0–1DFF、U+20D0–20FF、U+FE20–FE2F。U+3099、U+309A 保留，NFKC 与前字重新组合，`が` 不会变成 `か`。
- 正则规则匹配 NFKC 副本（不去除组合标记），与 S004 第 3 节、第 5 节一致。简报给出两种做法，本包选第二种，写入 `design.md` 4.8。
- 转写表用规则集的归一化选项构建：键校验与读音使用同一选项。`Transliterator` 暴露 `normalization`。检查器工厂发现选项与规则集不一致时抛 `ModerationConfigError`，问题码 `NORMALIZATION_MISMATCH`（新增）。
- 修复前：新增的回归用例 13 项失败（normalize 4、transliterate 4、engine 4、moderation-engine 1）。其中 normalize 的「strips every mark」一项是因为测试列表含未分配码位 U+1AFF，已改为运行时已分配的组合标记。修复后 `test/moderation-engine` 15 个文件 312 项通过（N1 后为 313 项）。

### N1 真值表顺序

- `planRoute` 顺序改为：基础 BLOCK → 例外 → 付费 → 基础 REVIEW → 噪声 → 白名单 → 评分 → 其余，与提案 §4.2 流程图一致。
- 例外∧付费（基础未拒绝）由 `PAID_TEXT_REVIEW` 改为 `REALTIME_REVIEW`，例外标记为是。两者都是 AI 或人工路径，都不是快速放行。
- 修复前：真值表测试 17 项失败（16 个组合的不变式与 1 个新增行测试）。修复后全部通过。

### N9 规格中的迁移编号与提示文案（仅规格）

- `design.md` §1 表与 §3 中的 Q8 迁移编号由 0002 改为 0003。代码中为 `0003_drop_subject_nickname_checks`，`0002` 是 `0002_audit_log_fields`。`tasks.md` 1.4 同步。
- `design.md` §5 的升级说明改为「从 0000–0002 升级」。
- `design.md` §4.9 的提示文案改为 `groups.ts` 中的英文原文。代码未改。

### N10 开发库

- `design.md` §3 增加一条：drizzle 的 SQLite 迁移器只执行 `when` 晚于库中最新 `created_at` 的条目。按旧编号建成的开发库升级时会跳过审计字段迁移，并在 0003 报错回滚，应删除后重建。迁移文件未改。

## 5. 测试结果

- 修复前（`fa5dc19` 源码加新增回归用例）：`test/moderation-engine` 中 13 项失败，见第 4 节。
- 修复后：`test/moderation-engine` 15 个文件，313 项通过（N1 之后）。
- 首次全量运行（830c4b2，与 f919d25 只差 `transliterate.ts` 中一处空行）：67 个文件，788 项通过，退出 0。
- 之后在 f919d25 上全量运行 5 次，均退出 1。失败项都是计时类：
  - `auth/auth.test.ts` 的 scrypt 相关用例：5000 ms 默认超时，五次全量运行中每次都有出现；
  - `auth/routes.test.ts`：setup 钩子 10000 ms 超时，连带 `afterEach` 报错（1 次）；
  - `security/leak-scan.test.ts`：5000 ms 超时（1 次）；
  - `moderation-engine/rules/regex-cost.test.ts`：中位数 21.9 ms，超过 20 ms 预算（1 次）。
- 同一时段隔离重跑：上述 4 个文件共 51 项全部通过，退出 0。
- 失败运行期间 `/proc/loadavg` 的 1 分钟值在 6–17 之间（8 核）。其它工作树的 drizzle-kit 进程与 postgres 容器占用 CPU。
- 没有改动任何测试的超时或预算，也没有删除失败用例。

## 6. 未验证项与残余风险

- 正则规则的组合标记绕过：`badword` 对 `ba\u0301dword`，修复前命中，修复后不命中。这是第二种做法的直接结果，已写入 `design.md` 4.8。若主线程要求正则也封堵，需改为第一种做法（正则源串按同一选项归一化）。本包未做。
- 组合标记去除是按区块全局启用，未按文字或语言启用。带附加符号的非拉丁字母同样被去除，例如 `й` 在副本中变为 `и`，与 Q6 修复前的行为一致。
- `pnpm test` 在当前负载下不稳定（见第 5 节）。首次全量通过，之后 5 次失败，失败项为计时断言，单独运行通过。未能在空闲宿主上取得连续的退出 0。
- 未执行：规格检查 E10、`drizzle-kit check`、迁移链探针（E60/E61）、跨包探针（E70）。简报的自测清单未包含这些项。
- 托管段未修改：`design.md` 第 1–53 行、`tasks.md` 第 1–16 行、`requirements.md` 全文、`source.json`。所有改动的 hunk 都在本地段内。
- 未涉及真实 Kiro CLI、真实平台消息与真实模型输出。

## 7. 偏离与自定

- 正则选第二种做法，匹配 NFKC 副本（4.8）。
- 组合标记按区块启用，不按文字或语言启用（4.8）。
- 新增问题码 `NORMALIZATION_MISMATCH`。
- N1：付费标记不再随例外进入任务类型。`PAID_TEXT_REVIEW` 只用于非例外消息。
