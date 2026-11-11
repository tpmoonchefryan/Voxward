# S008 返工自测（VOXWARD-SUB-015 / VOXWARD-SUB-016，第 4 批）

状态：B2、N4、N3、N9 已提交到分支 `voxward/s008-fix`。自测门禁 `pnpm test` 未通过（见第 4 节），其余门禁与冒烟通过。本文件不宣称全部门禁通过。

## 1. 实际使用的模型

claude-haiku-5.5，由 kiro 运行器执行（经济档，引擎结果 kiro / claude-haiku-5.5 / max，rejections=1，与简报一致）。

## 2. 提交与改动文件

| 提交 | 项 | 改动文件 |
| --- | --- | --- |
| 70ce4e3 | VOXWARD-SUB-016 B2 | `apps/server/src/adapters/kiro-cli/`：`active-runs.ts`（新）、`process-probe.ts`（新）、`cleanup.ts`、`command.ts`、`orphan-sweep.ts`、`process-group.ts`、`provider.ts`、`run-stream.ts`、`session-lifecycle.ts`；`apps/server/test/adapters/kiro-cleanup/`：`crash-drill.test.ts`（新）、`fixtures/crash-child.ts`（新）、`cleanup.test.ts`、`lifecycle.test.ts`、`orphan-sweep.test.ts`；`apps/server/test/adapters/kiro-cli/`：`fixtures/fake-kiro-cli.mjs`、`helpers.ts`、`run-stream.test.ts`；`deploy/kiro-runtime/README.md` |
| a726cd5 | VOXWARD-SUB-015 N4 | `packages/contracts/src/modules/inference-provider.ts`、`packages/contracts/test/modules/inference-provider.test.ts`、`apps/server/src/adapters/kiro-cli/provider.ts`、`apps/server/src/adapters/synthetic/inference-provider.ts`、`apps/server/test/adapters/synthetic.test.ts`、`apps/server/test/adapters/kiro-cli/provider.test.ts`、`.kiro/specs/voxward-s008-kiro-provider/design.md`（§9 说明） |
| 23f2607 | VOXWARD-SUB-016 N3 | `deploy/kiro-runtime/agent.template.json`（新）、`deploy/kiro-runtime/README.md` |
| cdbb18a | VOXWARD-SUB-015 N9 | `.kiro/specs/voxward-s008-kiro-provider/design.md`（§3）、`docs/security/ai-retention-boundary.md` |
| 本提交 | 自测证据 | `.kiro/specs/voxward-s008-kiro-provider/evidence/rework-self-check.md` |

## 3. 每项修法与实测对照

### B2（必须修）：服务进程异常退出后，CLI 已保存的会话无法清理

修法：
- stdout 增量解析（`createSessionIdScanner`，按字节块读取，正确处理被切开的行与多字节字符）。第一次出现合法会话 ID 就写入 `session.json`，不等进程结束。
- 写入改为串行，避免两次写同一个暂存文件。
- 孤儿扫描：记录的进程仍在运行，且 `/proc/<pid>/cwd` 等于运行目录，才终止整个进程组（先 SIGTERM，宽限后 SIGKILL）。工作目录不符的 pid 视为已被复用，不发信号。身份无法确认（非 Linux、权限不足）时保留目录。
- 没有记录会话 ID 的孤儿：在运行目录下执行 `chat --list-sessions -f json` 查找（假 CLI 模拟）。列表为空即无会话；列表不可读则保留目录，不当作空列表。
- 无法定案的目录保留下来，写入 `needs-manual.json`（原因码），每次扫描重新判断并报告。删除请求失败时目录也保留，由扫描重试。
- 周期扫描：`scheduleOrphanSweeps`，一轮未完成时不启动下一轮，计时器 `unref`；本进程仍在运行的批次不被扫描（`active-runs.ts` 登记）。

崩溃演练（`crash-drill.test.ts`）：子进程（扮演服务端）启动一批，假 CLI 先输出含 `sessionId` 的事件再挂起；子进程被 SIGKILL；随后执行孤儿扫描。

| 指标 | 修复前（同一用例，未改动的代码） | 修复后 |
| --- | --- | --- |
| 运行中 `session.json` 的 `kiroSessionId` | `null` | `sess-fake-1` |
| 删除请求次数（`requested`） | 0 | 1 |
| `notObserved` | 0 | 0 |
| 服务被杀后 CLI 进程是否存活 | 存活 | 扫描后已终止 |
| 运行目录 | 保留 | 已删除 |
| 假 CLI 收到的 `--delete-session` 次数与工作目录 | 0 次 | 1 次，工作目录为该运行目录 |
| 用例结果 | 失败 | 通过 |

修复后的孤儿扫描单元测试（`orphan-sweep.test.ts`，12 项）覆盖：死亡与已完成的残留、进程复用时不发信号、身份未知时保留、进程无法停止时保留、列表查找、列表不可读时保留、未配置 CLI 时保留、删除失败后下次重试、本进程活跃批次跳过、周期扫描及其停止。

### N4：结果项返回 itemId、理由码与命中区间

修法：`InferenceResultItem` 增加 `itemId`、`reasonCodes`，有命中时增加 `matchedSpan`。Kiro 适配器把校验结果原样交给调用方（`decodeResult`），合成适配器同步新形状。只改契约与返回值，不做调度接线（S009）。

实测：`provider.test.ts` 的第一个用例断言返回的 `itemId` 等于日志中假 CLI 收到的临时编号；BLOCK 项带 `reasonCodes: ["HARASSMENT"]` 与 `matchedSpan: {start: 0, end: 1}`。契约类型测试与合成适配器测试已同步。

