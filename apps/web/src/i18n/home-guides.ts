import type { VoxWardLocale } from "./types";

export interface HomeLauncherSpec {
  readonly key:
    | "moderation"
    | "blocked"
    | "data"
    | "settings"
    | "integrations"
    | "users"
    | "logs"
    | "sandbox"
    | "guides";
  readonly title: string;
  readonly desc: string;
}

export interface HomeCopy {
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly recheckHealthBtn: string;
  readonly backendHealthLabel: string;
  readonly healthStates: {
    readonly normal: string;
    readonly checking: string;
    readonly degraded: string;
    readonly offline: string;
  };
  readonly lastProbedPrefix: string;
  readonly probingNow: string;
  readonly activeChannelLabel: string;
  readonly activeChannelNote: string;
  readonly stageOutputsLabel: string;
  readonly stageOutputsValue: string;
  readonly stageOutputsNote: string;
  readonly quickEntryAria: string;
  readonly quickEntryHeading: string;
  readonly launchers: readonly HomeLauncherSpec[];
  readonly dockWindowAria: string;
  readonly dockWindowHeading: string;
  readonly openDockBtn: string;
  readonly previewObsBtn: string;
}

export const HOME_COPY: Readonly<Record<VoxWardLocale, HomeCopy>> = {
  en: {
    pageTitle: "VoxWard Overview",
    pageDescription: "Low-friction live chat moderation, Super Chat translation, and compliance audit workbench.",
    recheckHealthBtn: "Re-check service health",
    backendHealthLabel: "Backend Core Status",
    healthStates: {
      normal: "Service healthy",
      checking: "Checking health",
      degraded: "Dependencies degraded",
      offline: "Service unreachable",
    },
    lastProbedPrefix: "Last checked: ",
    probingNow: "Checking...",
    activeChannelLabel: "Default Active Channel",
    activeChannelNote: "Switch channels from the header selector inside workspace modules",
    stageOutputsLabel: "Stream Stage Outputs",
    stageOutputsValue: "Dual outputs ready",
    stageOutputsNote: "Transparent OBS overlay + single-column Pure Danmaku Dock",
    quickEntryAria: "Quick workspace shortcuts",
    quickEntryHeading: "Workbenches & Tools",
    launchers: [
      { key: "moderation", title: "Live Moderation", desc: "Two-column queue, bypass live stream, and AI candidate confirmation." },
      { key: "blocked", title: "Blocked & Blocklist", desc: "Score-only rejudgement (never re-emitted to stage) and manual blocklist." },
      { key: "data", title: "Data Compliance", desc: "Look up viewer trust records, verify identity, and queue deletion." },
      { key: "settings", title: "Channel Settings", desc: "Wordlist categories, CSV import, SC translation toggle, and scoring." },
      { key: "integrations", title: "Integrations & Outputs", desc: "Live platforms, AI model pools, and OBS / desktop read-only tokens." },
      { key: "users", title: "Members & RBAC", desc: "Assign multi-role permissions with Deny > Grant > Not Set preview." },
      { key: "logs", title: "Logs & Trace Chains", desc: "Technical, change, sanitized HTTP logs, and full pipeline traces." },
      { key: "sandbox", title: "Interactive Sandbox", desc: "Zero-risk synthetic environment with scenarios and role switching." },
      { key: "guides", title: "Guides & Recovery", desc: "Platform support matrix, loopback topology, and error recovery." },
    ],
    dockWindowAria: "Standalone stage output windows",
    dockWindowHeading: "Standalone Stage Outputs (Opens in new window)",
    openDockBtn: "Open Pure Danmaku Dock ↗",
    previewObsBtn: "Preview OBS Transparent Stage ↗",
  },
  "zh-CN": {
    pageTitle: "VoxWard 总览",
    pageDescription: "低打扰直播弹幕过滤、Super Chat 精翻与合规审计工作台。",
    recheckHealthBtn: "重新检测服务健康",
    backendHealthLabel: "后端核心运行态",
    healthStates: {
      normal: "服务健康正常",
      checking: "正在探测服务",
      degraded: "依赖组件降级",
      offline: "服务暂不可达",
    },
    lastProbedPrefix: "最近探测：",
    probingNow: "正在探测",
    activeChannelLabel: "默认活动频道",
    activeChannelNote: "可在具体业务工作台顶部切换频道",
    stageOutputsLabel: "纯享投屏窗口",
    stageOutputsValue: "双输出模式就绪",
    stageOutputsNote: "透明无头 OBS 投屏 + 单栏纯净弹幕姬",
    quickEntryAria: "快捷功能入口",
    quickEntryHeading: "工作台与辅助工具入口",
    launchers: [
      { key: "moderation", title: "实时审核工作台", desc: "双栏处理待裁决队列、旁路实时流与 AI 候选词入库确认。" },
      { key: "blocked", title: "拦截管理与黑名单", desc: "评分重判历史拦截（绝不重发投屏），并管理频道人工黑名单用户。" },
      { key: "data", title: "数据合规与清理", desc: "依据隐私权限检索观众积分档案、登记及核验清理申请。" },
      { key: "settings", title: "系统设置", desc: "词库分类增修、CSV 导入、SC 精翻及计分策略。" },
      { key: "integrations", title: "系统集成与输出", desc: "配置直播平台、AI 模型池并签发 OBS 与桌面插件只读凭据。" },
      { key: "users", title: "成员与三态权限", desc: "配置多角色叠加，实时预览显式拒绝 > 授予 > 未设置的最终权限。" },
      { key: "logs", title: "日志与集成链路", desc: "技术日志、变更日志、HTTP 集成脱敏报文及全链路管线视图。" },
      { key: "sandbox", title: "交互演练沙盒", desc: "零风险合成演示环境，支持一键场景与四角色权限验证。" },
      { key: "guides", title: "接入指南与排障", desc: "平台支持矩阵、桌面回环拓扑以及常见错误恢复指引。" },
    ],
    dockWindowAria: "独立无头播控窗口预览入口",
    dockWindowHeading: "播控独立展示窗口（新窗口打开）",
    openDockBtn: "打开纯净弹幕姬 ↗",
    previewObsBtn: "预览 OBS 透明投屏舞台 ↗",
  },
  ja: {
    pageTitle: "VoxWard 概要",
    pageDescription: "低干渉ライブチャットモデレーション、Super Chat 高精度翻訳、コンプライアンス監査ワークベンチ。",
    recheckHealthBtn: "ヘルスチェックを再実行",
    backendHealthLabel: "バックエンド稼働状況",
    healthStates: {
      normal: "正常稼働",
      checking: "ステータス確認中",
      degraded: "一部依存関係が低下",
      offline: "接続不可",
    },
    lastProbedPrefix: "最終確認：",
    probingNow: "確認中",
    activeChannelLabel: "アクティブチャンネル",
    activeChannelNote: "各ワークベンチ上部のセレクターからチャンネルを切り替えできます",
    stageOutputsLabel: "ステージ出力ウィンドウ",
    stageOutputsValue: "デュアル出力対応",
    stageOutputsNote: "透過 OBS オーバーレイ + 1 列シンプルコメントビュー",
    quickEntryAria: "ワークベンチショートカット",
    quickEntryHeading: "ワークベンチと補助ツール",
    launchers: [
      { key: "moderation", title: "リアルタイム審査", desc: "2 カラム審査キュー、ライブバイパス、AI 候補ワード承認。" },
      { key: "blocked", title: "ブロック・ブラックリスト", desc: "過去ブロックのスコア再判定（再送出なし）と手動ブラックリスト管理。" },
      { key: "data", title: "データコンプライアンス", desc: "視聴者記録の照会、本人確認、非同期削除リクエストの登録。" },
      { key: "settings", title: "システム設定", desc: "辞書カテゴリ、CSV 取込、SC 翻訳、スコア・保持ポリシー設定。" },
      { key: "integrations", title: "システム連携・出力", desc: "配信連携、AI モデルプール、OBS / デスクトップ用読み取り専用トークン。" },
      { key: "users", title: "メンバーと RBAC 権限", desc: "複数ロールの重ね合わせと Deny > Grant > Not Set 権限プレビュー。" },
      { key: "logs", title: "監査ログとトレース", desc: "技術ログ、変更履歴、HTTP 連携ログ、処理チェーン追跡。" },
      { key: "sandbox", title: "インタラクティブサンドボックス", desc: "ゼロリスクの合成環境でシナリオと 4 ロール権限を検証。" },
      { key: "guides", title: "導入ガイドと復旧", desc: "プラットフォーム対応表、ループバック構成、障害復旧手順。" },
    ],
    dockWindowAria: "独立ステージウィンドウ起動",
    dockWindowHeading: "独立配信ステージウィンドウ（新規ウィンドウ）",
    openDockBtn: "シンプルコメントビューを開く ↗",
    previewObsBtn: "OBS 透過ステージをプレビュー ↗",
  },
  ko: {
    pageTitle: "VoxWard 개요",
    pageDescription: "저방해 실시간 채팅 필터링, Super Chat 번역 및 컴플라이언스 감사 워크벤치.",
    recheckHealthBtn: "서비스 상태 다시 확인",
    backendHealthLabel: "백엔드 핵심 상태",
    healthStates: {
      normal: "정상 작동",
      checking: "상태 점검 중",
      degraded: "의존성 저하",
      offline: "연결 불가",
    },
    lastProbedPrefix: "최근 확인: ",
    probingNow: "점검 중",
    activeChannelLabel: "기본 활성 채널",
    activeChannelNote: "개별 워크벤치 상단에서 채널을 전환할 수 있습니다",
    stageOutputsLabel: "스테이지 출력 창",
    stageOutputsValue: "듀얼 출력 준비됨",
    stageOutputsNote: "투명 헤드리스 OBS 오버레이 + 단일 열 클린 채팅 독",
    quickEntryAria: "워크벤치 바로가기",
    quickEntryHeading: "워크벤치 및 보조 도구",
    launchers: [
      { key: "moderation", title: "실시간 검토 워크벤치", desc: "2열 대기열 검토, 바이패스 스트림 및 AI 후보 용어 승인." },
      { key: "blocked", title: "차단 및 블랙리스트", desc: "과거 차단 점수 재판정(재송출 금지) 및 수동 차단 사용자 관리." },
      { key: "data", title: "데이터 컴플라이언스", desc: "개인정보 권한에 따른 기록 조회, 신원 검증 및 삭제 요청 등록." },
      { key: "settings", title: "시스템 설정", desc: "사전 분류, CSV 일괄 가져오기, SC 번역 및 점수 정책 관리." },
      { key: "integrations", title: "연동 및 출력 관리", desc: "방송 플랫폼, AI 모델 풀 구성 및 OBS / 데스크톱 읽기 전용 토큰 발급." },
      { key: "users", title: "멤버 및 3상태 권한", desc: "다중 역할 결합 및 Deny > Grant > Not Set 유효 권한 미리보기." },
      { key: "logs", title: "로그 및 추적 체인", desc: "기술 로그, 변경 로그, HTTP 연동 마스킹 로그 및 전체 파이프라인 조회." },
      { key: "sandbox", title: "인터랙티브 샌드박스", desc: "실데이터 영향 없이 시나리오와 4가지 역할 권한을 즉시 테스트." },
      { key: "guides", title: "연동 가이드 및 복구", desc: "플랫폼 호환성, 로컬 루프백 토폴로지 및 장애 복구 절차." },
    ],
    dockWindowAria: "독립 스테이지 출력 창",
    dockWindowHeading: "독립 송출 표시 창 (새 창에서 열기)",
    openDockBtn: "클린 채팅 독 열기 ↗",
    previewObsBtn: "OBS 투명 스테이지 미리보기 ↗",
  },
  fr: {
    pageTitle: "Vue d'ensemble VoxWard",
    pageDescription: "Modération discrète du chat en direct, traduction Super Chat et audit de conformité.",
    recheckHealthBtn: "Revérifier l'état du service",
    backendHealthLabel: "État du serveur principal",
    healthStates: {
      normal: "Service opérationnel",
      checking: "Vérification en cours",
      degraded: "Dépendances dégradées",
      offline: "Service inaccessible",
    },
    lastProbedPrefix: "Dernière sonde : ",
    probingNow: "Vérification...",
    activeChannelLabel: "Chaîne active par défaut",
    activeChannelNote: "Changez de chaîne depuis l'en-tête de chaque module métier",
    stageOutputsLabel: "Fenêtres de sortie",
    stageOutputsValue: "Double sortie prête",
    stageOutputsNote: "Overlay OBS transparent + Dock épuré une colonne",
    quickEntryAria: "Accès rapides aux espaces",
    quickEntryHeading: "Espaces de travail et outils",
    launchers: [
      { key: "moderation", title: "Modération en direct", desc: "Double colonne : file d'attente, flux direct et suggestions IA." },
      { key: "blocked", title: "Blocages & Liste noire", desc: "Réévaluation de score (sans réémission à l'écran) et liste noire." },
      { key: "data", title: "Conformité des données", desc: "Recherche de profils, vérification et demandes de suppression." },
      { key: "settings", title: "Paramètres", desc: "Catégories, import CSV, traduction SC, notation et rétention." },
      { key: "integrations", title: "Intégrations & Sorties", desc: "Plateformes, modèles IA et jetons de sortie en lecture seule." },
      { key: "users", title: "Membres & RBAC", desc: "Combinaison multi-rôles avec aperçu Deny > Grant > Not Set." },
      { key: "logs", title: "Journaux & Chaînes", desc: "Journaux techniques, modifications, requêtes HTTP et traces." },
      { key: "sandbox", title: "Bac à sable interactif", desc: "Environnement synthétique sans risque avec scénarios et rôles." },
      { key: "guides", title: "Guides & Dépannage", desc: "Matrice de support, boucle locale et procédures de reprise." },
    ],
    dockWindowAria: "Fenêtres autonomes de sortie scène",
    dockWindowHeading: "Fenêtres de sortie autonomes (nouvel onglet)",
    openDockBtn: "Ouvrir le Dock épuré ↗",
    previewObsBtn: "Aperçu de la scène OBS transparente ↗",
  },
};

