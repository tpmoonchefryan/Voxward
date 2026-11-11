你是 VoxWard 第 6 批的独立验收兼判断子代理（main 档；引擎 execution-policy-resolve 结果：kiro / claude-opus-5.5 / max）。本轮两个包，按小轮处理：验收、判断和 lessons 一次完成。你没有参与实现，也没有做过上一轮验收。

## 授权
Owner 授权 minutes:fd542a49a57a9e6526440dac。你只能读代码，只能在检出里运行命令。不改源码，不 commit，不写引擎工单。不用真实 Kiro 账号推理，不连本机 Kiro Crew 网关，不启动真实 Crew 队列，不连真实 YouTube 或 Google。
如果某个命令返回 `User denied tool execution`，可能是批准框超时自动拒。不要换写法绕过；能做的先做完，在报告里写明哪一步被拒。

## 候选
- 本地 main `0b929d3`：在 6d395c9 之后合入两个分支，都没有冲突。
  - voxward/s009-fix：cbf6a4f（B4）、c40ef04（B5）、73a78e0（N 组和证据）；
  - voxward/s013-livestream：d8b2b9a（spec）、6ac7f80（Q28 PKCE）、aa39f4d（Q20）、70875ce（SUB-024）、cf3e361（SUB-025）、71dce6e（证据）。
- 检出：`$KIROCREW_SCRATCH/vw-int-b6`，detached at 0b929d3，已经 install 过。主线程跑过的检查（结果可复用，也可以重跑）：
  - install --frozen-lockfile、build、typecheck、test（1558/1558）、check:deps（178 个文件 0 违规），都退出 0；
  - `bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <检出> <日志目录>`：dev 和 dist 的 `/healthz` 都是 200，停止后没有监听。
- 起服务只用 smoke.sh。不要手工起 `pnpm dev`。你起的进程用完必须停掉，并确认 3000、5173 已经释放。

## 工单
| 组 | 工单 | 范围 |
|---|---|---|
| S009 复验（第 2 轮） | VOXWARD-STORY-009 work:ac2a8c1b963085361cf086f0；VOXWARD-SUB-017 work:98811c5dc9e7282c8f3ab9b5；VOXWARD-SUB-018 work:69b0cc08690c31022d613fc1 | 三张单的全部行，在 0b929d3 上重新判定 |
| S013 新验 | VOXWARD-STORY-013 work:5fd9e2a6d536e627b7e4bf13；VOXWARD-SUB-024 work:51b064d4e4de6db30a47de8b；VOXWARD-SUB-025 work:238d2a9a1ca4a1486d6f8091 | 三张单的全部行 |

一共 6 张单。用这条命令取实时内容：
`bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/show-keys.sh $KIROCREW_SCRATCH/vw-accept-b6-work <KEY>...`

## 依据
- 上一轮：检出里 `.kiro/specs/voxward-batch5b/evidence/` 的 judgment.md（B4、B5、N1–N8）、acceptance.md 的 E30、E31、E32，以及 `probes/`（可以直接复跑，见 probes/README.md）。
- 第 4 批 OAuth 问题：`.kiro/specs/voxward-batch4/evidence/judgment.md` 的 N5、N6。
- 实施证据：`.kiro/specs/voxward-s009-scheduler/evidence/rework1-self-check.md`、`.kiro/specs/voxward-s013-livestream/evidence/`。
- 提案 `/home/ryanlan/Code/Voxward/docs/proposal/y3_project_proposal.md`：S009 看 §6.2、§6.3、§7、§9.2；S013 看 §3.1–§3.3、§5.2、§6.3、§16。
- 方法规范：`/home/ryanlan/.einzbern/engine/4.5.1/specs/batch-execution-v1.md` 的「Acceptance evidence and recheck scope」一节。
- 格式参考：`.kiro/specs/voxward-batch5b/evidence/` 下的四个文件。

## 必验项
1. **S009 B4**：同频道更早的 BACKGROUND 任务（排队、运行两种）不挡 REALTIME 和 PAID；PAID 不被同频道 REALTIME 挡；同车道内保序和「只等到前序截止时间」仍然成立。把 E30 §5 的 F2 和 PAID 场景改成期望通过后复跑。
2. **S009 B5**：替身的 cancel、start、done 分别永不结束时，pump 和 cancelEvent 按时返回，其它频道照常派工，同时打开的会话数不超过上限。复跑 E30 §7 的 F3 和 E31。
3. **S009 N 组**：N1（过期 RUNNING 结果转 PENDING_REVIEW）、N2（结算后释放正文，调度调用不遍历全部历史）、N3、N6、N7、N8。按实际行为判定，不按报告判定。
4. **S013 Q28（安全）**：
   - 别人的 state 加主播的授权码必须失败；
   - 缺 verifier 或 verifier 不对必须失败；
   - 别人的失败尝试不消耗主播的 state；
   - 重新授权后，旧授权行被撤销，旧 refresh token 从保险箱删除。
   - 实施方说「Google 侧旧 token 没有调用 revoke 接口」，判断它是否属于必须 Owner 决定的事，还是可在现有授权内由 S029 实现。
5. **S013 Q20**：分数在上限时会员升级再到期，行为分不变。实施方提到一个残余：上限处升级后再扣 5 分，当前分 95，而基准加行为是 105，到期后仍是 95。判断这是否违反提案 §5.2，以及是否阻断。
6. **S013 主体**：
   - 按平台消息 ID 去重；
   - 初连时平台补发的近期 Super Chat 不重复计分、不重复投递、不重播过时卡片；
   - 缺失的订阅标记不伪造；未知身份按无身份处理；
   - 直播结束、配额不足、权限失效都有明确状态；
   - 只接官方上游；模块不导入 db 或供应商 SDK。
   - 实施方的残余：sink 抛异常时消息 ID 已经被占用（最多投递一次），去重存储在进程内。判断是否违反验收行。
7. 6 份单涉及的两份 spec 都跑 `kiro-specs.mjs check`。照实写 SPEC_STALE 或 SPEC_CURRENT，并核对设计和代码是否一致。
8. 阻断发现必须有依据：当前行为、明确的契约，或可信的安全边界，并写清触发条件和影响。没有实质发现也是有效结论。

临时文件放在 `$KIROCREW_SCRATCH`。不派子代理。中途不发进度。

## 交付
写到 `$KIROCREW_SCRATCH/vw-accept-b6-out/`：
- acceptance.md
- judgment.md
- lessons.json（最多 5 条，不能和以往的重复）
- evidence-records.json（每行 8 个键，codeVersion 写 "0b929d3"，覆盖 6 张单的全部行，locator 指向 `.kiro/specs/voxward-batch6/evidence/acceptance.md#<锚点>`）
- 如果写了探针，放进 `probes/`

报告开头写明实际用的是哪个模型。完成后一次性汇报。
