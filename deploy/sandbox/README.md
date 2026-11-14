# VoxWard 隔离合成演示沙盒（Sandbox）

本目录提供独立、确定性、可一键重置的 VoxWard 合成数据演示沙盒配置与启动脚本，仅供功能评审与端到端演示使用。

## 安全与隔离保证
- **合成数据专属**：仅使用 `apps/server/src/demo/synthetic-source.ts` 生成的合成观众事件与模拟翻译文本，不包含任何真实观众档案或平台凭据。
- **Fail-closed 启动守卫**：`sandbox-guard.ts` 在启动时校验环境变量与数据库路径；若检测到 `GOOGLE_CLIENT_SECRET`、`YOUTUBE_CLIENT_SECRET`、`YOUTUBE_REFRESH_TOKEN`、`YOUTUBE_ACCESS_TOKEN` 或非沙盒数据库路径，沙盒将拒绝启动。
- **有限演示角色**：仅支持 `DEMO_STREAMER`、`DEMO_MODERATOR`、`DEMO_PRIVACY_AUDITOR`、`DEMO_STAGE_VIEWER`，严禁一键颁发生产 `CHANNEL_OWNER` 会话；演示令牌在 `/channels/*`、`/auth/*`、`/data/*` 生产路由一律被拒绝。
- **无外部真实调用**：不调用真实 YouTube / Google API 或真实 Kiro CLI。

## 启动与评审步骤
1. 复制环境变量示例并确认无生产密钥：
   ```bash
   cp deploy/sandbox/sandbox.env.example .env.sandbox
   ```
2. 构建服务端与前端：
   ```bash
   pnpm build
   ```
3. 启动隔离沙盒服务（仅在本地演示端口运行）：
   ```bash
   node deploy/sandbox/start-sandbox.mjs
   ```
4. 打开前端 `/sandbox` 页面，确认页面顶部常驻 `SYNTHETIC SANDBOX · 合成演示环境（非真实平台数据）` 标识。
5. 依次触发预设场景按钮：
   - **正常聊天评分**：观察 `demo-viewer-alice` 评分增加与日志记录；
   - **垃圾/毒性拦截**：观察 `demo-viewer-bob` 消息被规则拦截并扣分；
   - **SuperChat 精翻**：观察日文 SC 原文与明文译文分离展示及舞台已批准输出；
   - **人工审核队列**：切换 `DEMO_MODERATOR` 或 `DEMO_STREAMER` 执行审批/拒绝；
   - **隐私删除与记分例外**：切换 `DEMO_PRIVACY_AUDITOR` 触发 `DELETE` / `DELETE_AND_EXCEPT`，观察 `SubjectCacheHub` 与 `CandidateStore` 同步清理，且例外后新消息不再计分；
   - **一键重置**：点击“一键重置沙盒”恢复确定性初始基线。
