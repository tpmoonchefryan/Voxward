你是 VoxWard 这一轮的独立验收兼判断子代理（main 档；引擎 execution-policy-resolve 结果：kiro / claude-opus-5.5 / max）。本轮只有两个实施包，按小轮处理：验收、判断和 lessons 都由你一次完成。你没有参与实现，也没有做过上一轮验收。

## 授权
Owner 授权 minutes:fd542a49a57a9e6526440dac。你只能读代码，只能在检出里运行命令。不改源码，不 commit，不写引擎工单。不要用真实 Kiro 账号推理。不要连接本机 Kiro Crew 网关，也不要启动真实 Crew 队列。

## 候选
- 本地 main `5ce5bee`：在 4c3b94a 之后合入了两个分支。
  - voxward/s006-fix2：95b7997 是 B3 修复，00d1b61 是 spec 和证据；
  - voxward/s009-scheduler：从 6d12da9 到 9e76d38。
  - 两次合并都没有冲突。
- 检出：`$KIROCREW_SCRATCH/vw-int-b5b`，detached at 5ce5bee，已经 install 过。主线程在这里跑过的检查：
  - install --frozen-lockfile、build、typecheck、test（1458/1458）、check:deps（171 个文件，0 违规），全部退出 0；
  - 冒烟脚本 `/home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh`：dev 和 dist 两种启动，`/healthz` 都返回 200，停止后没有监听。
  - 这些结果可以复用，也可以重跑。
- 注意：S009 的实施子代理结束时留下了一个在跑的 `pnpm dev`（在它自己的工作树里），主线程已经停掉了。请把这件事写进非阻断项。你自己起的进程，用完必须停掉，并确认端口 3000 和 5173 已经释放。

## 工单
| 组 | 工单 | 范围 |
|---|---|---|
| S006 复验（第 3 轮） | VOXWARD-STORY-006 work:685ad243ec946eb7f628c93e；VOXWARD-SUB-012 work:a52cf35dff7b3e04ede8e970 | 两张单的全部行，在 5ce5bee 上重新判定 |
| S009 新验 | VOXWARD-STORY-009 work:ac2a8c1b963085361cf086f0；VOXWARD-SUB-017 work:98811c5dc9e7282c8f3ab9b5；VOXWARD-SUB-018 work:69b0cc08690c31022d613fc1 | 三张单的全部行 |

一共 5 张单。用这条命令取实时内容：
`bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/show-keys.sh $KIROCREW_SCRATCH/vw-accept-b5b-work <KEY>...`

## 依据
- 上一轮的判断和复现在检出里：`.kiro/specs/voxward-batch5a/evidence/` 下的 judgment.md（读 `### B3`）、acceptance.md 的 E20 和 E21，以及 `probes/`（可以直接拿来复跑）。
- 第 4 批 B1：`.kiro/specs/voxward-batch4/evidence/judgment.md`。
- 提案：`/home/ryanlan/Code/Voxward/docs/proposal/y3_project_proposal.md`。S006 看 §4、§4.3；S009 看 §7（用 grep 搜「## 7.」）和 §9.2。
- 方法规范：`/home/ryanlan/.einzbern/engine/4.5.1/specs/batch-execution-v1.md`，读「Acceptance evidence and recheck scope」一节。
- 格式参考：`.kiro/specs/voxward-batch5a/evidence/` 下的四个文件。

## 必验项
1. **S006 B3**：用 E20 和 E21 的全部输入复跑。
   - 半角写法和用格式字符隔开的写法，对 バカ、ブス、デブ、ハゲ、ポンコツ 都应判为 BLOCK；
   - ハカ 不命中 ﾊﾞｶ，カス 不命中 ｶﾞｽ；
   - ｶﾞｶ 读作 gaka；
   - B1 的对照输入照样通过；
   - 每个命中的原文区间都正确。
   - 另外自己构造至少 5 种新组合，例如：全角半角混排、ﾊﾟ、多个格式字符连写、组合标记加变体选择符、拉丁字母重音加零宽字符、韩文、越南语，确认既不漏拦也不误伤，区间也正确。
   - 这已经是第 3 轮。如果还有同一类缺陷，请在 judgment 里写明，是否需要改用别的方案（例如改成整段 NFKC 再映射回原文）。
2. **S009**：
   - 有界队列：队列满了怎么处理；
   - 截止时间：到期就停止等待，并记录未完成的原因；
   - 有限重试；
   - 结果提交按提案 §7 用事务确认，晚到的结果和过期代次的结果要被丢弃，不覆盖人工裁决；
   - 动态并发有上下限，并按资源信号收缩；
   - Crew 适配只用替身，不连接真实 Crew；
   - 模块不直接导入 db，也不导入供应商 SDK。
3. 两份 spec 都要跑 `kiro-specs.mjs check`。S006 因为链写会是 SPEC_STALE，这是预期结果，照实写；S009 应该是 SPEC_CURRENT。核对设计和代码是否一致。
4. 阻断发现必须有依据：当前行为、明确的契约，或可信的安全边界，并写清触发条件和影响。没有实质发现也是有效结论。

临时文件放在 `$KIROCREW_SCRATCH`。不派子代理。中途不发进度。

## 交付
写到 `$KIROCREW_SCRATCH/vw-accept-b5b-out/`：
- acceptance.md
- judgment.md
- lessons.json（最多 5 条，不能和以往的重复）
- evidence-records.json（每行 8 个键，codeVersion 写 "5ce5bee"，覆盖 5 张单的全部行，locator 指向 `.kiro/specs/voxward-batch5b/evidence/acceptance.md#<锚点>`）
- 如果写了探针，放进 `probes/`

报告开头写明实际用的是哪个模型。完成后一次性汇报。