未做：SC 译文字段的出口，以及路由器 APPLIED 状态丢弃的 `ScoreChange.subjectRef`（不在简报范围，属 S009 与 STORY-010/026）。

### N3：agent 配置模板与服务进程的账号分工

修法：`deploy/kiro-runtime/agent.template.json`，`tools` 与 `allowedTools` 为空，`mcpServers` 为空（JSON 已解析校验）。`README.md` 新增 1.1 节，写明服务账号经 root 所有的包装程序以运行账号启动 CLI，以及环境传递与权限的待实测事项。模板字段格式未对 kiro-cli 3.1.0 核实，README 标注待实测。

### N9：规格与代码对齐，留存文档补充崩溃恢复路径

修法：`design.md` §3 中 `command.ts` 的描述改为与代码一致（只做参数形状校验，环境由调用方完整给出，不做白名单）。`ai-retention-boundary.md` 增加运行目录、`needs-manual.json` 与列表命令的说明，以及第 5 节「崩溃恢复路径」（正常路径、孤儿分支、未覆盖项）。

## 4. 自测命令与退出码

| 命令 | 退出码 | 备注 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | 开始与收尾各一次 |
| `pnpm build` | 0 | |
| `pnpm typecheck` | 0 | N4 之后再次通过 |
| `pnpm check:deps` | 0 | 125 个文件，0 违规 |
| `pnpm test`（第一次，B2 状态） | 1 | 788/789 通过；1 项失败：认证用例 `opens a session only for the right password…`，超时 5073 ms |
| `pnpm test`（第二次，B2 状态） | 1 | 788/789 通过；同一用例，超时 5146 ms |
| `pnpm test`（第三次，N9 之后） | 1 | 785/789 通过；4 项失败：认证 2 项（超时 5335 ms、5188 ms）、路由 Cookie 用例的钩子超时 10032 ms、泄漏扫描 1 项（9910 ms） |
| `pnpm test`（第四次，负载回落后） | 1 | 788/789 通过；同第一次的认证用例，超时 |
| 适配器测试 `vitest run test/adapters`（服务端） | 0 | 10 个文件，77 项 |
| 契约测试 `vitest run`（contracts） | 0 | 6 个文件，49 项 |
| 冒烟 `smoke.sh <工作树> $KIROCREW_SCRATCH/s008-fix` | 0 | dev：healthz ok=1（200，3 s）；dist：ok=1（200，2 s）；结束后无监听 |

`pnpm test` 的失败都是在 scrypt 密码哈希的认证用例上超时。这些用例与 kiro 代码无关。证据：

- 主机被其它工作树的并行任务占满（`/proc/loadavg` 在 8 核上为 8–13）。`s006-fix` 工作树的 `tsx` 进程与 einzbern 工作进程正在运行。
- 未改动的用例耗时也成倍增加。`db/migrate.test.ts` 在基线中为 184 ms，本次为 1126 ms。认证的 `resolves a live session…` 从 418 ms 到 3166 ms。认证路由的 `refuses a moderator…` 从 2979 ms 到 5864 ms。
- 同一认证用例在基线中为 2497 ms（全量运行），单独运行时为 3604 ms（负载较高时）。

这些失败没有通过修改无关测试的超时来掩盖。若需要门禁在负载下稳定通过，需要在主机空闲时重跑，或由 Owner 另行批准调整认证测试的超时（超出本包范围）。

## 5. 哪些行为只在假 CLI 中验证过（D1 相关）

以下行为仅由假 CLI（`fake-kiro-cli.mjs`）模拟，全部标为待真实演练（D1）：

- `chat --delete-session <ID>` 的真实删除效果与退出码语义。
- `chat --list-sessions -f json` 的输出格式，以及它是否严格只列出当前目录的会话。假 CLI 输出的是 JSON 数组，格式未核实。
- 会话 ID 在运行流中的真实位置（假 CLI 把它放在 `params.sessionId`）。
- 会话文件的存放位置。
- 未信任工具在无人值守下的处理（D1）。
- 分账号部署：包装程序的环境传递、sudo 对环境变量的重置、服务账号读取运行账号进程的 `/proc/<pid>/cwd` 与发信号的权限（`deploy/kiro-runtime/README.md` §1.1）。
- agent 配置模板的字段格式。

本次未执行任何 kiro-cli 命令（含 `--version` 与 `chat --help`），未运行任何真实推理。

## 6. 其它未验证项与未完成项

- 周期扫描与启动扫描均未接入组合根（D3）。目前只在库级接口与测试中运行。
- 正常路径中，运行流没有给出会话 ID 时，不查询 CLI 会话列表。CLI 是否会保存不输出 ID 的会话，待实测。
- 记录 pid 之前的窗口（进程已创建、`session.json` 尚未写入 pid 时服务崩溃）只能靠「无记录超过 1 小时」判断，CLI 是否仍在运行未验证。
- 同一批产生多个会话时，只删除已记录的首个 ID（待实测）。
- 本设计假定同一运行根只有一个服务进程。
- 非 Linux 平台上的身份确认只走 UNKNOWN 分支（保留并报告），未在该平台上实际运行。

## 7. 残留检查

- 假 CLI 与演练子进程：无残留（`ps` 检查）。
- 运行目录 `run-*`：无残留。
- 监听端口 3000 与 5173：冒烟结束后无监听。
- 宿主 kiro-cli 的目录（`kiro-log`、`kiro-cli-updates-1000`）不属于本次运行，未触碰。
