# 第 m10 批独立验收判断（Wave 4b：VOXWARD-STORY-029 / SUB-052 / SUB-053，候选 `911fe22`）

## 1. 总体裁定

- **候选版本**：分离只读工作树上的 `911fe22`（完整 SHA `911fe2247439c3e7a4f43c79c36498552b745782`，合入 `voxward/s029-deploy` 分支：Commit 1 `794083c` Spec-First -> Commit 2 `1990296` 部署模板、加固件、运维手册与非真实演练）。
- **实时工单快照**：`headEventHash = e94b36291c96ffef0bd524e452a481553fcd4e070b61651d49976fb4f9f3ce36`，共 **3** 张活跃工单、**69** 行验收。
- **逐单结论**：
  1. **`VOXWARD-SUB-052`**（`work:74a3b6ccfd25e2755f59f332`，`rev=3`，23 行）：**通过（PASS，23/23 `satisfied`）** —— 可立即关单（`done`）。
  2. **`VOXWARD-SUB-053`**（`work:a5b02733499302525031f3e3`，`rev=3`，23 行）：**通过（PASS，23/23 `satisfied`）** —— 可立即关单（`done`）。
  3. **`VOXWARD-STORY-029`**（`work:40b84e7e9a57ceaa64f3a742`，`rev=5`，23 行）：**非真实交付全部通过、按 D2 保留 Owner 实测门（22/23 `satisfied`、0 `failed`、1 `unverified`［`VW-S029-KIRO-REAL`］）** —— 本批通过 `work-annotate` 落链全部 23 行证据，工单状态保持 `active`，待 Owner 提供独立运行时账号与 `KIRO_API_KEY` 完成真实 `kiro-cli` 演练后再转换 `done`。
- **汇总统计**：**69 行（`satisfied` 68 行、`failed` 0 行、`unverified` 1 行）**；`DONE_KEYS=VOXWARD-SUB-052,VOXWARD-SUB-053 close-batch.cjs` 干跑输出 `{"annotate":3,"done":2}`。

---

## 2. 独立门禁与探针核验摘要

