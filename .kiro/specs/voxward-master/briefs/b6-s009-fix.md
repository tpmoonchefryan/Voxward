你是 VoxWard S009 第一次返工包的实施子代理（economy 档；引擎 execution-policy-resolve 结果：kiro / claude-haiku-5.5 / max，rejections=1）。同时还有 S013 包在 `.worktrees/s013-livestream` 里，不要碰。

## 授权（已有）
Owner 授权编号 minutes:fd542a49a57a9e6526440dac：按批量原则做到底，本地分支提交，不推送。普通实现选择自己决定，写进报告。

## 背景
- VOXWARD-STORY-009（work:ac2a8c1b963085361cf086f0）、VOXWARD-SUB-017（work:98811c5dc9e7282c8f3ab9b5）、VOXWARD-SUB-018（work:69b0cc08690c31022d613fc1）第一次被打回，候选 5ce5bee，阻断编号 B4（SUB-017）、B5（SUB-018）。
- 工作树 `/home/ryanlan/Code/Voxward/.worktrees/s009-fix`，分支 voxward/s009-fix，基于 main f94b425。

## 必读
- 本轮判断：工作树里的 `.kiro/specs/voxward-batch5b/evidence/judgment.md`，`### B4`、`### B5` 和「非阻断建议」表要全读。
- 复现：`.kiro/specs/voxward-batch5b/evidence/acceptance.md` 的 E30（§5、§7）、E31、E32（用 grep 定位）。探针和替身在 `.kiro/specs/voxward-batch5b/evidence/probes/`，可以改写成回归测试。
- 代码：`apps/server/src/modules/task-coordinator/`（`ordering.ts`、`coordinator.ts`、`crew/adapter.ts`、`crew/fake-crew.ts`）和 `apps/server/test/task-coordinator/`。
- spec：`.kiro/specs/voxward-s009-scheduler/`，只看受管段以外的部分。提案 §6.2、§6.3（`docs/proposal/y3_project_proposal.md` 第 208–228 行）、§9.2（第 363–369 行）。
- 编码规范：`/home/ryanlan/.einzbern/engine/4.5.1/specs/coding-style-v1.md`。

## 要修的阻断
1. **B4（SUB-017）**：保序门控只比较**同一车道**的前序（提案「在各自通道内」，通道是处理路径，不是 YouTube 频道）。BACKGROUND 不能挡 REALTIME 和 PAID；PAID 不被同频道 REALTIME 挡住。同车道内保序、「只等到前序截止时间」保持不变。改 S009 设计 §8 的说法。
2. **B5（SUB-018）**：`pump` 和 `cancelEvent` 不在主路径上 await Crew 的 cancel。发起取消，记下待定状态，槽位保留到取消结束（或给取消设上限，写明到期后怎么处理）；主路径照常扫描、重试暂存提交、派工。`cancelEvent` 在协调器这边取消完成后就返回。改设计 §9。

## 一起修的非阻断（都在这些文件里）
- N1：`commitResult` 遇到已过截止时间的 RUNNING 任务，和扫描一样转 PENDING_REVIEW（进人工队列），对调用方仍返回 discarded。改设计 §7 和两处把 DISCARDED 当期望的测试。
- N2：结算后的任务释放记录，至少丢掉正文；按车道和频道维护未结任务索引，调度调用不再遍历全部历史记录。
- N3：门控放过一个因超时结束的前序时，在后一条记录 `PREDECESSOR_UNFINISHED`；或者改设计说明。二选一，写进报告。
- N6：在 CrewPort 契约注释和设计 §9 写明：Crew 的 completed 报告必须先经 S007 整批校验；Crew 端内容残留由绑定在 done 或 cancel 后清理（真实绑定归 S029）。
- N7：`ResourceSignalPort.read()` 抛异常时按 CRITICAL 处理，收缩到下限，加测试。
- N8：设计 §5「最小并发时后台暂停」的措辞与代码对齐（改措辞或改代码，二选一）。

## 测试要求
- 先用修复前的代码跑新测试，确认它们能报出 B4、B5，再修。
- B4：同频道更早的 BACKGROUND 任务（排队、运行两种）不挡 REALTIME 和 PAID；PAID 不被同频道 REALTIME 挡；同车道保序仍然成立。
- B5：替身里 cancel、start、done 分别永不结束时，pump 和 cancelEvent 按时返回，其它频道照常派工，同时打开的会话数不超过上限。
- N1、N2、N7 各至少一个用例。

## 约束
- 只改本工作树。不改主工作区、.kiro/steering 或 skills；不写引擎工单；不推送。
- 不扩大到上面以外的改动。不连真实 Kiro Crew，也不连本机的 Kiro Crew 网关，测试只用替身。
- B4、B5 各自单独 commit（提交信息分别含 `VOXWARD-SUB-017 B4`、`VOXWARD-SUB-018 B5`），非阻断项、spec 和证据可以合成一个 commit。
- pnpm 12.18.0，非交互。临时文件不放 /tmp。不派子代理。中途不发进度。

## 自测（全部要退出 0）
- 在工作树根执行：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps`，以及 `node /home/ryanlan/Code/Voxward/.kiro/skills/mana-orchestrate/scripts/kiro-specs.mjs check --workspace "/home/ryanlan/GoogleDrive/Cloud Workspace/Ether" --work-id work:ac2a8c1b963085361cf086f0 --spec-dir .kiro/specs/voxward-s009-scheduler`（SPEC_STALE 若只因链写导致可以接受，写明）。
- 启动冒烟：`bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <工作树> $KIROCREW_SCRATCH/s009-fix-smoke`。不要手工起 `pnpm dev`。
- 结果写到 `.kiro/specs/voxward-s009-scheduler/evidence/rework1-self-check.md` 并提交。

## 交付报告
写明：实际使用的模型；commit hash 和改动文件；每项（B4、B5、N1–N3、N6–N8）的修法；修复前后的实测对照；自测命令和退出码、测试数；未验证项；可能与 S013 包冲突的文件。

停止条件：修复和证据都已提交；或者同一个失败连续两次分析都没有新证据，说明阻点后停止。
