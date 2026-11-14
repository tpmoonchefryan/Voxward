# 自测证据：VOXWARD-STORY-029（SUB-052、SUB-053 及 Q17/Q26/Q28/Q37/Q47 加固）

- **基线与分支**：`voxward/s029-deploy`（基线 `5dab62b`，Commit 1 Spec-First `794083c`）
- **核心约束**：本批次仅执行非真实环境构建、离线自检与合成/fake CLI 演练；**严禁**执行真实 `kiro-cli`/`kirocrew`/`kiro` 推理、真实 YouTube/Google OAuth 登录或联网请求、OS 软件安装、系统用户创建或 `git push`。

## 1. 未验证项声明（硬门禁）

- **`VW-S029-KIRO-REAL`**：**`UNVERIFIED`**（依据 `minutes:8fc0b8640384844e0b2a1787#D2`，需 Owner 提供独立运行时账号、独立 `HOME`、`KIRO_API_KEY` 与最小权限，在目标主机上按固定版本 `kiro-cli` 执行真实调用演练后方可通过）。
- **`VOXWARD-SUB-050`（`Q60`）**：**`UNVERIFIED`**（真实模型性能、延迟与费用基准需与 Owner 独立 Kiro 账号真实演练同步完成）。
- **`Q41` 时钟偏移缺陷**：按要求未修改 `apps/server/src/modules/platform-source/youtube/stream-list.ts`（保留供 `S026` 复现测试依赖），已在 `docs/deployment/troubleshooting-and-quotas.md` 明确记录宿主机必须启用 NTP 持续校时。

## 2. 交付清单（均为仓库相对路径）

### VOXWARD-SUB-052（部署模板、引导、加固与离线自检）
- `deploy/server/server.env.example`、`deploy/server/voxward.service`、`deploy/server/Caddyfile.example`、`deploy/server/README.md`
- `deploy/kiro-runtime/README.md`（明确标注「已实现」「部署要求」「待实测」及 `VW-S029-KIRO-REAL` 为 `UNVERIFIED`）
- `apps/server/src/auth/bootstrap.ts`、`apps/server/src/auth/bootstrap-cli.ts`、`scripts/bootstrap-owner.mjs`（`Q17` 零 owner 一次性引导，重复引导 fail-closed 拒绝 `OWNER_ALREADY_BOOTSTRAPPED`）
- `apps/server/src/auth/login.ts`（`Q26` `MAX_SCRYPT_CONCURRENCY = 4` 并发信号量上限 + 弱/旧/超内存 PHC 哈希拒绝）
- `apps/server/src/config/schema.ts`、`apps/server/src/config/load.ts`、`apps/server/src/adapters/kiro-cli/provider.ts`（`Q37` `VOXWARD_KIRO_TIMEOUT_MS` 与 `timeoutMs` 上限 `300000` ms 校验）
- `scripts/deploy-check.mjs`（非联机产物、迁移、模板卫生与生产配置 fail-closed 自检脚本，支持 `--json` 与 `--env-file`）

### VOXWARD-SUB-053（运维手册与非真实自动化演练）
- `docs/deployment/remote-deploy.md`
- `docs/deployment/moderators-and-access.md`
- `docs/deployment/logs-and-retention.md`
- `docs/deployment/backup-and-recovery.md`
- `docs/deployment/upgrade-and-rollback.md`
- `docs/deployment/troubleshooting-and-quotas.md`
- `apps/server/test/auth/bootstrap-and-q26.test.ts`
- `apps/server/test/deployment/deployment-drill.test.ts`

## 3. 门禁实测结果

- `pnpm build`：通过（`packages/contracts`、`apps/server` 含 `dist/main.js`、`dist/sandbox-main.js`、`dist/bootstrap-owner.js` 与 `dist/migrations`、`apps/web` `dist/index.html`）。
- `pnpm typecheck`（含 `pnpm run bench:typecheck`）：通过（0 errors）。
- `node scripts/check-deps.mjs`：通过（`check-deps: ok, 267 files checked, 0 violations`）。
- `node scripts/deploy-check.mjs --env-file deploy/server/server.env.example`：通过（全部 19 项检查 `[PASS]`）。
- `scripts/bootstrap-owner.mjs` CLI 冒烟：首次引导返回 `{"ok":true,...}`，二次引导 fail-closed 退出并返回 `BOOTSTRAP_FAILED: OWNER_ALREADY_BOOTSTRAPPED`。
- guarded 全量测试（`guarded.sh <scratch> pnpm test`）：通过（`Test Files 177 passed (177)`、`Tests 1995 passed (1995)`，含 `core-flow`、`sandbox`、`data-lifecycle`、`deployment` 与 `auth/bootstrap-and-q26.test.ts`）。