| 编号 | 检查项 | 结果 | 关键实测依据 |
| --- | --- | --- | --- |
| `E01` | 实时工单快照核对 | `PASS` | 3 张工单均为 `active`（`STORY-029` `rev=5`、`SUB-052` `rev=3`、`SUB-053` `rev=3`），行数 `23+23+23=69` |
| `D2` | Spec-First 提交链与受保护文件边界 | `PASS` | `794083c`（仅 `.kiro/specs/voxward-s029-deploy/**` 4 文件）先于 `1990296`（24 文件）；`apps/server/src/app.ts`（`NO_SUBJECT_CACHES`）、`apps/server/src/db/output-store.ts`、`apps/server/src/modules/platform-source/youtube/stream-list.ts`、`apps/web/src/routes.tsx` 均为 **0 行修改** |
| `E03` | 全仓可复现构建 | `0` | `pnpm build` 生成 `apps/server/dist/{main.js,sandbox-main.js,bootstrap-owner.js,migrations}` 与 `apps/web/dist/index.html` |
| `E04` | 全仓与基准类型检查 | `0` | `pnpm typecheck && pnpm run bench:typecheck` 零错误 |
| `E05` | Q58 守卫下 S029 关联测试套件 | `0` | `test/auth/{bootstrap-and-q26,auth}.test.ts`、`test/deployment/deployment-drill.test.ts`、`test/adapters/kiro-cli`、`test/modules/platform-source/youtube` **9 文件 / 73 用例全绿** |
| `E06` | 架构依赖门禁 | `0` | `node scripts/check-deps.mjs`：`check-deps: ok, 267 files checked, 0 violations` |
| `E07` | 离线部署自检脚本 | `0` | `node scripts/deploy-check.mjs --env-file deploy/server/server.env.example --json`：`19/19` 项检查全部 `ok: true` |
| `E10` | Kiro Spec 对齐校验 | `0` | `kiro-specs.mjs check --work-id work:40b84e7e9a57ceaa64f3a742 --spec-dir .kiro/specs/voxward-s029-deploy` 返回 `SPEC_CURRENT`（`workRevision: 5`） |
| `E80` | Q58 守卫下独立探针 `probe-m10.mts` | `0` | `P1`（`deploy-check.mjs` 正向 19/19 与 3 组负向拦截、真实 `dist/main.js` 对 `VOXWARD_SANDBOX_ENABLED=1` 及超限 `VOXWARD_KIRO_TIMEOUT_MS` 不回显数值 fail-closed、独立持久卷随机端口 `/healthz` `200` 且 `/sandbox-api/state` `404`、`SIGTERM` 退出码 `0`）、`P2`（`scripts/bootstrap-owner.mjs` 缺环境变量/弱口令/首次引导/二次重复引导 `OWNER_ALREADY_BOOTSTRAPPED`、`Q26` `MAX_SCRYPT_CONCURRENCY=4` + 4 类弱/超限/异构哈希拒绝 + `ln=14` 兼容 + 8 路并发登录、CSRF 403 + WS `Origin===Host` + 多房管 `logAccess` RBAC、备份后执行 `DELETE_AND_EXCEPT` 并经 `.restoring` 隔离恢复重放墓碑保留 `score_exceptions` + 缺失备份 `BACKUP_NOT_FOUND`）、`P3`（`Q28` PKCE 防抢占与旧凭据退役、`Q37` 4 组越界 `RangeError`、`Q47` 能力未报告 fail-closed、23 个受控文件零违禁路径且 5 份核心文档显式标注 `VW-S029-KIRO-REAL` `UNVERIFIED`）全部通过 |
| `Q58` | 离线网络守卫自检审计 | `PASS` | `e05-s029-vitest` 与 `e80-m10-probe` 的 `selfcheck.txt` 均确认 5 个外网目标在 `fetch`/`https`/`net`/`dns` 四层全部 `refused:*`，`net-blocked.jsonl` 外连计数为 `0` |

---

## 3. 阻塞项（Blockers）

**无（0 项）**。

---

## 4. 非阻塞建议（Non-Blocking Suggestions）

- **`N19a`（`apps/server/src/auth/login.ts:60-65`，`withScryptSlot` 唤醒重检）**：当前信号量使用 `if (activeScryptCount >= MAX_SCRYPT_CONCURRENCY)` 排队；在 Node.js 标准 `scryptCallback` 回调逐次排空微任务时并发严格受控，但若极端微任务交错在 `activeScryptCount -= 1` 与已唤醒 waiter 恢复之间同步插入新调用，单轮计数可能短暂多放行 1 个槽位。后续接触 `login.ts` 时可将 `if` 改为 `while` 循环以消除微任务插队窗口。
- **`N19b`（真实运行态接线时的 `Q37` Crew 超时与 `Q28` 异账号远端撤销收口）**：本批已在 `config/{schema,load}.ts`、`adapters/kiro-cli/provider.ts` 与 `scripts/deploy-check.mjs` 完成 `VOXWARD_KIRO_TIMEOUT_MS`（`1000..300000 ms`）上限校验，并在非真实范围内核对了 `Q28` 本地旧 grant 退役与 `Q47` 能力未报告 fail-closed。由于当前 `ADAPTER_SETS = ["synthetic"]` 且真实 `CrewPort`、`KiroCli` 与 `YouTubeAuthRoutes` 尚未挂载进生产组合根（避免未实测能力伪装可用），后续在 `VW-S029-KIRO-REAL` / 真实平台接入阶段绑定 `CrewPort` 与 OAuth HTTP 路由时，应同步在真实 `CrewPort` 绑定层施加 `start`/`cancel` 超时上限，并按同账号/异账号语义完成 Google 侧旧 token 远端撤销核验。

---

## 5. 问题清单（Q 项）处置核对

