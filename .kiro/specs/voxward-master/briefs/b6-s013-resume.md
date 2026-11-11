# S013 接手说明（接着 b6-s013.md 做）

先全文读 `b6-s013.md`，所有要求照旧。下面只写和它不同的地方。

## 为什么换人
上一个实施子代理的 shell 调用被拒。原因是批准框 600 秒没人应答，自动拒了，不是 Owner 拒绝。Owner 已经放行 shell 权限。你从断点接着做。

## 当前状态
- 工作树 `/home/ryanlan/Code/Voxward/.worktrees/s013-livestream`，分支 `voxward/s013-livestream`，HEAD `d819cbe`，本包还没有任何 commit。
- `kiro-specs.mjs init` 已经跑过，生成了未提交的 `.kiro/specs/voxward-s013-livestream/`（design.md、tasks.md、requirements.md 约 150 KB、source.json）。不要重跑 init。直接在受管段之外写实施设计和任务，然后跑 `check`，再提交 `VOXWARD-STORY-013: add spec`。
- 工单 JSON 可能已在 `$KIROCREW_SCRATCH/s013-livestream/`；不在就按简报第 1 步重新读。

## 上一个子代理已读完的结论（自己核对后再用）
- Q28：`apps/server/src/modules/platform-source/youtube/routes.ts` 的 `callback()` 在校验账号前就调用 `states.consume()`，所以别人的失败尝试会删掉主播的 state。`storeGrant()` 不撤销旧授权行，保险箱也没有删除接口。计划：state 绑定 S256 的 code_verifier；先查看、校验通过后再消费；重新授权后撤销旧行，并删除旧 refresh token；补负面用例。
- Q20：`decideIdentityTransition()` 把基准分加上钳制后的 `actualDelta`。所以分数在上限时，会员升级加 0，到期却减 5。计划：基准分按 `requested` 全额变动，最终分为 clamp(基准 + 行为)，行为分不变。只改身份路径。
- 模块边界：check-deps 只允许模块代码导入 `@voxward/contracts` 和本模块文件，不允许导入 Node 内置模块。`youtube/` 下的代码要通过注入的端口拿依赖。
- 配置：不改 `ServerConfig`。配额阈值和补发年龄阈值放在 `youtube/config.ts`，沿用 `scoring-engine/config.ts` 的写法，默认值都标「自定」。

## 被拒时
如果再遇到 `User denied tool execution`，先看是不是超时导致的。不要换写法绕过，停下来报告。
