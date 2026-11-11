你是 VoxWard 第 4 批 S006 返工包的实施子代理，属 economy 档；引擎 execution-policy-resolve 的结果是 kiro / claude-haiku-5.5 / max，rejections=1。同时还有其它包在别的工作树里，不要碰。

## 授权（已有）
Owner 授权 minutes:fd542a49a57a9e6526440dac：按批量原则做到底。只在本地分支提交，不推送。普通实现选择由你自己决定，写进报告。

## 背景
- 被打回的工单：VOXWARD-STORY-006（work:685ad243ec946eb7f628c93e）、VOXWARD-SUB-012（work:a52cf35dff7b3e04ede8e970）。在候选 c67db24 上被独立验收打回。
- 工作树：`/home/ryanlan/Code/Voxward/.worktrees/s006-fix`，分支 voxward/s006-fix，基于 main fa5dc19。

## 必读
- 验收判断：工作树内 `.kiro/specs/voxward-batch4/evidence/judgment.md`。先看 B1（用 grep 找「### B1」）；再看非阻断表里的 N1、N9（只修 S006 那部分）、N10。
- 验收复现：`.kiro/specs/voxward-batch4/evidence/acceptance.md` 的 E20 §2.1、§3。用 grep 定位，每次最多读 200 行。
- S006 spec：`.kiro/specs/voxward-s006-routing/`；S004 spec：`.kiro/specs/voxward-s004-rules/`。只读受管段外的部分。
- 编码规范：`/home/ryanlan/.einzbern/engine/4.5.1/specs/coding-style-v1.md`。
- 提案 §4（用 grep 找「## 4.」，第 100–160 行）。

## 要修的项
1. **B1（必须修）**：Q6 的默认归一化把全部组合标记都删了，导致日文浊点和带重音字母的正则、转写失效，还会误伤无辜词。要求：
   - 只删组合附加符号区块里的标记（U+0300–036F、U+1AB0–1AFF、U+1DC0–1DFF、U+20D0–20FF、U+FE20–FE2F），保留 U+3099/U+309A 这类文字本身需要的标记。也可以按文字或语言分别启用。
   - 正则源串和匹配副本走同一套归一化；或者让正则继续对 NFKC 副本匹配，二选一，写进 spec。
   - 转写表的校验和读音使用规则集的同一套选项。
   - 回归测试用 E20 §3 的同一组对照输入：
     - 拉丁字母绕过仍然被拦截；
     - ば/は、バ/ハ 不再互相命中；
     - 正则 `ばか`、`café` 重新命中原文；
     - 含 が 键的转写表能构建，并读出 ga。
   - 先用修复前的代码跑这组测试，确认能报出问题，再动手修。
2. **N1（顺带修）**：真值表在「例外 ∧ 付费 ∧ 基础未拒绝」组合上，与提案 §4 流程图的分支顺序不一致。按流程图改成例外优先，补测试。
3. **N9（S006 部分）**：spec 里写的迁移编号改成 0003，升级说明改成「从 0000–0002 升级」，提示文案与代码统一。
4. **N10**：drizzle 迁移器只执行 `when` 晚于库里最新 `created_at` 的条目，所以按旧编号建的开发库升级会失败。在数据字典或 S006 spec 里写明：开发库遇到这种情况要删掉重建。不需要改迁移。

## 约束
- 只改本工作树。不改主工作区、.kiro/steering 或 skills；不写引擎工单；不推送。不扩大到 N2。
- 每项单独 commit，提交信息里写明 VOXWARD-SUB-012 和对应项编号。
- pnpm 12.18.0，非交互运行。临时文件不放 /tmp。不派子代理。中途不发进度。不用 send_message 重复完成通知。

## 自测（全部要退出 0）
- 工作树根依次跑：`pnpm install --frozen-lockfile`、`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm check:deps`。
- 用 `bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <工作树> $KIROCREW_SCRATCH/s006-fix` 做启动冒烟，要求 dev 和 dist 都输出 ok=1。
- 结果写到 `.kiro/specs/voxward-s006-routing/evidence/rework-self-check.md`，并提交。

## 交付报告
- 实际使用的模型；
- commit hash 与改动文件；
- 每项的修法，以及修复前后的实测对照；
- 自测命令和退出码；
- 未验证项。

停止条件：以上修复和证据都已提交；或者同一个失败分析两次都没有新证据，说明阻点后停止。
