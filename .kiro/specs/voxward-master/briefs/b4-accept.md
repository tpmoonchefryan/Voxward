你是 VoxWard 第 4 批的独立验收兼判断子代理，属于 main 档；引擎 execution-policy-resolve 的结果是 kiro / claude-opus-5.5 / max。本批 4 个实施包合成一片验收：验收、判断和 lessons 由你一次做完。你没有参与实现。

## 授权
Owner 授权 minutes:fd542a49a57a9e6526440dac。你只读代码，只在检出里运行命令。不改源码，不 commit，不写引擎工单。

## 候选
- 本地 main `c67db24`。
  - 第 3 批完成后的 main 先依次合入了 voxward/s012-youtube-auth、voxward/s008-kiro-provider、voxward/s016-audit-log。
  - 之后由集成子代理合入 voxward/s006-routing：S006 的删表迁移改编号为 `0003_drop_subject_nickname_checks`，S016 的 `0002_audit_log_fields` 保持原编号。集成记录见 `.kiro/specs/voxward-master/evidence/b4-integrate.md`。
- 检出：`$KIROCREW_SCRATCH/vw-int-b4`（detached at c67db24，已 install）。主线程在这里跑过的检查：
  - install --frozen-lockfile、build、typecheck、test（770/770）、check:deps（123 个文件，0 违规），全部退出 0；日志在 `$KIROCREW_SCRATCH/vw/int-b4.log`。
  - 默认配置跑 `pnpm dev`，`/healthz` 返回 200。
  - `VOXWARD_ADAPTERS=synthetic node dist/main.js`，`/healthz` 返回 200；停止后没有监听端口。冒烟脚本是 `/home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/smoke.sh`。
  - 这些结果可以复用，也可以重跑。
- 各包的 spec 与自测证据只作参考：`.kiro/specs/voxward-s006-routing/`、`voxward-s008-kiro-provider/`、`voxward-s012-youtube-auth/`、`voxward-s016-audit-log/`。

## 工单（逐条判定每张单的全部验收行）
| Story | Subtask |
|---|---|
| VOXWARD-STORY-006 work:685ad243ec946eb7f628c93e | VOXWARD-SUB-012 work:a52cf35dff7b3e04ede8e970 |
| VOXWARD-STORY-008 work:352ba5df1e0b354ede1a9af0 | VOXWARD-SUB-015 work:fdd12cc554b859427cfbddaf；VOXWARD-SUB-016 work:7dc8701421a1a57ec095fe20 |
| VOXWARD-STORY-012 work:c3303265b2af4669b243c34b | VOXWARD-SUB-023 work:4bdb2022d6883f9f262eb6ed |
| VOXWARD-STORY-016 work:4c1238d3c3d98f2cc2f7d756 | VOXWARD-SUB-029 work:d2a9653d30297ce71924a1a2；VOXWARD-SUB-030 work:627762790cd401f266c46100 |

共 10 张单。实时内容用 `bash /home/ryanlan/Code/Voxward/.kiro/specs/voxward-master/tools/show-keys.sh $KIROCREW_SCRATCH/vw-accept-b4-work <KEY>...` 取，每张约 40 秒，结果写成文件；再用 node 提取验收行。

## 依据
- 各单的验收行，包括 AC001、STORY、PARENT、INHERIT。
  - INHERIT 行按它的 expected 判定。
  - 本单没有触及的内容，写「本单未触及」，不要写成通过。
- 提案 `/home/ryanlan/Code/Voxward/docs/proposal/y3_project_proposal.md`，按需读，每次不超过 200 行。
- 方法规范：`/home/ryanlan/.einzbern/engine/4.5.1/specs/batch-execution-v1.md` 里的「Acceptance evidence and recheck scope」。
- 编码规范：`coding-style-v1.md`。
- 格式参考：检出里 `.kiro/specs/voxward-batch3/evidence/` 下的四个文件。证据行只有 8 个键，codeVersion 写字符串 "c67db24"。

## 必验项
1. 本批四份 spec 跑 `kiro-specs.mjs check`，结果应为 SPEC_CURRENT；再核对设计和代码是否一致。
2. S006：
   - 审核路由真值表与提案 §4 的流程图逐条一致，下游只出现 ALLOW/BLOCK；
   - 快速通道；
   - 记分例外主体不享有快速通道；
   - 问题清单 Q6（组合标记）、Q8（删表）、Q12（准入错误提示）、Q22（命中列表进计分）是否真的完成。
3. S008：
   - 发给模型的输入只有 itemId 和必要正文，不带 correlationId、平台 ID 或昵称历史（Q3），用实际输入截取验证；
   - 输出和错误条数有上限（Q24）；
   - 一次性会话目录确实被清理，孤儿清理也能工作；
   - 测试只用假 kiro-cli。**不要用真实 Kiro 账号跑推理**，只允许 `kiro-cli --version` 和 `kiro-cli chat --help`；
   - CLI 参数与本机 `chat --help` 一致；
   - 文档没有宣称应用清理就等于提供方删除。
4. S012：
   - 不访问真实的 Google 或 YouTube 端点，用断网或拦截的方式验证测试确实没有外连；
   - 凭据经 secretref 保存，不明文入库，不进日志、错误或前端；
   - OAuth 的 state/PKCE、令牌刷新、撤销与失效状态都要有负面用例；
   - 部署文档把需要向平台申请的步骤标为未完成。
   这些属于安全边界，按可信安全边界判定。
5. S016：
   - Change Log 不保存已删除内容的原值或密钥；
   - Technical Log 有 logId、correlationId、频道范围和顺序字段及对应索引；
   - 受控内容字段有权限控制和长度上限；
   - 主体删除索引覆盖昵称变更、itemId 映射和关联条目（提案 §11.3、§12）；
   - 写入经过 redactText。
6. 迁移：
   - 0000 到 0003 的序号、journal 和快照链连续，无重复；
   - 空库能迁到 0003；
   - 停在 0001 或 0002 的旧库能升级；
   - 数据字典和实际库零差异；
   - `drizzle-kit check` 结果为 OK。
7. 跨包：S006 路由调用计分、S016 日志写入、S008 推理，在合并后的接口上能对上，没有类型或行为上的断裂。
8. 阻断发现必须有当前行为、明确契约或可信安全边界作为依据，并写清触发条件和影响。没有实质发现也是有效结论。

临时文件放在 `$KIROCREW_SCRATCH`。不派子代理。中途不发进度。

## 交付（写到 `$KIROCREW_SCRATCH/vw-accept-b4-out/`）
- `acceptance.md`：逐条判定，带锚点。
- `judgment.md`：每个 Story 写通过或打回；列出阻断发现，并写明归属哪个 SUB；非阻断建议写明归到哪个后续 Story；写出复验范围。
- `lessons.json`：最多 5 条，可以跨工单复用，并且不和以往的 lessons 重复。
- `evidence-records.json`：格式同第 3 批，覆盖 10 张单的全部验收行；locator 指向 `.kiro/specs/voxward-batch4/evidence/acceptance.md#<锚点>`。
- 报告开头写明你实际使用的模型。

完成后一次性汇报。停止条件：四个文件都已写完；或者遇到硬阻塞，说明阻点后停止。
