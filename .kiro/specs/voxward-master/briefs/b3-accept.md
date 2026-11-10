你是 VoxWard 第 3 批的独立验收兼判断子代理（main 档，引擎 execution-policy-resolve 的结果是 kiro / claude-opus-5.5 / max）。本批 3 个实施包只分一片验收，按批量原则的小轮合并处理：验收、判断和 lessons 都由你一次完成。你没有参与实现。

## 授权
Owner 授权 minutes:fd542a49a57a9e6526440dac。你只读代码，只在检出里运行命令。不改源码、不 commit、不写引擎工单。

## 候选
- 本地 main `9b7a7f8`。它是在第 2 批完成的 main（9a508e0，外加一个只改 briefs 的提交）之上，依次合入 voxward/s003-auth、voxward/s005-scoring、voxward/s007-ai-contracts 得到的。合并只有一处冲突：`packages/contracts/src/index.ts` 两行 export 并存，主线程已经解开。
- 检出：`$KIROCREW_SCRATCH/vw-int-b3`（detached at 9b7a7f8，已经 install 过）。主线程在这里跑过集成检查，日志在 `$KIROCREW_SCRATCH/vw/int-b3.log`：install --frozen-lockfile、build、typecheck、test（418/418）、check:deps（94 个文件，0 违规）全部退出 0。这份结果你可以复用，也可以重跑。
- 各包的 spec 和自测证据只作参考：`.kiro/specs/voxward-s003-auth/`、`.kiro/specs/voxward-s005-scoring/`、`.kiro/specs/voxward-s007-ai-contracts/`。

## 工单（逐条判定每张单的全部验收行）
| Story | Subtask |
|---|---|
| VOXWARD-STORY-003 work:fd4f81864ddb33703517e12f | VOXWARD-SUB-006 work:dbbe21c0e4a859e27b5da62f；VOXWARD-SUB-007 work:5039a470eef52b78249aa255 |
| VOXWARD-STORY-005 work:c07537a238d62efa3b9779f6 | VOXWARD-SUB-010 work:79904ea195c17f06936ea1d2；VOXWARD-SUB-011 work:13b64d514c91bde7897af361 |
| VOXWARD-STORY-007 work:05e6184a65712b369d65bba7 | VOXWARD-SUB-013 work:fe2c775626ed8abc85bb27e6；VOXWARD-SUB-014 work:db458b164383624b55c9c875 |
共 9 张单。每张用 `node ~/.einzbern/engine/einzbern.mjs work-show --workspace "/home/ryanlan/GoogleDrive/Cloud Workspace/Ether" --external-key <KEY> > $KIROCREW_SCRATCH/vw-accept-b3-work/<KEY>.json` 取实时内容。每次约 40 秒、约 2MB，必须重定向；可以用 xargs -P 4 并行。

## 依据
- 各单的验收行，包括 AC001、STORY、PARENT、INHERIT。INHERIT 行按它的 expected 判定；本单没有触及的内容如实写「本单未触及」，不要虚构通过。
- 提案 `/home/ryanlan/Code/Voxward/docs/proposal/y3_project_proposal.md`，按需读相关章节，每次最多 200 行。
- 方法规范：`/home/ryanlan/.einzbern/engine/4.5.1/specs/batch-execution-v1.md` 里的「Acceptance evidence and recheck scope」；编码规范：`coding-style-v1.md`。
- 格式参考：检出内 `.kiro/specs/voxward-batch2/evidence/` 下的 acceptance.md、judgment.md、lessons.json、evidence-records.json。证据行只有 8 个键：acceptanceId、acceptanceVersion、requirement{workId,requirementId,version}、codeVersion、locator、actual、outcome、kind。codeVersion 统一写字符串 "9b7a7f8"。

## 必验项
1. 启动冒烟要做两种：`pnpm dev`，以及打包产物 `node apps/server/dist/main.js`。打包产物要配一个指向 `$KIROCREW_SCRATCH` 的数据库文件，实测能打开数据库并跑完迁移（这是问题清单 Q9，S003 声称已修好）。两种都只绑 127.0.0.1，确认 /healthz 返回 200，用完即停，确认没有残留进程。
2. 本批三份 spec 跑 `kiro-specs.mjs check`，结果应为 SPEC_CURRENT，并核对 spec 的设计和代码一致。
3. S003：
   - 鉴权在服务端强制执行，客户端不能跳过权限；
   - 凭据不进入日志、错误信息或前端；
   - 不可信文本的渲染边界成立，用合成的恶意输入（脚本、HTML、控制字符、超长输入）实测；
   - 会话安全（固定、过期、注销），用负面用例验证；
   - 运行时 AI 最小权限契约与提案一致。
   这些都是安全边界，按可信安全边界判定。
4. S005：
   - 计分幂等，同一裁决不重复扣分；
   - 冷却与钳制；
   - 记分例外守卫不能被身份奖励、复盘、人工调分绕过（提案 §11.4）；
   - 人工补偿接口；
   - 模块不直接导入 db。
5. S007：
   - 三类 JSON Schema 和提案 §8 一致，包括 enum `ALLOW_MEANINGFUL`/`ALLOW_NOISE`/`BLOCK`；
   - 校验覆盖提案约第 333 行列出的每一项，逐项给出反例测试；
   - Q3 的 itemId 契约成立；
   - 错误信息不回显模型输出的正文。
6. 两个包都改了数据库迁移和 schema（0001_auth_sessions 等）。确认迁移序号、journal 和数据字典与实库一致，没有重复或缺号。
7. 阻断发现必须有当前行为、明确契约或可信安全边界作依据，并写清触发和影响。风格偏好和未来需求不算阻断。没有实质发现也是有效结论。

临时文件放 `$KIROCREW_SCRATCH`。不派子代理。中途不发进度。

## 交付（写到 `$KIROCREW_SCRATCH/vw-accept-b3-out/`）
- `acceptance.md`：逐条验收行写 satisfied / failed / unverified，写明实际命令、退出码、关键输出、候选版本，并带可引用的锚点。
- `judgment.md`：每个 Story 分别写通过或打回；阻断发现逐条写触发、影响、文件、归属的 SUB；非阻断建议另列，并标明归到哪个后续 Story；最后写复验范围。
- `lessons.json`：最多 5 条本轮新确立、能跨工单复用、和以往 lessons 不重复的事实；只属于某一张工单的细节不要写（引擎会拒）。格式和第 2 批相同。
- `evidence-records.json`：格式和第 2 批相同，覆盖 9 张单的全部验收行。locator 指向 `.kiro/specs/voxward-batch3/evidence/acceptance.md#<锚点>`。
- 在报告开头写明你实际使用的模型（宿主换了模型就如实写）。

完成后一次性汇报。停止条件：四个文件写完；或者遇到硬阻塞，说明阻点后停止。
