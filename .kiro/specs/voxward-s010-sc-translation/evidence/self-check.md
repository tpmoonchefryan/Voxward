# S010 自测证据

- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s010-sc-translation`，分支 `voxward/s010-sc-translation`
- 记录时间：2026-11-11T13:31Z（UTC）；Node v24.16.0；pnpm 12.18.0
- 实际执行模型：claude-haiku-5.5（brief 中的 economy 档，kiro / max，rejections=0）
- 本包提交：
  - `d0637a5` VOXWARD-STORY-010: add spec
  - `a02a8e1` VOXWARD-STORY-010 Q40
  - `488a9f7` VOXWARD-SUB-019
  - `ed107d2` VOXWARD-STORY-010 Q23
  - 本提交：VOXWARD-SUB-020（含本证据）

## 1. 自测命令

所有命令在工作树根目录运行。证据记录的是本提交内容的最终状态，即 SUB-020 代码已完成之后的结果。

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `pnpm install`（首次，非冻结） | 0 | `Packages: +174`，`Done` |
| `pnpm install --frozen-lockfile` | 0 | `Lockfile is up to date, resolution step is skipped` |
| `pnpm build` | 0 | `apps/server build: Done`；`apps/web` 产物生成 |
| `pnpm typecheck` | 0 | `packages/contracts`、`apps/server`、`apps/web` 均 Done |
| `pnpm test` | 0 | `Test Files 112 passed (112)`，`Tests 1618 passed (1618)` |
| `pnpm check:deps` | 0 | `check-deps: ok, 183 files checked, 0 violations` |
| `kiro-specs.mjs check` | 0 | `SPEC_CURRENT`，workRevision 4，sourceDigest 1693… |
| `bash tools/smoke.sh <worktree> <scratch>` | 0 | `dev healthz ok=1 code=200`；`dist healthz ok=1 code=200`；停止后无监听 |

冒烟：未设置任何 `VOXWARD_*` 变量，因此使用默认配置。服务日志显示监听地址为 `127.0.0.1:3000`（web 为 `127.0.0.1:5173`）。冒烟前后 3000 与 5173 端口都是空闲的。运行后没有生成 `data/` 目录。

## 2. 与本包相关的测试

`npx vitest run` 对以下目录的结果：

| 文件 | 用例数 | 通过 |
| --- | --- | --- |
| `test/inference-provider/model-settings/*.test.ts`（3 个文件） | 31 | 31 |
| `test/inference-provider/sc-translation/*.test.ts`（3 个文件） | 24 | 24 |
| `test/inference-provider/validation/*.test.ts`（2 个文件，含 Q23 用例） | 40 | 40 |
| `test/platform-source/youtube-stream/*.test.ts` 与 `youtube-identity/to-business-event.test.ts`（Q40） | 49 | 49 |

## 3. 负面对照

- Q40：把 `stream-list.ts` 临时换成 Q40 修复之前的版本（基线 `40223e2`，只读 `textMessageDetails`），运行 `intake-pieces.test.ts` 与 `to-business-event.test.ts`。结果是 4 个用例失败：`intake-pieces.test.ts` 中 3 个（字段解析总用例、有留言的 SC 正文、无留言且错位字段的 SC），`to-business-event.test.ts` 中 1 个（SC 正文进入 ChannelEvent）。恢复修复版后文件与 HEAD 一致（`cmp` 通过）。
- Q23：`batch-contract.test.ts` 中原先断言「命中规则会整批失败」的用例已改写为「整批 ok、只标出该条与字段」。
- check-deps：本包没有修改分区规则，因此没有做临时违规文件的对照。模块文件只导入 `@voxward/contracts` 与本模块文件，扫描结果为 0 违规。

## 4. 子单 AC001 的实际结果

- VW-SUB019-AC001（模型与 reasoning 设置）：通过，证据为 `model-settings` 的 31 个用例，输入全部是合成能力报告。不支持的模型与参数明确报错（`MODEL_NOT_SUPPORTED`、`REASONING_NOT_SUPPORTED`、`REASONING_REQUIRED`）；能力变化后不静默替换；写入被拒时不改已保存设置。真实 Kiro CLI 适配器目前不报告模型（G1），所以真实适配器下任何模型选择都得到 `CAPABILITY_NOT_REPORTED`。这是现状，不是通过的真实能力。
- VW-SUB020-AC001（付费精翻小抄）：通过。关闭精翻时，经真实 S008 适配器与假 CLI 完成安全审核，BLOCK 不输出小抄，模型输入只含 `itemId` 与 `text`。开启精翻时，BLOCK 不进精翻，生成文本命中规则只抑制该条，原文与生成文本分别带 `VIEWER_ORIGINAL`、`AI_GENERATED` 标记，安全称呼与读音只由本地端口提供。SC 译文路径使用端口替身（G6），假 CLI 只输出分类，不能覆盖 SC 字段。
- VW-S010-AC001、VW-S010-PARENT、VW-S010-INHERIT-*：只登记本包实际触及的部分。完整判据未由本包证明，继承行不计为已验证。

## 5. 未验证

- 真实 kiro-cli 的模型列表、reasoning 参数与 SC 输出：未运行真实模型。
- 真实 YouTube 数据：未接触。Q40 只用按官方字段形状构造的合成样本，字段名取自 Q40 的登记。
- Q41：未处理（范围外），仍待主线程决定。
- G10：会员消息正文字段未读取，未处理。
