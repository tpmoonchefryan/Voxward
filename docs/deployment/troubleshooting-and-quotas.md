# YouTube / Kiro 配额、NTP 校时与排障手册

状态：排障与准入说明；真实 YouTube API 与真实 Kiro CLI 调用在本批次未执行。

## 1. YouTube 配额与连接排障

- **配额消耗**：直播聊天室轮询、重连、认证探测与平台删消息等操作均计入 Google Cloud 项目的 YouTube Data API 每日配额。
- **常见认证与状态码**：
  - `NOT_CONFIGURED` / `RECORD_UNREADABLE`：检查部署级 OAuth Client Secret 是否已写入保险箱且密钥可读。
  - `CALLBACK_MISCONFIGURED`：核对回调 URL 是否为 `https://<域名>/youtube/oauth/callback`（禁止 `http`、IP、`localhost`、通配符或 fragment），并与 Google Cloud Console 登记值逐字符一致。
  - `INSUFFICIENT_SCOPE` / `REAUTHORIZATION_REQUIRED` / `TESTING_PUBLISHING_STATUS`：OAuth 应用处于 Testing 状态时授权有效期较短，需主播重新授权；若换号或重新授权，系统在写入新 grant 后会撤销旧记录并从保险箱移除旧密文（`Q28`）。
  - `REVOKE_NOT_CONFIRMED`：远端 Google 撤销接口失败时，本地记录保持不变，需确认网络与凭据状态后重试撤销。

## 2. NTP 时钟偏移要求（`Q41`）

- **已知边界**：`apps/server/src/modules/platform-source/youtube/stream-list.ts` 中的补发年龄判断依赖服务器本机时钟。若服务器时钟比平台时间快超过 6 分钟，历史补发消息可能被判定为过期而丢弃。
- **运维要求**：远端宿主机**必须**启用 NTP / `systemd-timesyncd` / `chrony` 持续校时，保持本机系统时钟与 UTC 标准时间偏移在数秒以内。

## 3. Kiro CLI 配额、超时与孤儿清理排障

- **推理超时上限（`Q37`）**：`VOXWARD_KIRO_TIMEOUT_MS` 允许范围为 `1000..300000` 毫秒（默认 `120000`）。超限配置会被配置加载器与 `createKiroCliInferenceProvider` fail-closed 拒绝，防止挂起批次永久占用槽位。
- **能力未报告与模型未配置（`Q47`）**：当前 `describeKiroCli()` 仅声明 `providerName: "kiro-cli"` 与 `supportsCancel: true`，不报告模型列表。未报告可用模型时，`checkSettings` / `checkRunnable` 返回 `CAPABILITY_NOT_REPORTED` 或 `SELECTION_NOT_CONFIGURED` 并拒绝运行，绝不静默回退到其他模型。
- **配额耗尽或进程崩溃残留**：
  - 正常/失败/取消/超时结束时，适配器会尝试删除 CLI 会话并移除 `run-*` 运行目录。
  - 若遇到服务异常退出导致 `run-*` 残留，启动时及周期性的孤儿扫描（`sweepOrphanRunDirectories`）会核对 `/proc/<pid>/cwd` 后清理进程组并重试会话删除。
  - 若因跨账号信号权限受限或无法确认进程身份而无法自动清理，目录会保留并生成 `needs-manual.json`（含原因码）。运维需使用 `voxward-kiro` 运行账号检查并手工清理对应 `run-*` 目录与会话。

## 4. 真实数据准入前提（未验证门）

在接入真实直播与观众数据前，以下两项为硬性准入条件，当前均保持 **`UNVERIFIED`**：
1. **`VW-S029-KIRO-REAL`（`minutes:8fc0b8640384844e0b2a1787#D2`）**：由 Owner 提供独立运行时账号（独立系统用户、`HOME`、`KIRO_API_KEY`、最小权限）对固定版本 `kiro-cli` 执行真实调用演练（正常、失败、取消、崩溃孤儿清理、无人值守未信任工具）。
2. **`VOXWARD-SUB-050`（`Q60`）**：使用 Owner 提供的独立 Kiro 账号与真实演练同步执行真实模型性能、延迟与费用基准测量。