| 编号 | 事项摘要 | 本批处置与状态 |
| --- | --- | --- |
| `Q17` | 首个账号与频道无共享密钥一次性引导入口 | **已闭环**：新增 `apps/server/src/auth/bootstrap.ts`、`bootstrap-cli.ts` 与 `scripts/bootstrap-owner.mjs`；事务内外双重校验零活跃 `CHANNEL_OWNER`，重复执行以 `OWNER_ALREADY_BOOTSTRAPPED` fail-closed 拒绝（`E05` + `E80 P2` 实测通过）。 |
| `Q26` | scrypt 并发内存上限与弱/旧/超限哈希拒绝及文档化 | **已闭环（附 `N19a`）**：`apps/server/src/auth/login.ts` 增加 `MAX_SCRYPT_CONCURRENCY = 4` 信号量，拒绝 `ln < 14`、`r < 8`、`> 256 MiB` 及非 `$scrypt$` 哈希且保持新哈希 OWASP `ln=17,r=8,p=1`，并在 `docs/deployment/moderators-and-access.md` 与 `bootstrap-and-q26.test.ts` 固定（`E05` + `E80 P2`）。 |
| `Q28` | PKCE state 防抢占、重授权退役旧凭据与撤销确认边界 | **非真实范围已核验（远端异账号撤销随真实挂载跟踪，见 `N19b`）**：`E80 P3` 实测他人回调返回 `400 STATE_INVALID` 不消耗主播 state、重授权撤销旧 `credential_refs` 并删除保险箱密文、远端撤销失败返回 `502 REVOKE_NOT_CONFIRMED` 不误标本地已撤销；`docs/deployment/{youtube-credentials,troubleshooting-and-quotas}.md` 如实披露路由未挂载与重授权语义。 |
| `Q33` | 部署与演练时锁定真实 `kiro-cli` 版本 | **保持待 Owner 实测门**：随 `VW-S029-KIRO-REAL` 在目标运行账号演练时锁定并记录真实 `kiro-cli` 版本。 |
| `Q37` | Kiro 推理与 Crew 绑定超时上限 | **Kiro 配置与适配器层已闭环（真实 `CrewPort` 绑定见 `N19b`）**：`config/{schema,load}.ts`、`adapters/kiro-cli/provider.ts` 与 `scripts/deploy-check.mjs` 均强制校验 `1000..300000 ms` 上限且错误信息不回显原值（`E05` + `E80 P1/P3`）。 |
| `Q41` | `stream-list.ts` 本机时钟偏移边界 | **文档化保护已落实**：`apps/server/src/modules/platform-source/youtube/stream-list.ts` 保持 **0 修改**（不破坏 `S026` 复现测试），`docs/deployment/troubleshooting-and-quotas.md` §2 明确规定远端宿主机必须开启 NTP / `chrony` / `systemd-timesyncd` 持续校时。 |
| `Q47` | `describeKiroCli` 不报告模型时的 fail-closed 契约 | **非真实契约已核验（真实能力待 `VW-S029-KIRO-REAL`）**：`E05` 与 `E80 P3` 使用 fake CLI 确认未报告模型时 `checkSettings` 返回 `CAPABILITY_NOT_REPORTED`、`checkRunnable` 返回 `SELECTION_NOT_CONFIGURED`，绝不静默换模型。 |
| `Q58` / `Q59` | 离线网络守卫先加载后自检；零违禁安装字面量与本机路径 | **已严格遵守**：全部测试与探针经 `guarded.sh` 运行（`q58-audit.json` 5 主机全拒、0 外连）；仓库受控文件与本验收目录全部文件零违禁路径/字面量。 |
| `Q60` / `VW-S029-KIRO-REAL` | 独立 Kiro 运行时账号真实演练与 `VOXWARD-SUB-050` 真实模型基准 | **按 `minutes:8fc0b8640384844e0b2a1787#D2` 忠实保留 `unverified`**：文档、Spec 与 `evidence-records.json` 均明确标注 `unverified`，绝不以 fake CLI 冒充真机已测。 |
