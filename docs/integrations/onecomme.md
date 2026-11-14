# OneComme（わんコメ）接入调研与限制说明

结论：**不支持云端直推**（依据 `VW-S024-AC001` 与提案 §13.2）。

## 1. 官方公开能力

- [OneComme HTTP API 文档](https://onecomme.com/docs/developer/http-api/)
- [OneComme 插件文档](https://onecomme.com/docs/developer/plugin/)

OneComme 运行在**主播本机 PC** 上（默认本机监听端口如 `11180`），面向本机工具与浏览器源提供本地 HTTP/插件交互。

## 2. 为何不支持云端直推

1. **云端-本机拓扑隔离**：VoxWard 部署在远端自托管服务器上。远端服务器上的 `localhost:11180` 指向云服务器自身，**不是主播本机 PC**，无法直接向主播桌面运行的 OneComme 推送消息。
2. **禁止新增本机代理**：本项目 MVP 明确不开发专门的本机代理程序来穿透主播内网。
3. **禁止反向上传绕过**：不得通过 OneComme 或插件将弹幕反向上传至平台或替代官方平台 API 接入（提案 §13.2、§13.3）。

## 3. 建议替代方案

- 使用 **VoxWard 原生 OBS Overlay**（`/overlay/:roomId` + `vw-output.v1`），由主播 PC 上的 OBS 浏览器源直接消费远端只读输出流。
