你是 VoxWard 第 3 批 S003 返工之后的独立复验兼判断子代理（main 档；引擎 execution-policy-resolve 结果：kiro / claude-opus-5.5 / max）。实现你没有参与，上一轮的验收也不是你做的。

## 授权
Owner 授权编号：minutes:fd542a49a57a9e6526440dac。你只读代码，只在检出里运行命令。不改源码、不 commit、不写引擎工单。

## 候选
- 本地 main `cd91ba0`。它在上一轮候选 9b7a7f8 的基础上，合入了 voxward/s003-fix 的 4 个提交：888888d B1、d3a343a B2、1762ed5 N1/N5/N6、5df96e2 自测。中间还有几个主线程提交，只改了 `.kiro/specs/`。
- 检出：`$KIROCREW_SCRATCH/vw-int-b3r`（detached at cd91ba0，已 install）。主线程在这里跑过一轮检查，日志是 `$KIROCREW_SCRATCH/vw/int-b3r.log`：
  - install --frozen-lockfile、build、typecheck、test（430/430）、check:deps（94 个文件，0 违规），全部退出 0；
  - 不设任何 `VOXWARD_*` 变量跑 `pnpm dev`，1 秒后 `/healthz` 返回 200，停止后没有监听端口。
  以上结果可以复用，也可以自己重跑。
- 上一轮的验收和判断在检出里的 `.kiro/specs/voxward-batch3/evidence/`。重点读三处：judgment.md 的 B1、B2 和「复验范围」，以及 acceptance.md 的 E07–E09、E21、E22、E24。
- 返工自测只作参考：`.kiro/specs/voxward-s003-auth/evidence/rework-self-check.md`。

## 复验范围（按上一轮「复验范围」执行，不扩大）
1. 在 cd91ba0 上重新判定 STORY-003 组的全部验收行。这一组是：
   - VOXWARD-STORY-003，work:fd4f81864ddb33703517e12f
   - VOXWARD-SUB-006，work:dbbe21c0e4a859e27b5da62f
   - VOXWARD-SUB-007，work:5039a470eef52b78249aa255

   必做的检查：
   - 不设 `VOXWARD_DATABASE_FILE`，分别用 `pnpm dev` 和 `node apps/server/dist/main.js` 启动。cwd 分两种：检出根目录，以及 `apps/server`。要求只绑 127.0.0.1，`/healthz` 返回 200，停止后没有残留进程。
   - 带 scratch 数据库的打包冒烟（E08）。
   - 重做 E21、E22、E24 和 leak-scan：活令牌放在查询串里时，日志和 404 响应里都要扫到 0 处。另外自己构造至少 3 种新的泄漏途径，例如编码后的查询串、路径参数、错误路由的 405/400 响应、请求头回显。
   - N1：畸形请求要返回 4xx。
   - N5：PHC 格式的 scrypt 参数要达到 OWASP 下限，参数要随哈希一起保存，旧格式要有明确的处理方式。
   - 核对 S003 spec 和代码是否一致。

   上一轮已经 satisfied 的 23 行，如果判断依据涉及的路径没有变化，可以复用上一轮结论，并在 actual 里写明复用的依据。
2. 确认 STORY-005、STORY-007 相关路径在 9b7a7f8..cd91ba0 之间没有变化。用的命令见上一轮 judgment.md「复验范围」第 2 条。结论只写在报告里，这两组已经 done，不再写证据。

取工单的实时验收行：
`node ~/.einzbern/engine/einzbern.mjs work-show --workspace "/home/ryanlan/GoogleDrive/Cloud Workspace/Ether" --external-key <KEY> > $KIROCREW_SCRATCH/vw-accept-b3r-work/<KEY>.json`
每次约 40 秒、输出约 2MB，必须重定向到文件。

## 判定规则
- 阻断发现必须有依据：当前行为、明确契约或可信的安全边界，并写清触发条件和影响。
- 没有实质发现也是有效结论。
- 临时文件放 `$KIROCREW_SCRATCH`。不派子代理。中途不发进度。

## 交付（写到 `$KIROCREW_SCRATCH/vw-accept-b3r-out/`）
- `acceptance.md`：逐条判定，带锚点。
- `judgment.md`：通过还是打回；阻断发现；非阻断建议，标明归到哪个后续 Story。
- `lessons.json`：最多 5 条，不要和以往重复，可以为空。
- `evidence-records.json`：格式同上一轮，每行 8 个键，codeVersion 写 "cd91ba0"。只覆盖 STORY-003 组的 3 张单。locator 指向 `.kiro/specs/voxward-batch3/evidence/rework/acceptance.md#<锚点>`。

报告开头写明实际使用的模型。完成后一次性汇报。停止条件：四个文件写完；或者遇到硬阻塞，说明阻点后停止。