export interface GuideMatrixRowText {
  readonly target: string;
  readonly status: "SUPPORTED" | "VERIFIED_LOOPBACK" | "UNSUPPORTED";
  readonly statusLabel: string;
  readonly endpointOrDocs: string;
  readonly summary: string;
}

export interface GuideTroubleshootText {
  readonly code: string;
  readonly symptom: string;
  readonly resolution: string;
}

export interface GuidesCopy {
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly matrixAria: string;
  readonly matrixHeading: string;
  readonly matrixTableLabel: string;
  readonly colTarget: string;
  readonly colStatus: string;
  readonly colEntry: string;
  readonly colSummary: string;
  readonly matrixRows: readonly GuideMatrixRowText[];
  readonly loopbackTitle: string;
  readonly loopbackDesc: string;
  readonly loopbackDiagram: string;
  readonly loopbackNote: string;
  readonly checklistTitle: string;
  readonly checklistSteps: readonly string[];
  readonly openIntegrationsBtn: string;
  readonly openSandboxBtn: string;
  readonly troubleshootAria: string;
  readonly troubleshootHeading: string;
  readonly collapseStep: string;
  readonly expandStep: string;
  readonly troubleshootingItems: readonly GuideTroubleshootText[];
}

export const GUIDES_COPY: Readonly<Record<VoxWardLocale, GuidesCopy>> = {
  en: {
    pageTitle: "Integration Guides",
    pageDescription: "Platform compatibility, OBS & desktop loopback topology, and troubleshooting checklists.",
    matrixAria: "Integration support matrix",
    matrixHeading: "Integration & Output Support Matrix",
    matrixTableLabel: "Integration compatibility inventory",
    colTarget: "Target / Protocol",
    colStatus: "Support Level",
    colEntry: "Management Entry",
    colSummary: "Details",
    matrixRows: [
      {
        target: "YouTube Live Chat API v3",
        status: "SUPPORTED",
        statusLabel: "Official Protocol",
        endpointOrDocs: "Integrations › Platform Adapters › YouTube Live Data v3",
        summary: "Ingests live chat and Super Chat with member identity baseline trust mapping.",
      },
      {
        target: "OBS Browser Overlay Source (Transparent)",
        status: "SUPPORTED",
        statusLabel: "Official Stage Output",
        endpointOrDocs: "Integrations › Output Targets › OBS Transparent Overlay",
        summary: "One-way encrypted stream for approved messages & 7-tier Super Chats; silent WARD_BLOCKED retraction.",
      },
      {
        target: "blivechat Desktop / Native Loopback Client",
        status: "VERIFIED_LOOPBACK",
        statusLabel: "Loopback Verified",
        endpointOrDocs: "Integrations › Output Targets › blivechat / Native Read-Only",
        summary: "Cloud VoxWard bridges approved chat to desktop apps via localhost 127.0.0.1 loopback tunnel.",
      },
      {
        target: "Kiro CLI Local Inference Runtime",
        status: "VERIFIED_LOOPBACK",
        statusLabel: "Isolated Runtime Verified",
        endpointOrDocs: "Integrations › AI Providers › Kiro CLI",
        summary: "Runs classification & SC translation inside an isolated ephemeral directory cleaned immediately after use.",
      },
      {
        target: "Unsigned Direct Third-Party Plugins",
        status: "UNSUPPORTED",
        statusLabel: "Blocked by Isolation",
        endpointOrDocs: "Issue read-only output credentials in Integrations",
        summary: "Downstream clients never receive upstream write controls and must connect via read-only grants.",
      },
    ],
    loopbackTitle: "Cloud-to-PC Loopback Topology",
    loopbackDesc: "VoxWard runs on the control server; the streamer's desktop connector opens an outbound WSS read-only connection and delivers approved frames locally to OBS or blivechat.",
    loopbackDiagram: "YouTube Live Chat -> VoxWard Moderation & SC Translation -> Read-Only Outbound Tunnel -> Local Loopback Connector -> OBS / blivechat",
    loopbackNote: "Security rule: downstream outputs hold single-direction read credentials and cannot alter blocklists or settings.",
    checklistTitle: "3-Step Pre-Stream Checklist",
    checklistSteps: [
      "Configure YouTube ingestion credentials and AI provider adapters in Integrations and verify connection tests.",
      "Issue read-only tokens/grants under Integrations › Downstream Output Targets for OBS overlay or desktop clients.",
      "Open the Sandbox to preview headless OBS stage and Pure Danmaku Dock output before going live.",
    ],
    openIntegrationsBtn: "Issue credentials in Integrations",
    openSandboxBtn: "Open Sandbox",
    troubleshootAria: "Troubleshooting accordion",
    troubleshootHeading: "Common Issues & Recovery Steps",
    collapseStep: "Hide steps",
    expandStep: "Show steps",
    troubleshootingItems: [
      {
        code: "WS_4403",
        symptom: "OBS or desktop client stops reconnecting with credential revoked (4403)",
        resolution: "The token or grant was revoked by an administrator. Issue a new read-only credential under Integrations › Downstream Output Targets and update your local URL.",
      },
      {
        code: "WS_4400",
        symptom: "Connection closes immediately on read-only protocol violation (4400)",
        resolution: "OBS browser sources and desktop outputs must never send upstream data or control frames to VoxWard. Check client scripts.",
      },
      {
        code: "SC_TR_OFF",
        symptom: "Super Chat cards appear without translated text",
        resolution: "Confirm the channel owner enabled the SC Translation switch under Settings › Scoring & Runtime and bound a valid SC translation model.",
      },
      {
        code: "LOOPBACK_CONN",
        symptom: "Cloud server cannot reach the streamer PC desktop client directly",
        resolution: "Run the VoxWard desktop loopback connector on the streaming PC with a one-time grant so it dials outbound WSS to VoxWard.",
      },
    ],
  },
  "zh-CN": {
    pageTitle: "接入指南",
    pageDescription: "查看各直播平台、OBS 投屏源与本机桌面助手支持程度、网络回环拓扑以及常见故障排查步骤。",
    matrixAria: "集成支持程度矩阵",
    matrixHeading: "集成与输出支持矩阵",
    matrixTableLabel: "集成兼容性清单",
    colTarget: "对接端 / 协议",
    colStatus: "支持级别",
    colEntry: "管理入口位置",
    colSummary: "适用说明",
    matrixRows: [
      {
        target: "YouTube 直播聊天 API v3",
        status: "SUPPORTED",
        statusLabel: "官方协议支持",
        endpointOrDocs: "平台适配适配器 › YouTube Live Data v3",
        summary: "支持直播弹幕与 Super Chat 拉流与会员身份基础分映射。",
      },
      {
        target: "OBS 浏览器投屏源（透明无头）",
        status: "SUPPORTED",
        statusLabel: "官方投屏输出",
        endpointOrDocs: "系统集成 › 下游输出适配器 › OBS 透明投屏源",
        summary: "通过单向加密通道接收放行消息与 7 级 Super Chat；后置拦截自动无声撤回。",
      },
      {
        target: "blivechat 桌面插件 / 原生回环客户端",
        status: "VERIFIED_LOOPBACK",
        statusLabel: "本机回环已验证",
        endpointOrDocs: "系统集成 › 下游输出适配器 › blivechat / 原生只读输出协议",
        summary: "云端 VoxWard 经本机 127.0.0.1 回环隧道将过审弹幕桥接至桌面呈现端。",
      },
      {
        target: "Kiro CLI 本地推理运行时",
        status: "VERIFIED_LOOPBACK",
        statusLabel: "本机受限运行时已验证",
        endpointOrDocs: "系统集成 › AI 提供商 › Kiro CLI",
        summary: "以一次性受限运行目录执行弹幕合规分类与 SC 精翻，任务结束自动销毁临时现场。",
      },
      {
        target: "第三方未经签名插件直连",
        status: "UNSUPPORTED",
        statusLabel: "出于安全隔离不支持",
        endpointOrDocs: "请使用「系统集成」签发只读输出凭据接入",
        summary: "下游展示端一律禁止上行写控制指令，仅允许通过只读授权接收放行数据。",
      },
    ],
    loopbackTitle: "云端至本机 PC 回环拓扑",
    loopbackDesc: "VoxWard 控制台部署在云端或播控服务器；主播电脑上的桌面输出端通过出站加密长连接凭据接入云端只读队列，再经本地回环地址交付给 OBS 或 blivechat。",
    loopbackDiagram: "YouTube 直播聊天 → VoxWard 审核与精翻服务 → 只读出站隧道 → 本机回环连接器 → OBS 投屏 / blivechat",
    loopbackNote: "安全原则：所有下游输出端仅持单向读凭据，不具备写入黑名单或变更系统配置的权力。",
    checklistTitle: "开播前 3 步快速自检",
    checklistSteps: [
      "在「集成管理」配置 YouTube 拉流凭据及 AI 推理服务，并确认测试连接通过。",
      "在「集成管理 › 下游输出适配器」配置 OBS 透明投屏源或桌面协议并签发只读凭据。",
      "进入「演练沙盒」验证无头 OBS 投屏与纯净弹幕姬效果符合预期。",
    ],
    openIntegrationsBtn: "前往集成管理签发凭据",
    openSandboxBtn: "打开演练沙盒",
    troubleshootAria: "常见故障排查手风琴",
    troubleshootHeading: "常见问题与排障清单",
    collapseStep: "收起排查步骤",
    expandStep: "展开排查步骤",
    troubleshootingItems: [
      {
        code: "WS_4403",
        symptom: "OBS 投屏或桌面端提示凭据失效（4403）且停止自动重连",
        resolution: "该通道凭据已被管理员撤销。请前往「集成管理 › 下游输出凭据」重新签发新凭据并更新本地配置。",
      },
      {
        code: "WS_4400",
        symptom: "连接建立后立即以只读协议违规断开（4400）",
        resolution: "OBS 浏览器或桌面输出端不允许向服务端发送任何控制帧或弹幕写入消息，请检查客户端脚本版本。",
      },
      {
        code: "SC_TR_OFF",
        symptom: "Super Chat 卡片正常显示但未出现中文精翻文本",
        resolution: "请确认频道所有者已在「系统设置 › 计分与运行策略」开启 SC 精翻开关，并在该页绑定了有效 AI 翻译模型。",
      },
      {
        code: "LOOPBACK_CONN",
        symptom: "云端部署无法直连主播电脑上的桌面输出端",
        resolution: "请主播在播控电脑启动 VoxWard 桌面辅助连接器，使用一次性输出凭据建立出站 WSS 长连接后再将本地回环端指向本机客户端。",
      },
    ],
  },
  ja: {
    pageTitle: "導入ガイド",
    pageDescription: "配信プラットフォーム互換性、OBS・デスクトップループバック構成、障害対応手順を確認できます。",
    matrixAria: "連携サポートマトリクス",
    matrixHeading: "連携・出力サポートマトリクス",
    matrixTableLabel: "連携互換性一覧",
    colTarget: "接続先 / プロトコル",
    colStatus: "サポートレベル",
    colEntry: "設定箇所",
    colSummary: "説明",
    matrixRows: [
      {
        target: "YouTube ライブチャット API v3",
        status: "SUPPORTED",
        statusLabel: "公式プロトコル対応",
        endpointOrDocs: "連携管理 › プラットフォーム › YouTube Live Data v3",
        summary: "チャット・Super Chat 取得およびメンバー種別に基づく初期信頼スコア設定に対応。",
      },
      {
        target: "OBS ブラウザオーバーレイ（透過ヘッドレス）",
        status: "SUPPORTED",
        statusLabel: "公式ステージ出力",
        endpointOrDocs: "連携管理 › 出力ターゲット › OBS 透過オーバーレイ",
        summary: "承認済みメッセージと 7 段階 Super Chat を単方向受信。後追いブロック時は無音で取り下げ。",
      },
      {
        target: "blivechat デスクトップ / ネイティブループバック",
        status: "VERIFIED_LOOPBACK",
        statusLabel: "ローカルループバック検証済み",
        endpointOrDocs: "連携管理 › 出力ターゲット › blivechat / ネイティブ出力",
        summary: "クラウド側 VoxWard から 127.0.0.1 トンネル経由でローカルアプリへ安全に橋渡しします。",
      },
      {
        target: "Kiro CLI ローカル推論ランタイム",
        status: "VERIFIED_LOOPBACK",
        statusLabel: "分離ランタイム検証済み",
        endpointOrDocs: "連携管理 › AI プロバイダー › Kiro CLI",
        summary: "一時実行ディレクトリ内で判定と SC 翻訳を行い、完了後は直ちに作業領域を破棄します。",
      },
      {
        target: "未署名サードパーティ直結プラグイン",
        status: "UNSUPPORTED",
        statusLabel: "セキュリティ分離により非対応",
        endpointOrDocs: "「連携管理」から読み取り専用認証情報を発行してください",
        summary: "下流クライアントからの上り制御・書き込み命令は禁止されており、読み取り専用のみ許可されます。",
      },
    ],
    loopbackTitle: "クラウド〜配信PC ループバック構成",
    loopbackDesc: "VoxWard 本体はサーバー側で稼働し、配信 PC のコネクタから発信型の WSS 接続を開設してローカルの OBS や blivechat へ配送します。",
    loopbackDiagram: "YouTube チャット → VoxWard 審査・翻訳 → 読み取り専用トンネル → ローカルコネクタ → OBS / blivechat",
    loopbackNote: "セキュリティ原則：下流出力は読み取り専用であり、ブロックリストや設定変更の権限を持ちません。",
    checklistTitle: "配信前 3 ステップ確認",
    checklistSteps: [
      "「連携管理」で YouTube 接続情報と AI プロバイダーを設定し、疎通テストを通過させる。",
      "「連携管理 › 出力ターゲット」で OBS またはデスクトップ出力用の読み取り専用トークンを発行する。",
      "「サンドボックス」で OBS 透過ステージとシンプルコメントビューの表示を確認する。",
    ],
    openIntegrationsBtn: "連携管理でトークン発行",
    openSandboxBtn: "サンドボックスを開く",
    troubleshootAria: "トラブルシューティング一覧",
    troubleshootHeading: "よくある質問と復旧手順",
    collapseStep: "手順を閉じる",
    expandStep: "手順を表示",
    troubleshootingItems: [
      {
        code: "WS_4403",
        symptom: "OBS またはデスクトップ側で認証無効（4403）となり再接続が停止した",
        resolution: "管理者によってトークンが失効されています。「連携管理 › 出力ターゲット」から新しい認証情報を再発行して更新してください。",
      },
      {
        code: "WS_4400",
        symptom: "接続直後に読み取り専用プロトコル違反（4400）で切断される",
        resolution: "OBS ブラウザソースおよび下流クライアントからサーバーへのデータ送信は禁止されています。スクリプトをご確認ください。",
      },
      {
        code: "SC_TR_OFF",
        symptom: "Super Chat は表示されるが翻訳テキストが表示されない",
        resolution: "「設定 › スコア・運用ポリシー」で SC 翻訳トグルが有効になっており、翻訳モデルが選択されているか確認してください。",
      },
      {
        code: "LOOPBACK_CONN",
        symptom: "クラウドサーバーから配信 PC 側のアプリへ直接接続できない",
        resolution: "配信 PC 上で VoxWard ループバックコネクタを起動し、単方向 WSS でクラウド側へ発信接続してください。",
      },
    ],
  },
  ko: {
    pageTitle: "연동 가이드",
    pageDescription: "플랫폼 호환성, OBS 및 데스크톱 루프백 토폴로지, 장애 복구 체크리스트를 확인합니다.",
    matrixAria: "연동 지원 매트릭스",
    matrixHeading: "연동 및 출력 지원 매트릭스",
    matrixTableLabel: "호환성 목록",
    colTarget: "대상 / 프로토콜",
    colStatus: "지원 수준",
    colEntry: "관리 메뉴 위치",
    colSummary: "설명",
    matrixRows: [
      {
        target: "YouTube 라이브 채팅 API v3",
        status: "SUPPORTED",
        statusLabel: "공식 프로토콜 지원",
        endpointOrDocs: "연동 관리 › 플랫폼 어댑터 › YouTube Live Data v3",
        summary: "라이브 채팅 및 Super Chat 수집과 멤버십 기반 초기 신뢰 점수 매핑을 지원합니다.",
      },
      {
        target: "OBS 브라우저 오버레이 소스 (투명)",
        status: "SUPPORTED",
        statusLabel: "공식 스테이지 출력",
        endpointOrDocs: "연동 관리 › 출력 대상 › OBS 투명 오버레이",
        summary: "단방향 암호화 채널로 승인된 메시지와 7단계 Super Chat 전달; 사후 차단 시 무음 회수.",
      },
      {
        target: "blivechat 데스크톱 / 네이티브 루프백",
        status: "VERIFIED_LOOPBACK",
        statusLabel: "로컬 루프백 검증됨",
        endpointOrDocs: "연동 관리 › 출력 대상 › blivechat / 네이티브 프로토콜",
        summary: "클라우드 VoxWard에서 127.0.0.1 로컬 루프백 터널을 통해 데스크톱 앱으로 안전하게 전달합니다.",
      },
      {
        target: "Kiro CLI 로컬 추론 런타임",
        status: "VERIFIED_LOOPBACK",
        statusLabel: "격리 런타임 검증됨",
        endpointOrDocs: "연동 관리 › AI 제공자 › Kiro CLI",
        summary: "일회성 격리 실행 디렉터리에서 필터링과 SC 번역을 수행하고 작업 후 즉시 정리합니다.",
      },
      {
        target: "미서명 서드파티 직접 플러그인",
        status: "UNSUPPORTED",
        statusLabel: "보안 격리로 미지원",
        endpointOrDocs: "「연동 관리」에서 읽기 전용 출력 자격 증명을 발급하세요",
        summary: "하위 출력 클라이언트는 상향 쓰기 명령을 보낼 수 없으며 읽기 전용 권한으로만 연결됩니다.",
      },
    ],
    loopbackTitle: "클라우드-PC 루프백 토폴로지",
    loopbackDesc: "VoxWard 서버는 클라우드에서 실행되며, 스트리머 PC 커넥터가 아웃바운드 WSS 읽기 전용 연결을 열어 로컬 OBS 또는 blivechat에 전달합니다.",
    loopbackDiagram: "YouTube 채팅 → VoxWard 검토 및 SC 번역 → 읽기 전용 아웃바운드 터널 → 로컬 커넥터 → OBS / blivechat",
    loopbackNote: "보안 원칙: 모든 하위 출력은 단방향 읽기 자격 증명만 보유하며 블랙리스트나 설정을 수정할 수 없습니다.",
    checklistTitle: "방송 전 3단계 자가 점검",
    checklistSteps: [
      "「연동 관리」에서 YouTube 수집 자격 증명 및 AI 추론 어댑터를 설정하고 연결 테스트를 완료하세요.",
      "「연동 관리 › 출력 대상」에서 OBS 오버레이 또는 데스크톱용 읽기 전용 토큰을 발급하세요.",
      "「샌드박스」를 열어 헤드리스 OBS 스테이지와 클린 채팅 독 출력을 사전 점검하세요.",
    ],
    openIntegrationsBtn: "연동 관리에서 자격 증명 발급",
    openSandboxBtn: "샌드박스 열기",
    troubleshootAria: "문제 해결 아코디언",
    troubleshootHeading: "자주 발생하는 문제 및 복구 절차",
    collapseStep: "단계 접기",
    expandStep: "단계 펼치기",
    troubleshootingItems: [
      {
        code: "WS_4403",
        symptom: "OBS 또는 데스크톱 앱이 자격 증명 만료/철회(4403)로 재연결을 중단함",
        resolution: "관리자가 해당 토큰을 철회했습니다. 「연동 관리 › 출력 대상」에서 새 자격 증명을 재발급하여 로컬 설정을 업데이트하세요.",
      },
      {
        code: "WS_4400",
        symptom: "연결 직후 읽기 전용 프로토콜 위반(4400)으로 끊김",
        resolution: "OBS 브라우저 소스 및 데스크톱 출력단은 서버로 어떠한 제어 프레임이나 쓰기 데이터도 보낼 수 없습니다.",
      },
      {
        code: "SC_TR_OFF",
        symptom: "Super Chat 카드는 표시되지만 번역 문구가 나오지 않음",
        resolution: "채널 소유자가 「설정 › 점수 및 운영 정책」에서 SC 번역 스위치를 켜고 유효한 번역 모델을 지정했는지 확인하세요.",
      },
      {
        code: "LOOPBACK_CONN",
        symptom: "클라우드 서버가 스트리머 PC의 데스크톱 앱에 직접 접근할 수 없음",
        resolution: "방송 PC에서 VoxWard 데스크톱 루프백 커넥터를 실행하여 일회성 토큰으로 아웃바운드 WSS 연결을 맺으세요.",
      },
    ],
  },
  fr: {
    pageTitle: "Guides d'intégration",
    pageDescription: "Compatibilité des plateformes, topologie en boucle locale OBS/bureau et dépannage.",
    matrixAria: "Matrice de support des intégrations",
    matrixHeading: "Matrice de support et sorties",
    matrixTableLabel: "Inventaire de compatibilité",
    colTarget: "Cible / Protocole",
    colStatus: "Niveau de support",
    colEntry: "Menu de gestion",
    colSummary: "Précisions",
    matrixRows: [
      {
        target: "API YouTube Live Chat v3",
        status: "SUPPORTED",
        statusLabel: "Protocole officiel",
        endpointOrDocs: "Intégrations › Plateformes › YouTube Live Data v3",
        summary: "Collecte les messages et Super Chats avec score initial selon le statut de membre.",
      },
      {
        target: "Source navigateur OBS (transparente)",
        status: "SUPPORTED",
        statusLabel: "Sortie officielle",
        endpointOrDocs: "Intégrations › Sorties › Overlay transparent OBS",
        summary: "Flux chiffré unidirectionnel pour messages approuvés et 7 paliers SC ; rétractation silencieuse.",
      },
      {
        target: "Client bureau blivechat / boucle locale",
        status: "VERIFIED_LOOPBACK",
        statusLabel: "Boucle locale vérifiée",
        endpointOrDocs: "Intégrations › Sorties › blivechat / Protocole natif",
        summary: "Relie VoxWard cloud aux applications locales du streamer via un tunnel 127.0.0.1.",
      },
      {
        target: "Moteur local Kiro CLI",
        status: "VERIFIED_LOOPBACK",
        statusLabel: "Exécution isolée vérifiée",
        endpointOrDocs: "Intégrations › Fournisseurs IA › Kiro CLI",
        summary: "Exécute la modération et traduction SC dans un répertoire éphémère isolé nettoyé après usage.",
      },
      {
        target: "Plugins tiers non signés directs",
        status: "UNSUPPORTED",
        statusLabel: "Bloqué par isolation",
        endpointOrDocs: "Émettez des jetons en lecture seule dans Intégrations",
        summary: "Aucune commande d'écriture montante n'est autorisée pour les sorties aval.",
      },
    ],
    loopbackTitle: "Topologie Cloud vers boucle locale PC",
    loopbackDesc: "Le serveur VoxWard tourne dans le cloud ; le connecteur bureau ouvre un tunnel WSS sortant en lecture seule vers l'OBS ou blivechat local.",
    loopbackDiagram: "Chat YouTube → Modération & Traduction SC VoxWard → Tunnel sortant lecture seule → Connecteur local → OBS / blivechat",
    loopbackNote: "Règle de sécurité : les sorties aval ne détiennent qu'un accès lecture seule et ne modifient aucune configuration.",
    checklistTitle: "Vérification rapide en 3 étapes",
    checklistSteps: [
      "Configurez YouTube et les adaptateurs IA dans Intégrations puis exécutez un test de connexion.",
      "Générez un jeton ou une autorisation en lecture seule sous Intégrations › Sorties.",
      "Vérifiez l'aperçu OBS et le Dock épuré dans le Bac à sable avant de lancer le live.",
    ],
    openIntegrationsBtn: "Émettre des jetons dans Intégrations",
    openSandboxBtn: "Ouvrir le Bac à sable",
    troubleshootAria: "Accordéon de dépannage",
    troubleshootHeading: "Problèmes courants et résolution",
    collapseStep: "Masquer les étapes",
    expandStep: "Afficher les étapes",
    troubleshootingItems: [
      {
        code: "WS_4403",
        symptom: "OBS ou l'application locale arrête la reconnexion (4403 jeton révoqué)",
        resolution: "L'autorisation a été révoquée par un administrateur. Générez un nouveau jeton sous Intégrations › Sorties.",
      },
      {
        code: "WS_4400",
        symptom: "Déconnexion immédiate pour violation lecture seule (4400)",
        resolution: "Les clients de sortie OBS/bureau ne doivent jamais envoyer de trames de données ou de contrôle vers le serveur.",
      },
      {
        code: "SC_TR_OFF",
        symptom: "Les cartes Super Chat s'affichent sans traduction",
        resolution: "Vérifiez que l'option de traduction SC et un modèle valide sont configurés dans Paramètres › Notation & Exécution.",
      },
      {
        code: "LOOPBACK_CONN",
        symptom: "Le serveur cloud ne peut pas joindre directement le client bureau du PC",
        resolution: "Démarrez le connecteur boucle locale VoxWard sur le PC de streaming pour établir une connexion WSS sortante.",
      },
    ],
  },
};
