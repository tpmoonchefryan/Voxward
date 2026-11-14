export interface SupportMatrixEntry {
  readonly id: string;
  readonly target: string;
  readonly status: "SUPPORTED" | "VERIFIED_LOOPBACK" | "UNSUPPORTED";
  readonly statusLabel: string;
  readonly endpointOrDocs: string;
  readonly summary: string;
}

export interface TroubleshootingItem {
  readonly code: string;
  readonly symptom: string;
  readonly resolution: string;
}

export const INTEGRATION_SUPPORT_MATRIX: readonly SupportMatrixEntry[] = [
  {
    id: "native-obs",
    target: "VoxWard 原生 OBS Overlay",
    status: "SUPPORTED",
    statusLabel: "支持（自托管 WebSocket + # 片段）",
    endpointOrDocs: "/overlay/:roomId · /output/v1/room (vw-output.v1)",
    summary:
      "浏览器/OBS 源通过页面 URL # 片段传入只读凭据并立即清除片段，使用 Sec-WebSocket-Protocol 订阅获准展示事件（DELIVER）与无原文/身份的 WARD_BLOCKED。",
  },
  {
    id: "blivechat",
    target: "blivechat 兼容 WS 协议适配",
    status: "VERIFIED_LOOPBACK",
    statusLabel: "协议适配已验证（限本机 loopback E2E）",
    endpointOrDocs: "/output/blivechat/v1/chat (blivechat-v1.x-json-ws)",
    summary:
      "已通过本机 loopback HTTP+WS 验证握手、JOIN_ROOM、HEARTBEAT->HEARTBEAT_REPLY、ALLOW DELIVER 映射为 ADD_TEXT/ADD_SUPER_CHAT（含 text 与 translation）、WARD_BLOCKED 不泄密及撤销 4403 断开；本环境未启动上游独立 blivechat 桌面/Python 二进制进程联调。",
  },
  {
    id: "onecomme",
    target: "OneComme（わんコメ）",
    status: "UNSUPPORTED",
    statusLabel: "不支持云端直推",
    endpointOrDocs: "https://onecomme.com/docs/developer/http-api/ · /plugin/",
    summary:
      "云服务器上的 localhost:11180 不是主播本机 PC。MVP 不开发新本机代理，且禁止以反向上传弹幕取代官方平台 API 接入。",
  },
  {
    id: "vts",
    target: "VTube Studio (VTS)",
    status: "UNSUPPORTED",
    statusLabel: "不支持无本地插件/代理直连",
    endpointOrDocs: "VTS 本机插件 API（仅主播 PC 本机运行）",
    summary:
      "VTS 本机插件 API 仅在主播 PC 本机运行，超出无本机代理 MVP 范围。替代方案仅可由 OBS/浏览器消费只读事件。",
  },
];

export const TROUBLESHOOTING_ITEMS: readonly TroubleshootingItem[] = [
  {
    code: "401",
    symptom: "WebSocket 升级被拒绝（401 Unauthorized）",
    resolution: "检查 Sec-WebSocket-Protocol 是否包含有效的 vw-cred.<credential>，以及凭据是否已被撤销。",
  },
  {
    code: "404",
    symptom: "WebSocket 升级返回 404 Not Found",
    resolution: "确认连接路径为 /output/v1/room（原生）或 /output/blivechat/v1/chat（blivechat 兼容）。",
  },
  {
    code: "4400",
    symptom: "连接被以 4400 CLIENT_DATA_NOT_ACCEPTED 关闭",
    resolution: "输出端点严格只读。原生协议不接受任何客户端数据帧；blivechat 仅接受 JOIN_ROOM 与 HEARTBEAT。",
  },
  {
    code: "4403",
    symptom: "连接立即以 4403 GRANT_REVOKED 断开",
    resolution: "该输出凭据已在频道面板撤销或失效。请在后台重新签发只读凭据并更新 OBS/客户端配置。",
  },
  {
    code: "4408",
    symptom: "连接因 4408 HEARTBEAT_TIMEOUT 断开",
    resolution: "检查网络连通性与客户端 WebSocket pong/HEARTBEAT 响应是否超时。",
  },
  {
    code: "localhost:11180",
    symptom: "云端配置填写 localhost:11180 无法推送至主播电脑",
    resolution: "云端服务器上的 localhost 指向服务器自身而非主播 PC。请改用 VoxWard 原生 OBS Overlay（/overlay/:roomId）。",
  },
];
