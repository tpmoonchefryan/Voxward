你是 VoxWard 总表第 7 批（第二部分）的独立验收兼判断子代理（main 档；引擎 execution-policy-resolve 结果：kiro / claude-opus-5.5 / max）。本轮两组，都是首次验收：S021 和 S027 的 SUB-049。按小轮处理：验收、判断和 lessons 一次完成。你没有参与实现。

## 授权
Owner 授权 minutes:fd542a49a57a9e6526440dac。你只能读代码，只能在检出里运行命令。不改源码，不 commit，不写引擎工单。不用真实 Kiro 账号推理，不连本机 Kiro Crew 网关，不启动真实 Crew 队列，不连真实 YouTube 或 Google。
- **网络拦截自检必须在拦截模块加载之后才运行**。上一轮有一次没加载拦截就跑了，发出了真实外连（问题清单 Q58）。每次运行前，先确认拦截已经生效。
- 如果某个命令返回 `User denied tool execution`，可能是批准框超时或宿主规则拦截。不要换写法绕过；能做的先做完，在报告里写明哪一步被拒。命令行里不要出现 SQL 语句文本，也不要出现 pnpm 加作用域开发依赖的写法。

## 候选
- 本地 main `7400f39`：在 8687bb4 之后依次合入两个分支，都没有冲突：
  - voxward/s021-output：92f5959（spec）、6d256a7、240102a、5c140a8（`ws` 依赖，由 Owner 安装）、b345e78（合并 main）、cb4545b..dc1fc32（传输层、端点测试、证据）；
  - voxward/s027-bench：d0ad429（spec）、dde51bc、8a271bf、f4114a1。
- S019 还在另一个工作树里做，不在本轮范围。
- 检出：`$KIROCREW_SCRATCH/vw-int-m7b`，detached at 7400f39，已经 install 过。主线程跑过的检查（结果可复用，也可以重跑）：
  - install --frozen-lockfile、build、typecheck、test（1860/1860）、check:deps（213 个文件 0 违规），都退出 0；
  - `bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <检出> <日志目录>`：dev 和 dist 的 `/healthz` 都是 200，停止后没有监听。
- 起服务只用 smoke.sh，不要手工起 `pnpm dev`。消费者样例和端点测试只连 127.0.0.1。你起的进程用完必须停掉，并确认 3000、5173 以及你用过的端口都已释放。

## 工单
| 组 | 工单 | 范围 |
|---|---|---|
| S021 | VOXWARD-STORY-021 work:26274628cbb8f691b6cf430c；VOXWARD-SUB-039 work:ac327b9a81a9326b33711ffb；VOXWARD-SUB-040 work:a86848777f015b0c0a1d9611 | 三张单全部行 |
| S027（只做 SUB-049） | VOXWARD-SUB-049 work:2aa6c8e36e17dd07df29f664 | 这张单的全部行。STORY-027 和 SUB-050 要等 Owner 的独立账号（问题清单 Q60），本轮不判、不出证据行 |

用这条命令取实时内容：
`bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/show-keys.sh $KIROCREW_SCRATCH/vw-accept-m7b-work <KEY>...`

## 依据
- 实施证据：`.kiro/specs/voxward-s021-output/evidence/`、`.kiro/specs/voxward-s027-bench/evidence/`。实施报告原文在 `/home/ryanlan/.kiro/crew/subagents/{25a9acf1c4dbf1b0,9bde51f2f1ca0262,c763509a37e5c5c5}/result.txt`，只作线索。
- 问题清单（`.kiro/specs/voxward-master/tasks.md` 末尾）：Q16、Q18、Q25、Q56。
- 提案 `/home/ryanlan/Code/Voxward/docs/proposal/y3_project_proposal.md`：S021 看 §13、§6.3、§16；S027 看 §18、§4.3、§5.3。
- 方法规范：`/home/ryanlan/.einzbern/engine/4.5.1/specs/batch-execution-v1.md` 的「Acceptance evidence and recheck scope」一节。
- 格式参考：`.kiro/specs/voxward-batch-m7/evidence/` 下的四个文件。

## 必验项
1. **S021**：
   - 凭据只读、可撤销。撤销后，已建立的连接真的断开。订阅按 `output_grants` 和 `credential_refs` 判定（Q18）。
   - 凭据不走查询串，也不走 Authorization 头（Q16）。URL、日志和错误体里都不出现凭据。
   - 400、414 不回显 URL。日志里百分号编码的令牌和 Host 已脱敏（Q25）。
   - 握手被拒和关闭码：401、4400、4403、4408（心跳）、4413（积压）。
   - 统一 ALLOW/BLOCK。拦截只发 `WARD_BLOCKED`，不带原文和身份。
   - 投递 ID 稳定。只发 PENDING 且未过期的行。发送后在同一短事务里标为 SENT。EXPIRED 行不发。SENT 后补发被拒（Q56）。发送有上限。过期 SC 不自动补播。
   - `docs/protocol/output-native-v1.md` 和 `examples/consumer-dedup/` 在本机能复现。
   - dist 能启动（`ws` 已 external）。
2. **S027 SUB-049**：
   - 样本来源合法：合成样本，或许可明确允许的公开数据。来源和许可写清楚。没有真实观众数据。
   - 覆盖中、日、英、混合、谐音、昵称组合、跨条。
   - 脚本默认只跑合成适配器或假 CLI 替身，能复现。真实模型要显式开启，默认关闭。
   - 本轮没有跑任何真实模型，也没有写 `docs/reports/`。
3. 两份 spec 都跑 `kiro-specs.mjs check`。照实写结果，并核对设计和代码是否一致。
4. 阻断发现必须有依据：当前行为、明确的契约，或可信的安全边界，并写清触发条件和影响。没有实质发现也是有效结论。

临时文件放在 `$KIROCREW_SCRATCH`。不派子代理。中途不发进度。

## 交付
写到 `$KIROCREW_SCRATCH/vw-accept-m7b-out/`：
- acceptance.md
- judgment.md
- lessons.json（最多 5 条，不能和以往的重复）
- evidence-records.json：
  - 每行 8 个键，codeVersion 写 "7400f39"；
  - 覆盖 S021 三张单和 SUB-049 的全部行，不含 STORY-027 和 SUB-050；
  - locator 指向 `.kiro/specs/voxward-batch-m7b/evidence/acceptance.md#<锚点>`。
- 如果写了探针，放进 `probes/`

报告开头写明实际用的是哪个模型。完成后一次性汇报。
