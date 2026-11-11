你是 VoxWard 第 4 批 S008 返工包的实施子代理（economy 档；引擎 execution-policy-resolve 结果：kiro / claude-haiku-5.5 / max，rejections=1）。同时还有其它包在别的工作树里运行，不要碰它们的工作树。

## 授权（已有）
Owner 授权编号 minutes:fd542a49a57a9e6526440dac：按批量原则做到底。只在本地分支提交，不推送。

## 背景
- 被打回的工单是 VOXWARD-STORY-008（work:352ba5df1e0b354ede1a9af0）、VOXWARD-SUB-015（work:fdd12cc554b859427cfbddaf）、VOXWARD-SUB-016（work:7dc8701421a1a57ec095fe20），打回发生在候选 c67db24 上。
- 另有一项 D1 还等 Owner 决定：验收行要求「固定版本真实 Kiro 调用」。这件事不在本包里做，也不要尝试。
- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s008-fix`，分支 voxward/s008-fix，基于 main fa5dc19。

## 必读
- 验收判断：工作树内 `.kiro/specs/voxward-batch4/evidence/judgment.md`。读三处：B2（grep「### B2」）、D1（grep「### D1」，只为了解背景），以及非阻断表里的 N3、N4、N9（只看 S008 部分）。
- 验收复现：`.kiro/specs/voxward-batch4/evidence/acceptance.md` 的 E30 §3.1、§6，用 grep 定位，每次读不超过 200 行。
- S008 spec：`.kiro/specs/voxward-s008-kiro-provider/`（只看受管段外）；`docs/security/ai-retention-boundary.md`；`deploy/kiro-runtime/README.md`。
- 编码规范：`/home/ryanlan/.einzbern/engine/4.5.1/specs/coding-style-v1.md`。提案 §8.4（grep「8.4」）。

## 安全与运行约束（和第 4 批相同）
- **不要用真实 Kiro 账号或本机开发会话跑推理。** 只允许执行 `kiro-cli --version` 和 `kiro-cli chat --help`。其它 CLI 行为（例如 `chat --list-sessions -f json`、`--delete-session` 的效果）只在假 kiro-cli 里模拟，并在 spec 里标「待真实演练（D1）」。
- 不安装软件，不创建系统用户，不改本机系统配置。

## 要修的项
1. **B2（必须修）**：服务进程异常退出后，CLI 已经保存的会话没法清理。要做到：
   - 对 stdout 做增量解析，第一次看到合法的会话 ID 就 `recordKiroSession` 落盘，不要等进程结束。
   - 孤儿扫描遇到还活着的孤儿进程时，先确认它的身份（例如 `/proc/<pid>/cwd` 等于运行目录，或 cmdline 能对上），确认后终止整个进程组，再清理目录、发出删除请求。只在启动时扫描不够，要加周期扫描或等价做法。
   - 没有记录到会话 ID 的孤儿，要给出确定的去向：在运行目录下按会话列表查找（假 CLI 模拟，真实行为标待实测），或者明确记录成「需人工处理」。不能静默遗留。
   - 补崩溃演练用例：假 CLI 先输出含 `sessionId` 的事件，然后挂起；扮演服务端的子进程被 SIGKILL。要求删除请求发出 1 次，notObserved 为 0，存活的孤儿有确定去向。
   - 先用修复前的代码跑这个用例，确认它能报出问题，再动手修。
2. **N4（顺带修）**：适配器结果要把 itemId 映射、理由码和命中区间交给调用方，S016 的 `ITEM_ID_MAP`、`VALIDATED_JSON` 才写得进去。只改契约和适配器的返回值，不做调度接线（那是 S009）。
3. **N3（文档）**：`deploy/kiro-runtime/` 补上 agent 配置模板（工具白名单为空），并写明服务进程以独立账号启动 CLI 的方式。只写模板和说明，不在本机执行。
4. **N9（S008 部分）**：把 spec 里 `command.ts` 环境变量白名单的描述和代码对齐。同步更新 `docs/security/ai-retention-boundary.md`，写明崩溃恢复路径。

## 约束
- 只改本工作树。不改主工作区、.kiro/steering 或 skills；不写引擎工单；不推送。
- 每项单独 commit，提交信息里写 VOXWARD-SUB-016 或 SUB-015，以及对应的项编号。
- pnpm 12.18.0，非交互。临时文件不放 /tmp。不派子代理。中途不发进度。不用 send_message 重复发完成通知。

## 自测（全部要退出 0）
- 在工作树根执行：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps`。
- 启动冒烟：`bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <工作树> $KIROCREW_SCRATCH/s008-fix`，dev 和 dist 都要 ok=1。
- 测试结束后，确认没有残留的假 CLI 进程和运行目录。
- 结果写到 `.kiro/specs/voxward-s008-kiro-provider/evidence/rework-self-check.md`，并提交。

## 交付报告
需要写明：实际使用的模型；commit hash 和改动文件；每一项的修法，以及修复前后的实测对照；自测命令和退出码；哪些行为只在假 CLI 里验证过（D1 相关）；其它未验证项。

停止条件：以上修复和证据都已提交；或者同一个失败连续两次分析都没有新证据，说明阻点后停止。
