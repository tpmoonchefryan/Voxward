# 日志权限隔离与保留期 Sweep（运维指引）

状态：已实现（基于数据库审计存储、查看器缓存失效总线与定时 retention sweep）。

## 1. 两类日志的访问边界

- **Change Log（变更日志）**：记录裁决变更、人工改判、删除与恢复认证摘要；不含未脱敏的敏感凭据。
- **Technical Log（技术日志）**：记录 `logId`、`correlationId`、校验后 JSON、重试与任务上下文。
- **访问控制**：
  - 仅持有有效账号会话且在目标频道拥有 `logs.view` 权限（`CHANNEL_OWNER` 或显式授予 `logAccess: true` 的成员）方可查询日志查看器接口。
  - 下游输出令牌（`Bearer vwo_...`）仅限 `ROOM_READ_ONLY` 输出流，调用日志接口一律返回 `403 FORBIDDEN`。
  - 未授权或跨频道请求返回 `403 FORBIDDEN`，且错误响应与服务日志均不回显查询参数中的凭据或原文。

## 2. 日志与文件权限要求

- 运行期 SQLite 数据库及其 `-wal`、`-shm`、墓碑目录（`tombstones/`）所在目录权限应为 `0700`，仅服务账号 `voxward` 可读写。
- 反向代理访问日志禁止记录 Cookie、`Authorization` 头或查询串中的敏感令牌。
- Fastify 服务端日志通过 `redactUrlText` 脱敏 URL，客户端错误仅记录错误码。

## 3. 保留期配置与 Sweep 机制

- **默认保留期**：
  - 内容类保留期与元数据保留期由 `modules/audit-store/content-policy.ts` 定义（默认建议 7 天内容 / 30 天元数据，真实评分保留期限仍需结合平台合规要求确认）。
- **自动 Sweep**：
  - `apps/server/src/main.ts` 在使用持久卷数据库时，默认以 `retentionSweepIntervalMs = 60_000`（每 60 秒）调度一次过期清理（`RetentionStore.sweepExpired`）。
  - 过期条目清理后通过进程内 `InvalidationBus` 广播 `EXPIRED` 事件，自动使日志查看器缓存失效，确保已过期内容不再通过缓存返回。
- **删除与恢复联动**：
  - 执行 `restoreBackup` 恢复快照时，系统会在临时 `.restoring` 库上循环执行 `sweepExpired` 直至无过期记录，再执行 `compact()` 与 `integrity_check`，确保过期数据不会因旧备份恢复而重新暴露。
