你是 VoxWard 总表第 6 批的独立验收兼判断子代理（main 档；引擎 execution-policy-resolve 结果：kiro / claude-opus-5.5 / max）。本轮三个包，按小轮处理：验收、判断和 lessons 一次完成。你没有参与实现。

## 授权
Owner 授权 minutes:fd542a49a57a9e6526440dac。你只能读代码，只能在检出里运行命令。不改源码，不 commit，不写引擎工单。不用真实 Kiro 账号推理，不连本机 Kiro Crew 网关，不启动真实 Crew 队列，不连真实 YouTube 或 Google。
如果某个命令返回 `User denied tool execution`，可能是批准框超时自动拒。不要换写法绕过；能做的先做完，在报告里写明哪一步被拒。

## 候选
- 本地 main `5482e5d`：在 40223e2 之后依次合入 voxward/s010-sc-translation、voxward/s011-review、voxward/s014-decision，都没有冲突。
- 检出：`$KIROCREW_SCRATCH/vw-int-m6`，detached at 5482e5d，已经 install 过。主线程跑过的检查（结果可复用，也可以重跑）：
  - install --frozen-lockfile、build、typecheck、test（1720/1720）、check:deps（200 个文件 0 违规），都退出 0；
  - `bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh <检出> <日志目录>`：dev 和 dist 的 `/healthz` 都是 200，停止后没有监听。
- 起服务只用 smoke.sh，不要手工起 `pnpm dev`。你起的进程用完必须停掉，并确认 3000、5173 已经释放。

## 工单（9 张，全部首次验收）
| 组 | 工单 |
|---|---|
| S010 | VOXWARD-STORY-010 work:029c382b5915050f0c4de600；VOXWARD-SUB-019 work:8369223695f7ef4f1f9e7d13；VOXWARD-SUB-020 work:9165df7ffbc45df4a73496f9 |
| S011 | VOXWARD-STORY-011 work:8f928245aa79a29f26ad28a6；VOXWARD-SUB-021 work:a42a05e89d8c991f62abd995；VOXWARD-SUB-022 work:49db71dc5c4327f322c4c4af |
| S014 | VOXWARD-STORY-014 work:210958ccce508a7abf314287；VOXWARD-SUB-026 work:e054586882ab35ec0b6a5fca；VOXWARD-SUB-027 work:72af8ac97c70068c90e95e09 |

用这条命令取实时内容：
`bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/show-keys.sh $KIROCREW_SCRATCH/vw-accept-m6-work <KEY>...`

## 依据
- 实施证据：`.kiro/specs/voxward-s010-sc-translation/evidence/`、`voxward-s011-review/evidence/`、`voxward-s014-decision/evidence/`；实施报告原文在 `/home/ryanlan/.kiro/crew/subagents/{dbfc099ba5af7eed,a6a970400e9315f4,d4914a5bcda40be9}/result.txt`（只作线索，按实际行为判定）。
- 问题清单：`.kiro/specs/voxward-master/tasks.md` 末尾的 Q19、Q21、Q23、Q27、Q29、Q38、Q40。
- 提案 `/home/ryanlan/Code/Voxward/docs/proposal/y3_project_proposal.md`：S010 看 §8、§9.1、§13.1；S011 看 §5.3、§5.4、§6.2、§7.2；S014 看 §7、§10、§11.4。
- 方法规范：`/home/ryanlan/.einzbern/engine/4.5.1/specs/batch-execution-v1.md` 的「Acceptance evidence and recheck scope」一节。
- 格式参考：`.kiro/specs/voxward-batch6/evidence/` 下的四个文件。

## 必验项
1. **S010**：
   - Q40：SC 留言从 `superChatDetails.userComment` 读到正文；有留言、无留言两种都对；
   - Q23：BLOCK 条目不进精翻；译文命中规则只扣该条，不让整批失败；
   - 模型和 reasoning 能力设置：不支持的选择被拒，不静默换模型；
   - 精翻只在安全审核通过后进行；推理只用替身。
   - 实施方提出的 G10：会员里程碑等消息的自定义文本没读，会以空正文通过安全审核。判断它是否违反本批验收行，还是归后续 Story。
2. **S011**：
   - 复盘只走 BACKGROUND 车道，不挡实时；
   - 临时作者别名不泄露真实身份；统一结算不重复计分；
   - Q27 前半：复盘判 BLOCK 写复核记录、进人工队列；
   - Q38：task-coordinator 结算记录数有上限；改动不破坏第 6 批已验收的 S009 行为（复跑 `.kiro/specs/voxward-batch6/evidence/probes/` 里的 S009 探针）；
   - 候选词卡片的确认要有频道角色鉴权，不自动写进规则。
3. **S014**：
   - 人工接管后 AI 结果不覆盖；多房管并发只结算一次，冲突有明确状态；
   - 改判按账本实际值纠分，只纠一次；
   - 补发要显式操作，并有有效期；
   - 名单和词条按权限拒绝（DATA_ADMIN 没有权限）；
   - Q19 ①②③、Q21（端口层拒绝例外主体）、Q27 后半、Q29 写入方（摘要不写分数，带主体关联）；
   - 迁移 0005 和数据字典一致。
4. 三份 spec 都跑 `kiro-specs.mjs check`。照实写结果，并核对设计和代码是否一致。
5. 阻断发现必须有依据：当前行为、明确的契约，或可信的安全边界，并写清触发条件和影响。没有实质发现也是有效结论。

临时文件放在 `$KIROCREW_SCRATCH`。不派子代理。中途不发进度。

## 交付
写到 `$KIROCREW_SCRATCH/vw-accept-m6-out/`：
- acceptance.md
- judgment.md
- lessons.json（最多 5 条，不能和以往的重复）
- evidence-records.json（每行 8 个键，codeVersion 写 "5482e5d"，覆盖 9 张单的全部行，locator 指向 `.kiro/specs/voxward-batch-m6/evidence/acceptance.md#<锚点>`）
- 如果写了探针，放进 `probes/`

报告开头写明实际用的是哪个模型。完成后一次性汇报。
