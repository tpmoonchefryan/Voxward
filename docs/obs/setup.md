# OBS Browser Source 与 Custom Dock 远端接入指南

本文说明如何在 OBS Studio 中接入远端自托管的 Voxward 万圣节舞台 Overlay（`/overlay/:roomId`）与主播副屏 Custom Dock（`/dock/:roomId`）。

## 1. OBS Browser Source（舞台 Overlay）

1. 在管理后台为目标频道签发只读输出凭据（`POST /channels/:channelId/output-grants`，格式为 `vwo_...`，只返回一次）。
2. 在 OBS 中新增 **浏览器（Browser）** 源：
   - **URL**：填入远端服务地址与房间路径，并将凭据放在 **URL Fragment（`#`）** 中：
     - `https://<your-voxward-host>/overlay/<roomId>#vwo_<credential>`
     - 或 `https://<your-voxward-host>/overlay/<roomId>#cred=vwo_<credential>`
   - **宽度 / 高度**：建议 `800 x 600`（按舞台布局需要调整）。
   - **自定义 CSS（透明背景）**：
     ```css
     body { background-color: rgba(0, 0, 0, 0); margin: 0; overflow: hidden; }
     ```
   - 如需在 OBS 中控制结界音效，可勾选 **通过 OBS 控制音频**，或在页面右上角点击静音开关。

### 安全与凭据片段说明（Q16）

- **严禁使用查询参数**：不要把凭据写成 `?cred=vwo_...` 或 `?token=vwo_...`。查询参数会进入 HTTP 请求行、服务端访问日志与浏览器历史；Overlay 页面会明确拒绝此类 URL 并禁止建立 WebSocket 连接。
- **即时抹除 Fragment**：页面加载时从 `location.hash` 读取凭据后，会在打开 WebSocket 之前立即调用 `window.history.replaceState` 清除 URL Fragment，随后通过 WebSocket 子协议 `["vw-output.v1", "vw-cred.<credential>"]` 连接 `/output/v1/room`（断线重连复用内存中的凭据）。
- **OBS 凭据轮换指引**：由于 OBS Browser Source 会长期保存配置面板里的 URL 字符串，客户端无法改写 OBS 本地配置文件。若需轮换或回收旧凭据：1）在 Voxward 管理后台 **集成 -> 输出凭据** 撤销旧 `vwo_...` 凭据（正在运行的连接将立即收到 `4403` 关闭）；2）签发新凭据并更新 OBS Browser Source 属性中的 URL；3）点击 OBS 源属性中的 **刷新当前页面缓存**。
- **撤销与过期**：若后台撤销该凭据，连接会收到关闭码 `4403` 并立即停止重连；断连重连后不会补播已过期的 SC 或历史 `WARD_BLOCKED`。
- **无 TTS / 无二次裁决**：Overlay 仅展示已批准的原文与译文（通过 `<bdi>` 隔离渲染）及安全结界提示（`WARD_BLOCKED` 绝不泄露原文或身份），不执行语音合成或二次裁决。

## 2. OBS Custom Browser Dock（主播副屏 Dock）

1. 在 OBS 菜单栏打开 **停靠窗口（Docks） -> 自定义浏览器停靠窗口（Custom Browser Docks...）**。
2. 填入名称与远端 URL：`https://<your-voxward-host>/dock/<roomId>`。
3. 在停靠窗口中使用主播/房管账号登录（会话 Cookie + CSRF）；只读输出凭据（`vwo_...`）不能用于操作 Dock 审核或管理接口。
