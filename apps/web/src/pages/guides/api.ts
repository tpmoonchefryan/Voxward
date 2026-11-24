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
    id: "youtube-live",
    target: "YouTube 直播聊天 API v3",
    status: "SUPPORTED",
    statusLabel: "官方协议支持",
    endpointOrDocs: "平台适配适配器 › YouTube Live Data v3",
    summary: "支持直播弹幕与 Super Chat 拉流、成员身份映射及拦截时平台同步删禁。",
  },
  {
    id: "obs-overlay",
    target: "OBS 浏览器投屏源（透明无头）",
    status: "SUPPORTED",
    statusLabel: "官方投屏输出",
    endpointOrDocs: "直播工作台 › OBS 投屏地址（携带只读输出令牌）",
    summary: "通过单向加密通道接收放行消息与 7 级 Super Chat；后置拦截自动无声撤回。",
  },
  {
    id: "blivechat-native",
    target: "blivechat 桌面插件 / 原生回环客户端",
    status: "VERIFIED_LOOPBACK",
    statusLabel: "本机回环已验证",
    endpointOrDocs: "系统集成 › 签发桌面插件一次性凭据",
    summary: "云端 VoxWard 经本机 127.0.0.1 回环隧道将过审弹幕桥接至桌面呈现端。",
  },
  {
    id: "kiro-cli-runtime",
    target: "Kiro CLI 本地推理运行时",
    status: "VERIFIED_LOOPBACK",
    statusLabel: "本机受限运行时已验证",
    endpointOrDocs: "系统集成 › AI 提供商 › Kiro CLI",
    summary: "以一次性受限运行目录执行弹幕合规分类与 SC 精翻，任务结束自动销毁临时现场。",
  },
  {
    id: "third-party-sdk",
    target: "第三方未经签名插件直连",
    status: "UNSUPPORTED",
    statusLabel: "出于安全隔离不支持",
    endpointOrDocs: "请使用「系统集成」签发只读输出凭据接入",
    summary: "下游展示端一律禁止上行写控制指令，仅允许通过只读授权接收放行数据。",
  },
];

export const TROUBLESHOOTING_ITEMS: readonly TroubleshootingItem[] = [
  {
    code: "WS_4403",
    symptom: "OBS 投屏或桌面端提示凭据失效（4403）且停止自动重连",
    resolution:
      "该通道凭据已被管理员撤销。请前往「集成管理 › 下游输出凭据」重新签发新凭据并更新本地配置。",
  },
  {
    code: "WS_4400",
    symptom: "连接建立后立即以只读协议违规断开（4400）",
    resolution:
      "OBS 浏览器或桌面输出端不允许向服务端发送任何控制帧或弹幕写入消息，请检查客户端脚本版本。",
  },
  {
    code: "SC_TR_OFF",
    symptom: "Super Chat 卡片正常显示但未出现中文精翻文本",
    resolution:
      "请确认频道所有者已在「系统设置 › 计分与运行策略」开启 SC 精翻开关，并在该页绑定了有效 AI 翻译模型。",
  },
  {
    code: "LOOPBACK_CONN",
    symptom: "云端部署无法直连主播电脑上的桌面输出端",
    resolution:
      "请主播在播控电脑启动 VoxWard 桌面辅助连接器，使用一次性输出凭据建立出站 WSS 长连接后再将本地回环端指向本机客户端。",
  },
];
