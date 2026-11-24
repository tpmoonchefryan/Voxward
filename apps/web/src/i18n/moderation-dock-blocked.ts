import type { VoxWardLocale } from "./types";

export interface DockCopy {
  readonly dockAria: string;
  readonly streamAria: string;
  readonly streamTitle: string;
  readonly countSummary: (total: number, scCount: number) => string;
  readonly platformFaultTitle: string;
  readonly modelFaultTitle: string;
  readonly emptyTitle: string;
  readonly emptyDesc: string;
  readonly safeAnonymousAlias: string;
  readonly errors: Readonly<Record<string, string>>;
  readonly genericError: string;
  readonly networkError: string;
}

export const DOCK_COPY: Readonly<Record<VoxWardLocale, DockCopy>> = {
  en: {
    dockAria: "Pure Danmaku Dock",
    streamAria: "Single-column pure live chat feed",
    streamTitle: "Live Chat Stream",
    countSummary: (total, sc) => `${total} items · ${sc} pinned SC`,
    platformFaultTitle: "Live platform connection notice",
    modelFaultTitle: "AI service degradation notice",
    emptyTitle: "No live chat or Super Chat yet",
    emptyDesc: "Approved chat messages and Super Chats appear chronologically here. Click a top ticker pill to inspect the card.",
    safeAnonymousAlias: "Viewer",
    errors: {
      UNAUTHENTICATED: "Please sign in first.",
      FORBIDDEN: "Permission revoked or no access to this channel.",
      DOWNSTREAM_READ_ONLY: "Read-only output credential cannot perform this action.",
      CSRF_INVALID: "Session expired. Please refresh and retry.",
      CHANNEL_NOT_FOUND: "Channel not found.",
      INVALID_REQUEST: "Invalid request parameters.",
      INTERNAL_ERROR: "Service temporarily unavailable.",
    },
    genericError: "Operation did not complete. Please retry.",
    networkError: "Unable to connect to the service.",
  },
  "zh-CN": {
    dockAria: "纯净弹幕姬",
    streamAria: "纯净单栏弹幕流",
    streamTitle: "纯净弹幕流",
    countSummary: (total, sc) => `${total} 条 · ${sc} 条置顶 SC`,
    platformFaultTitle: "直播平台连接提示",
    modelFaultTitle: "AI 服务降级提示",
    emptyTitle: "暂无放行弹幕与 Super Chat",
    emptyDesc: "通过审核的直播对话与 Super Chat 将在同一时间流中实时呈现，点击顶部醒目条可展开卡片。",
    safeAnonymousAlias: "匿名观众",
    errors: {
      UNAUTHENTICATED: "请先登录。",
      FORBIDDEN: "当前账号权限已被撤销或无权访问此频道。",
      DOWNSTREAM_READ_ONLY: "输出凭据不能执行此操作。",
      CSRF_INVALID: "页面已过期，请刷新后重试。",
      CHANNEL_NOT_FOUND: "未找到该频道。",
      INVALID_REQUEST: "提交的参数无效。",
      INTERNAL_ERROR: "服务暂时不可用，请稍后再试。",
    },
    genericError: "操作未完成，请稍后重试。",
    networkError: "无法连接服务，请检查网络后重试。",
  },
  ja: {
    dockAria: "シンプルコメントビュー",
    streamAria: "1 列シンプルコメントストリーム",
    streamTitle: "ライブチャットストリーム",
    countSummary: (total, sc) => `${total} 件 · ピン留め SC ${sc} 件`,
    platformFaultTitle: "配信プラットフォーム接続通知",
    modelFaultTitle: "AI サービス縮退運転通知",
    emptyTitle: "まだ表示可能なコメントや Super Chat はありません",
    emptyDesc: "承認されたライブチャットと Super Chat が時系列で表示されます。上部のピン留めピルをクリックすると詳細カードを開けます。",
    safeAnonymousAlias: "匿名視聴者",
    errors: {
      UNAUTHENTICATED: "先にログインしてください。",
      FORBIDDEN: "権限が取り消されたか、このチャンネルへのアクセス権がありません。",
      DOWNSTREAM_READ_ONLY: "読み取り専用の出力認証情報ではこの操作を実行できません。",
      CSRF_INVALID: "ページの有効期限が切れました。再読み込みしてください。",
      CHANNEL_NOT_FOUND: "チャンネルが見つかりません。",
      INVALID_REQUEST: "パラメータが無効です。",
      INTERNAL_ERROR: "サービスを一時的に利用できません。",
    },
    genericError: "操作を完了できませんでした。後ほど再試行してください。",
    networkError: "サーバーに接続できません。ネットワークを確認してください。",
  },
  ko: {
    dockAria: "클린 채팅 독",
    streamAria: "단일 열 클린 채팅 스트림",
    streamTitle: "라이브 채팅 스트림",
    countSummary: (total, sc) => `${total}개 · 고정 SC ${sc}개`,
    platformFaultTitle: "방송 플랫폼 연결 알림",
    modelFaultTitle: "AI 서비스 성능 저하 알림",
    emptyTitle: "표시할 채팅과 Super Chat이 아직 없습니다",
    emptyDesc: "승인된 채팅과 Super Chat이 시간순으로 표시됩니다. 상단 고정 배지를 클릭하면 상세 카드를 볼 수 있습니다.",
    safeAnonymousAlias: "익명 시청자",
    errors: {
      UNAUTHENTICATED: "먼저 로그인하세요.",
      FORBIDDEN: "권한이 철회되었거나 이 채널에 접근할 수 없습니다.",
      DOWNSTREAM_READ_ONLY: "읽기 전용 출력 자격 증명으로는 이 작업을 수행할 수 없습니다.",
      CSRF_INVALID: "세션이 만료되었습니다. 새로고침 후 다시 시도하세요.",
      CHANNEL_NOT_FOUND: "채널을 찾을 수 없습니다.",
      INVALID_REQUEST: "요청 매개변수가 올바르지 않습니다.",
      INTERNAL_ERROR: "서비스를 일시적으로 사용할 수 없습니다.",
    },
    genericError: "작업이 완료되지 않았습니다. 잠시 후 다시 시도하세요.",
    networkError: "서비스에 연결할 수 없습니다.",
  },
  fr: {
    dockAria: "Dock épuré",
    streamAria: "Flux de chat épuré sur une colonne",
    streamTitle: "Flux de chat en direct",
    countSummary: (total, sc) => `${total} éléments · ${sc} SC épinglés`,
    platformFaultTitle: "Alerte connexion plateforme",
    modelFaultTitle: "Alerte dégradation service IA",
    emptyTitle: "Aucun message ni Super Chat pour l'instant",
    emptyDesc: "Les messages et Super Chats validés apparaissent chronologiquement ici. Cliquez sur une pastille en haut pour ouvrir la carte.",
    safeAnonymousAlias: "Spectateur anonyme",
    errors: {
      UNAUTHENTICATED: "Veuillez d'abord vous connecter.",
      FORBIDDEN: "Autorisation révoquée ou accès refusé pour cette chaîne.",
      DOWNSTREAM_READ_ONLY: "Un jeton en lecture seule ne peut pas effectuer cette action.",
      CSRF_INVALID: "Session expirée. Veuillez actualiser et réessayer.",
      CHANNEL_NOT_FOUND: "Chaîne introuvable.",
      INVALID_REQUEST: "Paramètres invalides.",
      INTERNAL_ERROR: "Service temporairement indisponible.",
    },
    genericError: "L'opération a échoué. Veuillez réessayer.",
    networkError: "Impossible de joindre le service.",
  },
};

export interface YouTubeScCopy {
  readonly tickerAria: string;
  readonly progressAria: string;
  readonly overlayAria: string;
}

export const YOUTUBE_SC_COPY: Readonly<Record<VoxWardLocale, YouTubeScCopy>> = {
  en: {
    tickerAria: "Pinned Super Chat countdown bar",
    progressAria: "Remaining Super Chat pin time",
    overlayAria: "Expanded Super Chat card",
  },
  "zh-CN": {
    tickerAria: "Super Chat 倒计时置顶条",
    progressAria: "Super Chat 置顶剩余时长进度",
    overlayAria: "Super Chat 置顶详情浮层",
  },
  ja: {
    tickerAria: "Super Chat カウントダウンバー",
    progressAria: "Super Chat ピン留め残り時間",
    overlayAria: "Super Chat 詳細カード",
  },
  ko: {
    tickerAria: "Super Chat 카운트다운 상단 바",
    progressAria: "Super Chat 고정 남은 시간",
    overlayAria: "Super Chat 상세 카드 오버레이",
  },
  fr: {
    tickerAria: "Barre de compte à rebours Super Chat",
    progressAria: "Durée d'épinglage Super Chat restante",
    overlayAria: "Carte Super Chat détaillée",
  },
};

export interface OverlayCopy {
  readonly stageAria: string;
  readonly feedAria: string;
  readonly previewBadge: string;
  readonly connectedStatus: string;
  readonly closeMessages: Readonly<Record<string, string>>;
  readonly parseErrors: {
    readonly queryRejected: string;
    readonly missing: string;
    readonly invalid: string;
  };
}

export const OVERLAY_COPY: Readonly<Record<VoxWardLocale, OverlayCopy>> = {
  en: {
    stageAria: "OBS Live Overlay Stage",
    feedAria: "OBS Chat Feed",
    previewBadge: "OBS Overlay Preview · Issue a read-only token under Integrations › OBS Overlay Source for live streaming",
    connectedStatus: "Connected to read-only output stream (vw-output.v1)",
    closeMessages: {
      4403: "Output credential revoked (4403). Reconnect stopped; issue a new credential in Admin.",
      4400: "Protocol error (4400: read-only outputs cannot send upstream frames). Reconnect stopped.",
      4408: "Heartbeat timeout (4408), attempting exponential backoff reconnect…",
      4413: "Backpressure timeout (4413), attempting exponential backoff reconnect…",
      default: "Disconnected, attempting exponential backoff reconnect…",
    },
    parseErrors: {
      queryRejected: "Rejected by policy (Q16): pass credentials in URL fragment (#vwo_...), never query params.",
      missing: "No read-only output credential found in URL fragment (#vwo_... or #cred=vwo_...).",
      invalid: "Invalid output credential format in URL fragment.",
    },
  },
  "zh-CN": {
    stageAria: "OBS 直播投屏舞台",
    feedAria: "OBS 聊天信息流",
    previewBadge: "OBS 透明投屏预览示例 · 请于「集成管理 › OBS 透明投屏源」签发只读令牌接入正式推流",
    connectedStatus: "已连接只读输出通道（vw-output.v1）",
    closeMessages: {
      4403: "输出凭据已被撤销（4403），已停止重连。请在管理后台重新签发凭据。",
      4400: "连接因协议错误关闭（4400：只读端不可发送数据帧），已停止重连。",
      4408: "心跳超时（4408），正在尝试指数退避重连…",
      4413: "消费端背压超时（4413），正在尝试指数退避重连…",
      default: "连接已断开，正在尝试指数退避重连…",
    },
    parseErrors: {
      queryRejected: "安全策略拒绝（Q16）：禁止通过 URL 查询参数（?cred= / ?token=）传递凭据，请使用 URL Fragment（#vwo_...）。",
      missing: "未在 URL Fragment 中检测到只读输出凭据（#vwo_... 或 #cred=vwo_...）。",
      invalid: "URL Fragment 中的输出凭据格式无效，已拒绝连接。",
    },
  },
  ja: {
    stageAria: "OBS ライブオーバーレイステージ",
    feedAria: "OBS チャットフィード",
    previewBadge: "OBS オーバーレイプレビュー · 本配信には「連携管理 › OBS 透過オーバーレイ」で読み取り専用トークンを発行してください",
    connectedStatus: "読み取り専用出力チャネルに接続済み (vw-output.v1)",
    closeMessages: {
      4403: "認証情報が失効しました (4403)。再接続を停止しました。管理画面から再発行してください。",
      4400: "プロトコルエラー (4400：読み取り専用クライアントはデータ送信不可)。再接続を停止しました。",
      4408: "ハートビートタイムアウト (4408)。再接続を試行しています…",
      4413: "バックプレッシャータイムアウト (4413)。再接続を試行しています…",
      default: "切断されました。指数バックオフで再接続を試行しています…",
    },
    parseErrors: {
      queryRejected: "セキュリティポリシーにより拒否 (Q16)：クエリパラメータではなく URL フラグメント (#vwo_...) を使用してください。",
      missing: "URL フラグメント (#vwo_... または #cred=vwo_...) に読み取り専用認証情報がありません。",
      invalid: "URL フラグメント内の認証情報形式が無効です。",
    },
  },
  ko: {
    stageAria: "OBS 라이브 오버레이 스테이지",
    feedAria: "OBS 채팅 피드",
    previewBadge: "OBS 오버레이 미리보기 · 실제 송출은 「연동 관리 › OBS 투명 오버레이」에서 읽기 전용 토큰을 발급하세요",
    connectedStatus: "읽기 전용 출력 채널 연결됨 (vw-output.v1)",
    closeMessages: {
      4403: "출력 자격 증명이 철회되었습니다 (4403). 재연결을 중단했습니다.",
      4400: "프로토콜 오류 (4400: 읽기 전용 클라이언트는 데이터 전송 불가). 재연결을 중단했습니다.",
      4408: "하트비트 시간 초과 (4408), 지수 백오프로 재연결 중…",
      4413: "백프레셔 시간 초과 (4413), 지수 백오프로 재연결 중…",
      default: "연결이 끊겼습니다. 지수 백오프로 재연결 시도 중…",
    },
    parseErrors: {
      queryRejected: "보안 정책 거부 (Q16): 쿼리 파라미터 대신 URL 프래그먼트(#vwo_...)를 사용하세요.",
      missing: "URL 프래그먼트(#vwo_... 또는 #cred=vwo_...)에 읽기 전용 자격 증명이 없습니다.",
      invalid: "URL 프래그먼트의 출력 자격 증명 형식이 올바르지 않습니다.",
    },
  },
  fr: {
    stageAria: "Scène Overlay OBS en direct",
    feedAria: "Flux chat OBS",
    previewBadge: "Aperçu Overlay OBS · Émettez un jeton lecture seule sous Intégrations › Overlay OBS pour la diffusion réelle",
    connectedStatus: "Connecté au flux de sortie lecture seule (vw-output.v1)",
    closeMessages: {
      4403: "Jeton de sortie révoqué (4403). Reconnexion arrêtée ; générez un nouveau jeton.",
      4400: "Erreur de protocole (4400 : les sorties en lecture seule ne peuvent rien envoyer).",
      4408: "Expiration heartbeat (4408), reconnexion avec backoff exponentiel…",
      4413: "Expiration backpressure (4413), reconnexion avec backoff exponentiel…",
      default: "Déconnecté, reconnexion avec backoff exponentiel…",
    },
    parseErrors: {
      queryRejected: "Refusé par politique (Q16) : passez le jeton via fragment URL (#vwo_...), jamais par paramètre de requête.",
      missing: "Aucun jeton en lecture seule détecté dans le fragment URL (#vwo_...).",
      invalid: "Format de jeton invalide dans le fragment URL.",
    },
  },
};

export interface ModerationCopy {
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly scOn: string;
  readonly scOff: string;
  readonly tabAria: string;
  readonly queueTab: (count: number) => string;
  readonly candidatesTab: (count: number) => string;
  readonly classAllowScore: string;
  readonly classAllowNoScore: string;
  readonly classBlock: string;
  readonly classDone: string;
  readonly decidedFeedback: (label: string) => string;
  readonly batchConflictFeedback: (count: number) => string;
  readonly batchDoneFeedback: (count: number, label: string) => string;
  readonly candidateConfirmed: string;
  readonly candidateRejected: string;
  readonly resentSuccess: string;
  readonly conflictDefault: string;
  readonly conflictTitle: string;
  readonly refreshNow: string;
  readonly queueAria: string;
  readonly queueHeading: (count: number) => string;
  readonly selectAll: string;
  readonly selectedPrefix: (count: number) => string;
  readonly approveWithScore: string;
  readonly approveNoScore: string;
  readonly confirmBlock: string;
  readonly queueEmptyTitle: string;
  readonly queueEmptyDesc: string;
  readonly pendingBadge: string;
  readonly deadlinePrefix: string;
  readonly collapseOriginal: string;
  readonly expandFull: string;
  readonly foldedSnippetNotice: string;
  readonly streamAria: string;
  readonly streamHeading: string;
  readonly streamRecentCount: (count: number) => string;
  readonly streamEmptyTitle: string;
  readonly streamEmptyDesc: string;
  readonly viewOriginal: string;
  readonly collapseContent: string;
  readonly deliveryFailed: string;
  readonly resendBtn: string;
  readonly candidatesAria: string;
  readonly candidatesHeading: (count: number) => string;
  readonly candidatesHint: string;
  readonly candidatesEmptyTitle: string;
  readonly candidatesEmptyDesc: string;
  readonly pendingConfirmBadge: string;
  readonly assignCategoryLabel: string;
  readonly confirmAddBlacklist: string;
  readonly ignoreBtn: string;
  readonly defaultSpamCategory: string;
}

export const MODERATION_COPY: Readonly<Record<VoxWardLocale, ModerationCopy>> = {
  en: {
    pageTitle: "Live Moderation",
    pageDescription: "Coordinate the pending review queue and bypass live stream, and confirm AI-extracted term candidates.",
    scOn: "SC Translation On",
    scOff: "SC Translation Off",
    tabAria: "Moderation workspace views",
    queueTab: (n) => `Live Queue (${n})`,
    candidatesTab: (n) => `AI Term Candidates (${n})`,
    classAllowScore: "Allow (Restore Score)",
    classAllowNoScore: "Allow (No Score)",
    classBlock: "Confirmed Block",
    classDone: "Decided",
    decidedFeedback: (l) => `Submitted verdict: ${l}.`,
    batchConflictFeedback: (c) => `${c} item(s) were already decided by another moderator; conflict guard preserved.`,
    batchDoneFeedback: (c, l) => `Processed ${c} queued item(s) (${l}).`,
    candidateConfirmed: "Candidate term confirmed and added to the selected blacklist category.",
    candidateRejected: "Ignored candidate term suggestion.",
    resentSuccess: "Re-dispatched delivery to downstream stage.",
    conflictDefault: "This task has already been handled by another moderator. Refresh the queue.",
    conflictTitle: "Concurrent Moderation Conflict",
    refreshNow: "Refresh Now",
    queueAria: "Live review queue",
    queueHeading: (n) => `Review Queue (${n})`,
    selectAll: "Select all",
    selectedPrefix: (n) => `${n} selected:`,
    approveWithScore: "Allow (Restore Score)",
    approveNoScore: "Allow (No Score)",
    confirmBlock: "Confirm Block",
    queueEmptyTitle: "No messages awaiting review",
    queueEmptyDesc: "Borderline chat and Super Chats flagged by rules or models appear here.",
    pendingBadge: "Pending",
    deadlinePrefix: "Due ",
    collapseOriginal: "Collapse text",
    expandFull: "Show full text",
    foldedSnippetNotice: "Original message body folded for current role privacy settings.",
    streamAria: "Live moderation bypass feed and pinned Super Chat bar",
    streamHeading: "Live Bypass Feed & Pinned SC",
    streamRecentCount: (n) => `${n} recent items`,
    streamEmptyTitle: "No recent stream items",
    streamEmptyDesc: "Once live messages arrive, system verdicts and delivery statuses sync here in real time.",
    viewOriginal: "Show text",
    collapseContent: "Hide text",
    deliveryFailed: "Downstream delivery failed",
    resendBtn: "Resend",
    candidatesAria: "AI candidate terms pending confirmation",
    candidatesHeading: (n) => `AI Suggested Sensitive Terms (${n})`,
    candidatesHint: "Confirmed terms enter the chosen blacklist category",
    candidatesEmptyTitle: "No pending candidate terms",
    candidatesEmptyDesc: "When models detect emerging evasion slang or obfuscated variants, suggestions appear here.",
    pendingConfirmBadge: "Needs review",
    assignCategoryLabel: "Blacklist category",
    confirmAddBlacklist: "Confirm & Blacklist",
    ignoreBtn: "Ignore",
    defaultSpamCategory: "Spam & Flooding",
  },
  "zh-CN": {
    pageTitle: "实时审核",
    pageDescription: "两栏协同处理待审队列与直播旁路流，并审核 AI 自动提取的新增敏感候选词。",
    scOn: "SC 精翻已开启",
    scOff: "SC 精翻未开启",
    tabAria: "审核工作区视图",
    queueTab: (n) => `实时审核工作台 (${n})`,
    candidatesTab: (n) => `AI 候选词待确认 (${n})`,
    classAllowScore: "恢复积分放行",
    classAllowNoScore: "不加分放行",
    classBlock: "已确认拦截",
    classDone: "处理完成",
    decidedFeedback: (l) => `已提交裁决：${l}。`,
    batchConflictFeedback: (c) => `批量处理中有 ${c} 条任务已被其他成员抢先处理，已保留冲突保护。`,
    batchDoneFeedback: (c, l) => `已批量完成 ${c} 条审核任务（${l}）。`,
    candidateConfirmed: "候选词已确认并写入对应黑名单分类词库。",
    candidateRejected: "已忽略该候选词建议。",
    resentSuccess: "已重新发起下游投屏投递。",
    conflictDefault: "该条审核任务已被其他管理员处理，请刷新队列获取最新状态。",
    conflictTitle: "审核状态并发冲突",
    refreshNow: "立即刷新",
    queueAria: "实时待审队列",
    queueHeading: (n) => `实时待审队列 (${n})`,
    selectAll: "全选",
    selectedPrefix: (n) => `已选 ${n} 项：`,
    approveWithScore: "重判放行 (恢复积分)",
    approveNoScore: "放行 (不加分)",
    confirmBlock: "确认拦截",
    queueEmptyTitle: "当前无待审核发言",
    queueEmptyDesc: "触发边界审查或模型待定的弹幕与 Super Chat 将自动进入此队列。",
    pendingBadge: "待裁决",
    deadlinePrefix: "截止 ",
    collapseOriginal: "收起原文",
    expandFull: "展开全文",
    foldedSnippetNotice: "当前角色已折叠显示敏感原文片段",
    streamAria: "审核旁路实时流与醒目留言条",
    streamHeading: "实时审核旁路流与 SC 置顶条",
    streamRecentCount: (n) => `${n} 条近期记录`,
    streamEmptyTitle: "暂无近期旁路消息",
    streamEmptyDesc: "频道进入直播状态后，系统判定的所有消息与投递回执会同步列于此处。",
    viewOriginal: "查看原文",
    collapseContent: "收起内容",
    deliveryFailed: "下游投屏投递失败",
    resendBtn: "重新投递",
    candidatesAria: "AI 候选词待确认",
    candidatesHeading: (n) => `AI 提取候选敏感词 (${n})`,
    candidatesHint: "确认后将归入所选黑名单分类",
    candidatesEmptyTitle: "暂无待确认候选词",
    candidatesEmptyDesc: "当模型发现疑似新兴黑话或绕过变形词时，会在此提交人工确认。",
    pendingConfirmBadge: "待人工确认",
    assignCategoryLabel: "归入黑名单分类",
    confirmAddBlacklist: "确认加入黑名单",
    ignoreBtn: "忽略",
    defaultSpamCategory: "垃圾刷屏",
  },
  ja: {
    pageTitle: "リアルタイム審査",
    pageDescription: "審査キューとライブバイパスストリームを2列で処理し、AI 抽出候補ワードを確認します。",
    scOn: "SC 翻訳 ON",
    scOff: "SC 翻訳 OFF",
    tabAria: "モデレーションワークベンチタブ",
    queueTab: (n) => `リアルタイム審査 (${n})`,
    candidatesTab: (n) => `AI 候補ワード確認待ち (${n})`,
    classAllowScore: "承認（スコア回復）",
    classAllowNoScore: "承認（加点なし）",
    classBlock: "ブロック確定",
    classDone: "判定完了",
    decidedFeedback: (l) => `判定を送信しました：${l}`,
    batchConflictFeedback: (c) => `一括処理のうち ${c} 件が既に他の担当者により処理済みでした。`,
    batchDoneFeedback: (c, l) => `${c} 件のタスクを一括処理しました（${l}）。`,
    candidateConfirmed: "候補ワードを承認し、選択したブラックリストカテゴリへ登録しました。",
    candidateRejected: "候補ワードの提案をスキップしました。",
    resentSuccess: "ステージ出力へ再送出しました。",
    conflictDefault: "このタスクは既に別のモデレーターによって処理されています。",
    conflictTitle: "審査競合を検出",
    refreshNow: "今すぐ更新",
    queueAria: "審査待ちキュー",
    queueHeading: (n) => `審査待ちキュー (${n})`,
    selectAll: "すべて選択",
    selectedPrefix: (n) => `${n} 件選択中：`,
    approveWithScore: "承認（スコア回復）",
    approveNoScore: "承認（加点なし）",
    confirmBlock: "ブロック確定",
    queueEmptyTitle: "審査待ちメッセージはありません",
    queueEmptyDesc: "境界判定やモデル保留となったコメントおよび Super Chat がここに表示されます。",
    pendingBadge: "判定待ち",
    deadlinePrefix: "期限 ",
    collapseOriginal: "折りたたむ",
    expandFull: "全文を表示",
    foldedSnippetNotice: "現在のロール設定により敏感な原文が折りたたまれました。",
    streamAria: "ライブバイパスストリームとピン留め SC バー",
    streamHeading: "バイパスストリーム＆SC ピン留めバー",
    streamRecentCount: (n) => `直近 ${n} 件`,
    streamEmptyTitle: "最近のバイパスメッセージはありません",
    streamEmptyDesc: "ライブ配信が開始されると判定結果と配信状況がここにリアルタイム表示されます。",
    viewOriginal: "原文を表示",
    collapseContent: "内容を閉じる",
    deliveryFailed: "下流ステージ送信失敗",
    resendBtn: "再送信",
    candidatesAria: "AI 候補ワード承認待ち",
    candidatesHeading: (n) => `AI 抽出候補ワード (${n})`,
    candidatesHint: "確定後、選択したブラックリスト分類に追加されます",
    candidatesEmptyTitle: "確認待ちの候補ワードはありません",
    candidatesEmptyDesc: "回避表現や新語を AI が検出するとここに提案が表示されます。",
    pendingConfirmBadge: "確認待ち",
    assignCategoryLabel: "ブラックリスト分類",
    confirmAddBlacklist: "承認してブラックリストへ追加",
    ignoreBtn: "無視",
    defaultSpamCategory: "スパム・連投",
  },
  ko: {
    pageTitle: "실시간 검토",
    pageDescription: "대기열과 라이브 바이패스 스트림을 함께 처리하고 AI가 추출한 신규 금지어 후보를 승인합니다.",
    scOn: "SC 번역 켜짐",
    scOff: "SC 번역 꺼짐",
    tabAria: "검토 작업 영역 탭",
    queueTab: (n) => `실시간 검토 작업대 (${n})`,
    candidatesTab: (n) => `AI 후보 용어 확인 (${n})`,
    classAllowScore: "허용 (점수 복구)",
    classAllowNoScore: "허용 (가점 없음)",
    classBlock: "차단 확정",
    classDone: "처리 완료",
    decidedFeedback: (l) => `판정을 제출했습니다: ${l}`,
    batchConflictFeedback: (c) => `일괄 처리 중 ${c}건이 다른 관리자에 의해 먼저 처리되어 충돌을 보호했습니다.`,
    batchDoneFeedback: (c, l) => `${c}건의 검토 작업을 일괄 처리했습니다 (${l}).`,
    candidateConfirmed: "후보 용어를 승인하여 선택한 블랙리스트 분류에 저장했습니다.",
    candidateRejected: "후보 용어 제안을 무시했습니다.",
    resentSuccess: "하위 스테이지로 재송출을 요청했습니다.",
    conflictDefault: "이 검토 작업은 이미 다른 관리자가 처리했습니다. 새로고침하세요.",
    conflictTitle: "동시 검토 충돌 감지",
    refreshNow: "지금 새로고침",
    queueAria: "실시간 대기열",
    queueHeading: (n) => `실시간 대기열 (${n})`,
    selectAll: "전체 선택",
    selectedPrefix: (n) => `${n}개 선택됨:`,
    approveWithScore: "재판정 허용 (점수 복구)",
    approveNoScore: "허용 (가점 없음)",
    confirmBlock: "차단 확정",
    queueEmptyTitle: "대기 중인 발언이 없습니다",
    queueEmptyDesc: "경계 검토나 모델 보류로 분류된 채팅과 Super Chat이 여기에 표시됩니다.",
    pendingBadge: "판정 대기",
    deadlinePrefix: "마감 ",
    collapseOriginal: "원문 접기",
    expandFull: "전체 보기",
    foldedSnippetNotice: "현재 역할의 개인정보 보호 정책으로 민감 원문이 접혀 있습니다.",
    streamAria: "실시간 바이패스 스트림 및 SC 상단 바",
    streamHeading: "실시간 바이패스 스트림 및 SC 상단 바",
    streamRecentCount: (n) => `최근 ${n}건`,
    streamEmptyTitle: "최근 바이패스 메시지가 없습니다",
    streamEmptyDesc: "방송이 시작되면 판정 결과와 전송 상태가 실시간으로 표시됩니다.",
    viewOriginal: "원문 보기",
    collapseContent: "내용 접기",
    deliveryFailed: "하위 송출 실패",
    resendBtn: "재전송",
    candidatesAria: "AI 후보 용어 확인",
    candidatesHeading: (n) => `AI 추출 후보 금지어 (${n})`,
    candidatesHint: "확정 시 선택한 블랙리스트 분류에 추가됩니다",
    candidatesEmptyTitle: "확인 대기 중인 후보 용어가 없습니다",
    candidatesEmptyDesc: "우회 표현이나 신조어가 감지되면 여기에 제안이 표시됩니다.",
    pendingConfirmBadge: "수동 확인 대기",
    assignCategoryLabel: "블랙리스트 분류",
    confirmAddBlacklist: "승인 및 블랙리스트 추가",
    ignoreBtn: "무시",
    defaultSpamCategory: "스팸/도배",
  },
  fr: {
    pageTitle: "Modération en direct",
    pageDescription: "Traitez la file d'attente avec le flux direct et validez les termes suggérés par l'IA.",
    scOn: "Traduction SC activée",
    scOff: "Traduction SC désactivée",
    tabAria: "Vues de modération",
    queueTab: (n) => `File en direct (${n})`,
    candidatesTab: (n) => `Termes IA suggérés (${n})`,
    classAllowScore: "Autoriser (+ score)",
    classAllowNoScore: "Autoriser (sans point)",
    classBlock: "Bloqué confirmé",
    classDone: "Traité",
    decidedFeedback: (l) => `Décision enregistrée : ${l}.`,
    batchConflictFeedback: (c) => `${c} élément(s) déjà traités par un autre modérateur ; conflit évité.`,
    batchDoneFeedback: (c, l) => `${c} éléments traités par lot (${l}).`,
    candidateConfirmed: "Terme confirmé et ajouté à la catégorie liste noire choisie.",
    candidateRejected: "Suggestion ignorée.",
    resentSuccess: "Nouvel envoi vers la sortie effectué.",
    conflictDefault: "Cette tâche a déjà été traitée par un autre modérateur.",
    conflictTitle: "Conflit de modération",
    refreshNow: "Actualiser",
    queueAria: "File d'attente de modération",
    queueHeading: (n) => `File en attente (${n})`,
    selectAll: "Tout sélectionner",
    selectedPrefix: (n) => `${n} sélectionnés :`,
    approveWithScore: "Autoriser (score)",
    approveNoScore: "Autoriser (sans point)",
    confirmBlock: "Confirmer blocage",
    queueEmptyTitle: "Aucun message en attente",
    queueEmptyDesc: "Les messages ambigus et Super Chats signalés apparaissent ici automatiquement.",
    pendingBadge: "En attente",
    deadlinePrefix: "Échéance ",
    collapseOriginal: "Réduire",
    expandFull: "Voir tout",
    foldedSnippetNotice: "Texte original masqué selon vos permissions.",
    streamAria: "Flux direct et barre Super Chat épinglée",
    streamHeading: "Flux direct & SC épinglés",
    streamRecentCount: (n) => `${n} récents`,
    streamEmptyTitle: "Aucun message récent",
    streamEmptyDesc: "Dès l'arrivée de messages, les décisions et statuts s'affichent ici.",
    viewOriginal: "Voir l'original",
    collapseContent: "Masquer",
    deliveryFailed: "Échec d'envoi aval",
    resendBtn: "Renvoyer",
    candidatesAria: "Termes IA en attente de validation",
    candidatesHeading: (n) => `Termes sensibles suggérés (${n})`,
    candidatesHint: "Les termes confirmés rejoignent la liste noire sélectionnée",
    candidatesEmptyTitle: "Aucun terme suggéré",
    candidatesEmptyDesc: "Les nouveaux contournements détectés par l'IA s'afficheront ici.",
    pendingConfirmBadge: "À valider",
    assignCategoryLabel: "Catégorie liste noire",
    confirmAddBlacklist: "Confirmer & bloquer",
    ignoreBtn: "Ignorer",
    defaultSpamCategory: "Spam & Publicité",
  },
};

export interface BlockedCopy {
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly tabsAria: string;
  readonly recordsTab: (n: number) => string;
  readonly usersTab: (n: number) => string;
  readonly loadFailedCode: (code: string) => string;
  readonly loadFailed: string;
  readonly rejudgeSynced: string;
  readonly rejudgeScoreOnly: (restore: boolean) => string;
  readonly rejudgeFailedCode: (code: string) => string;
  readonly rejudgeFailed: string;
  readonly userAddedSuccess: string;
  readonly userAddFailedCode: (code: string) => string;
  readonly userAddFailed: string;
  readonly userRemovedSuccess: (restoredScore: boolean) => string;
  readonly userRemoveFailedCode: (code: string) => string;
  readonly userRemoveFailed: string;
  readonly searchAria: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly scoreOnlyGuidance: string;
  readonly emptyRecordsTitle: string;
  readonly emptyRecordsDesc: string;
  readonly blockedBadge: string;
  readonly collapseOriginal: string;
  readonly viewOriginal: string;
  readonly approveWithScore: string;
  readonly approveNoScore: string;
  readonly usersAria: string;
  readonly bannedUsersHeading: (n: number) => string;
  readonly cancelAddBtn: string;
  readonly addManualBtn: string;
  readonly addFormAria: string;
  readonly addFormTitle: string;
  readonly subjectRefLabel: string;
  readonly subjectRefPlaceholder: string;
  readonly nicknameLabel: string;
  readonly nicknamePlaceholder: string;
  readonly reasonLabel: string;
  readonly reasonPlaceholder: string;
  readonly confirmAddBtn: string;
  readonly tableLabel: string;
  readonly colSubjectRef: string;
  readonly colNickname: string;
  readonly colReason: string;
  readonly colCreatedAt: string;
  readonly colActions: string;
  readonly noNickname: string;
  readonly noReason: string;
  readonly removeBtn: string;
  readonly emptyUsersTitle: string;
  readonly emptyUsersDesc: string;
  readonly dialogTitle: string;
  readonly dialogPrefix: string;
  readonly dialogSuffix: string;
  readonly restoreScoreLabel: string;
  readonly dialogConfirmBtn: string;
  readonly dialogCancelBtn: string;
}

export const BLOCKED_COPY: Readonly<Record<VoxWardLocale, BlockedCopy>> = {
  en: {
    pageTitle: "Blocked Management",
    pageDescription: "Rejudge blocked records (score-only, never re-emitted to stage outputs) and manage manual channel blocklist users.",
    tabsAria: "Blocked management view tabs",
    recordsTab: (n) => `Confirmed Blocked Records (${n})`,
    usersTab: (n) => `Blocklist Users (${n})`,
    loadFailedCode: (c) => `Failed to load blocked records (${c})`,
    loadFailed: "Unable to load blocked records.",
    rejudgeSynced: "Rejudgement complete and state synced.",
    rejudgeScoreOnly: (r) =>
      `Score rejudged (${r ? "viewer score restored" : "no score change"}); historical blocked chat is never re-emitted to OBS or Danmaku Dock.`,
    rejudgeFailedCode: (c) => `Score rejudgement failed (${c})`,
    rejudgeFailed: "Score rejudgement failed.",
    userAddedSuccess: "Added viewer to the channel manual blocklist.",
    userAddFailedCode: (c) => `Failed to add blocked user (${c})`,
    userAddFailed: "Failed to add blocked user.",
    userRemovedSuccess: (r) =>
      r ? "Removed user from blocklist and restored base trust score." : "Removed user from blocklist.",
    userRemoveFailedCode: (c) => `Failed to unblock user (${c})`,
    userRemoveFailed: "Failed to remove user from blocklist.",
    searchAria: "Filter blocked records",
    searchLabel: "Search viewer or blocked text",
    searchPlaceholder: "Filter by viewer ID or message excerpt…",
    scoreOnlyGuidance:
      "Note: Score-only rejudgement updates trust scores and rule stats without re-sending old blocked messages to OBS overlays or Pure Danmaku Dock.",
    emptyRecordsTitle: "No matching blocked records",
    emptyRecordsDesc: "No confirmed blocked messages in this channel yet, or nothing matched your search.",
    blockedBadge: "Blocked",
    collapseOriginal: "Hide text",
    viewOriginal: "Show text",
    approveWithScore: "Allow (Restore Score)",
    approveNoScore: "Allow (No Score)",
    usersAria: "Blocklist users",
    bannedUsersHeading: (n) => `Blocked Users (${n})`,
    cancelAddBtn: "Cancel",
    addManualBtn: "+ Add to Blocklist",
    addFormAria: "Add user to blocklist",
    addFormTitle: "Manually Add Viewer to Channel Blocklist",
    subjectRefLabel: "Viewer ID",
    subjectRefPlaceholder: "e.g., viewer-1024",
    nicknameLabel: "Display note (optional)",
    nicknamePlaceholder: "Label for moderators",
    reasonLabel: "Reason",
    reasonPlaceholder: "Repeated spam links / abuse",
    confirmAddBtn: "Confirm Block",
    tableLabel: "Channel blocklist table",
    colSubjectRef: "Viewer ID",
    colNickname: "Note",
    colReason: "Reason",
    colCreatedAt: "Added At",
    colActions: "Actions",
    noNickname: "No note",
    noReason: "No reason",
    removeBtn: "Unblock",
    emptyUsersTitle: "Blocklist is empty",
    emptyUsersDesc: "Manually blocked viewers appear here and can be unblocked with optional base score restoration.",
    dialogTitle: "Confirm Unblock User",
    dialogPrefix: "Remove viewer ",
    dialogSuffix: " from the channel blocklist?",
    restoreScoreLabel: "Also restore baseline trust score",
    dialogConfirmBtn: "Confirm Unblock",
    dialogCancelBtn: "Cancel",
  },
  "zh-CN": {
    pageTitle: "拦截管理",
    pageDescription: "复核已拦截消息并按需修正用户信任积分（不重发投屏），并管理频道人工黑名单用户。",
    tabsAria: "拦截管理视图切换",
    recordsTab: (n) => `已确认拦截记录 (${n})`,
    usersTab: (n) => `黑名单用户管理 (${n})`,
    loadFailedCode: (c) => `加载失败 (${c})`,
    loadFailed: "无法获取拦截记录列表。",
    rejudgeSynced: "已完成重判并同步更新状态。",
    rejudgeScoreOnly: (r) =>
      `已完成评分重判（${r ? "恢复用户积分" : "仅改判不加分"}），绝不会重新发送历史发言到 OBS 投屏或纯净弹幕姬。`,
    rejudgeFailedCode: (c) => `评分重判失败 (${c})`,
    rejudgeFailed: "评分重判失败。",
    userAddedSuccess: "已将该观众加入本地黑名单管理列表。",
    userAddFailedCode: (c) => `添加黑名单失败 (${c})`,
    userAddFailed: "添加黑名单失败。",
    userRemovedSuccess: (r) => `已移出黑名单${r ? "，并已恢复基础信任分" : ""}。`,
    userRemoveFailedCode: (c) => `移出黑名单失败 (${c})`,
    userRemoveFailed: "移出黑名单失败。",
    searchAria: "拦截记录筛选",
    searchLabel: "搜索观众或拦截文本",
    searchPlaceholder: "按观众标识或发言片段过滤…",
    scoreOnlyGuidance:
      "说明：评分重判只校准观众信任分与规则统计，不会把历史已拦截发言重新发送到 OBS 投屏或纯净弹幕姬。",
    emptyRecordsTitle: "没有匹配的拦截记录",
    emptyRecordsDesc: "频道暂无被确认拦截的消息，或当前过滤条件未命中任何条目。",
    blockedBadge: "已拦截",
    collapseOriginal: "收起原文",
    viewOriginal: "查看原文",
    approveWithScore: "重判放行 (恢复积分)",
    approveNoScore: "放行 (不加分)",
    usersAria: "黑名单用户列表",
    bannedUsersHeading: (n) => `已封禁用户 (${n})`,
    cancelAddBtn: "取消新增",
    addManualBtn: "+ 手动加入黑名单",
    addFormAria: "添加黑名单用户",
    addFormTitle: "手动加入频道黑名单",
    subjectRefLabel: "观众标识",
    subjectRefPlaceholder: "例如：viewer-1024",
    nicknameLabel: "备注昵称（可选）",
    nicknamePlaceholder: "方便人工识别的备注",
    reasonLabel: "拉黑原因",
    reasonPlaceholder: "连续恶意刷屏 / 外链骚扰",
    confirmAddBtn: "确认加入",
    tableLabel: "黑名单用户管理表",
    colSubjectRef: "观众标识",
    colNickname: "备注昵称",
    colReason: "拉黑原因",
    colCreatedAt: "加入时间",
    colActions: "操作",
    noNickname: "未填备注",
    noReason: "无说明",
    removeBtn: "移除黑名单",
    emptyUsersTitle: "黑名单用户列表为空",
    emptyUsersDesc: "手动加入频道黑名单的观众将显示在此，支持随时移出并恢复信任积分。",
    dialogTitle: "移出黑名单确认",
    dialogPrefix: "确定将观众 ",
    dialogSuffix: " 移出黑名单吗？",
    restoreScoreLabel: "同时恢复基础信任分",
    dialogConfirmBtn: "确认移出",
    dialogCancelBtn: "取消",
  },
  ja: {
    pageTitle: "ブロック管理",
    pageDescription: "ブロック済みメッセージのスコア再判定（ステージへは再送出されません）と手動ブラックリストを管理します。",
    tabsAria: "ブロック管理ビュー切替",
    recordsTab: (n) => `確定済みブロック (${n})`,
    usersTab: (n) => `ブラックリスト (${n})`,
    loadFailedCode: (c) => `読み込みに失敗しました (${c})`,
    loadFailed: "ブロック履歴を取得できませんでした。",
    rejudgeSynced: "再判定が完了し状態を同期しました。",
    rejudgeScoreOnly: (r) =>
      `スコア再判定を実行しました（${r ? "スコアを回復" : "加点なし"}）。過去のブロック発言が OBS やコメントビューへ再送出されることはありません。`,
    rejudgeFailedCode: (c) => `スコア再判定に失敗しました (${c})`,
    rejudgeFailed: "スコア再判定に失敗しました。",
    userAddedSuccess: "視聴者をローカルブラックリストへ追加しました。",
    userAddFailedCode: (c) => `ブラックリスト追加に失敗しました (${c})`,
    userAddFailed: "ブラックリストへの追加に失敗しました。",
    userRemovedSuccess: (r) =>
      r ? "ブラックリストから解除し、基本信頼スコアを回復しました。" : "ブラックリストから解除しました。",
    userRemoveFailedCode: (c) => `解除に失敗しました (${c})`,
    userRemoveFailed: "ブラックリスト解除に失敗しました。",
    searchAria: "ブロック履歴検索",
    searchLabel: "視聴者 ID または本文を検索",
    searchPlaceholder: "視聴者識別子や本文の一部で絞り込み…",
    scoreOnlyGuidance:
      "説明：スコア再判定は信頼スコアとルール統計のみを補正し、過去のブロック発言を OBS 等へ再送出することはありません。",
    emptyRecordsTitle: "該当するブロック履歴がありません",
    emptyRecordsDesc: "確定済みブロックメッセージがないか、検索条件に一致しませんでした。",
    blockedBadge: "ブロック済",
    collapseOriginal: "原文を閉じる",
    viewOriginal: "原文を表示",
    approveWithScore: "再判定承認（スコア回復）",
    approveNoScore: "承認（加点なし）",
    usersAria: "ブラックリスト登録ユーザー",
    bannedUsersHeading: (n) => `ブロック済みユーザー (${n})`,
    cancelAddBtn: "キャンセル",
    addManualBtn: "+ 手動でブラックリスト追加",
    addFormAria: "ブラックリスト追加フォーム",
    addFormTitle: "チャンネルブラックリストに手動追加",
    subjectRefLabel: "視聴者 ID",
    subjectRefPlaceholder: "例：viewer-1024",
    nicknameLabel: "メモ名（任意）",
    nicknamePlaceholder: "識別用の表示メモ",
    reasonLabel: "理由",
    reasonPlaceholder: "連続スパム・迷惑リンク投稿",
    confirmAddBtn: "追加を確定",
    tableLabel: "ブラックリスト一覧",
    colSubjectRef: "視聴者 ID",
    colNickname: "メモ",
    colReason: "理由",
    colCreatedAt: "追加日時",
    colActions: "操作",
    noNickname: "メモなし",
    noReason: "理由なし",
    removeBtn: "解除",
    emptyUsersTitle: "ブラックリストは空です",
    emptyUsersDesc: "手動でブラックリストに追加された視聴者がここに表示されます。",
    dialogTitle: "ブラックリスト解除の確認",
    dialogPrefix: "視聴者 ",
    dialogSuffix: " をブラックリストから解除しますか？",
    restoreScoreLabel: "同時に基本信頼スコアを回復する",
    dialogConfirmBtn: "解除する",
    dialogCancelBtn: "キャンセル",
  },
  ko: {
    pageTitle: "차단 관리",
    pageDescription: "차단된 기록의 신뢰 점수를 재판정(스테이지 재송출 없음)하고 수동 차단 사용자를 관리합니다.",
    tabsAria: "차단 관리 뷰 전환",
    recordsTab: (n) => `확정된 차단 기록 (${n})`,
    usersTab: (n) => `차단 사용자 관리 (${n})`,
    loadFailedCode: (c) => `불러오기 실패 (${c})`,
    loadFailed: "차단 기록을 불러올 수 없습니다.",
    rejudgeSynced: "재판정이 완료되고 상태가 동기화되었습니다.",
    rejudgeScoreOnly: (r) =>
      `점수 재판정 완료(${r ? "신뢰 점수 복구" : "가점 없이 허용"}). 과거 차단 메시지는 OBS나 채팅 독으로 절대 재송출되지 않습니다.`,
    rejudgeFailedCode: (c) => `점수 재판정 실패 (${c})`,
    rejudgeFailed: "점수 재판정에 실패했습니다.",
    userAddedSuccess: "채널 수동 블랙리스트에 시청자를 추가했습니다.",
    userAddFailedCode: (c) => `블랙리스트 추가 실패 (${c})`,
    userAddFailed: "블랙리스트 추가에 실패했습니다.",
    userRemovedSuccess: (r) =>
      r ? "블랙리스트에서 해제하고 기본 신뢰 점수를 복구했습니다." : "블랙리스트에서 해제했습니다.",
    userRemoveFailedCode: (c) => `블랙리스트 해제 실패 (${c})`,
    userRemoveFailed: "블랙리스트 해제에 실패했습니다.",
    searchAria: "차단 기록 필터",
    searchLabel: "시청자 또는 차단 문구 검색",
    searchPlaceholder: "시청자 ID 또는 메시지 일부로 검색…",
    scoreOnlyGuidance:
      "안내: 점수 재판정은 신뢰 점수 및 통계만 보정하며, 이미 차단된 과거 메시지를 OBS 오버레이나 클린 채팅 독으로 재전송하지 않습니다.",
    emptyRecordsTitle: "일치하는 차단 기록이 없습니다",
    emptyRecordsDesc: "확정된 차단 메시지가 없거나 검색 조건과 일치하는 항목이 없습니다.",
    blockedBadge: "차단됨",
    collapseOriginal: "원문 접기",
    viewOriginal: "원문 보기",
    approveWithScore: "재판정 허용 (점수 복구)",
    approveNoScore: "허용 (가점 없음)",
    usersAria: "차단 사용자 목록",
    bannedUsersHeading: (n) => `차단된 사용자 (${n})`,
    cancelAddBtn: "추가 취소",
    addManualBtn: "+ 수동 블랙리스트 추가",
    addFormAria: "차단 사용자 추가",
    addFormTitle: "수동 채널 블랙리스트 등록",
    subjectRefLabel: "시청자 ID",
    subjectRefPlaceholder: "예: viewer-1024",
    nicknameLabel: "별칭 메모 (선택)",
    nicknamePlaceholder: "식별용 메모",
    reasonLabel: "차단 사유",
    reasonPlaceholder: "반복 광고 도배 / 악성 링크",
    confirmAddBtn: "추가 확정",
    tableLabel: "차단 사용자 관리 표",
    colSubjectRef: "시청자 ID",
    colNickname: "별칭",
    colReason: "사유",
    colCreatedAt: "등록 시각",
    colActions: "작업",
    noNickname: "메모 없음",
    noReason: "사유 없음",
    removeBtn: "차단 해제",
    emptyUsersTitle: "차단된 사용자가 없습니다",
    emptyUsersDesc: "수동으로 추가한 블랙리스트 시청자가 여기에 표시되며 언제든 해제할 수 있습니다.",
    dialogTitle: "차단 해제 확인",
    dialogPrefix: "시청자 ",
    dialogSuffix: " 님을 블랙리스트에서 해제하시겠습니까?",
    restoreScoreLabel: "기본 신뢰 점수도 함께 복구",
    dialogConfirmBtn: "해제 확인",
    dialogCancelBtn: "취소",
  },
  fr: {
    pageTitle: "Gestion des blocages",
    pageDescription: "Réévaluez les messages bloqués (score uniquement, jamais réémis) et gérez la liste noire manuelle.",
    tabsAria: "Vues des blocages",
    recordsTab: (n) => `Messages bloqués (${n})`,
    usersTab: (n) => `Liste noire (${n})`,
    loadFailedCode: (c) => `Échec du chargement (${c})`,
    loadFailed: "Impossible de charger les messages bloqués.",
    rejudgeSynced: "Réévaluation terminée et synchronisée.",
    rejudgeScoreOnly: (r) =>
      `Score réévalué (${r ? "score restauré" : "sans gain"}) ; l'historique bloqué n'est jamais réémis vers OBS ou le Dock.`,
    rejudgeFailedCode: (c) => `Échec réévaluation (${c})`,
    rejudgeFailed: "Échec de la réévaluation du score.",
    userAddedSuccess: "Spectateur ajouté à la liste noire locale.",
    userAddFailedCode: (c) => `Échec d'ajout (${c})`,
    userAddFailed: "Impossible d'ajouter à la liste noire.",
    userRemovedSuccess: (r) =>
      r ? "Retiré de la liste noire et score de base restauré." : "Retiré de la liste noire.",
    userRemoveFailedCode: (c) => `Échec du retrait (${c})`,
    userRemoveFailed: "Impossible de retirer de la liste noire.",
    searchAria: "Filtrer les blocages",
    searchLabel: "Rechercher spectateur ou texte",
    searchPlaceholder: "Filtrer par identifiant ou extrait…",
    scoreOnlyGuidance:
      "Note : la réévaluation ajuste uniquement le score de confiance et les statistiques, sans renvoyer d'anciens messages vers OBS.",
    emptyRecordsTitle: "Aucun blocage correspondant",
    emptyRecordsDesc: "Aucun message bloqué confirmé ou aucun résultat pour ce filtre.",
    blockedBadge: "Bloqué",
    collapseOriginal: "Masquer",
    viewOriginal: "Voir le texte",
    approveWithScore: "Autoriser (+ score)",
    approveNoScore: "Autoriser (sans point)",
    usersAria: "Utilisateurs bloqués",
    bannedUsersHeading: (n) => `Utilisateurs bloqués (${n})`,
    cancelAddBtn: "Annuler",
    addManualBtn: "+ Ajouter manuellement",
    addFormAria: "Ajouter à la liste noire",
    addFormTitle: "Ajouter un spectateur à la liste noire",
    subjectRefLabel: "Identifiant",
    subjectRefPlaceholder: "ex. : viewer-1024",
    nicknameLabel: "Note (optionnel)",
    nicknamePlaceholder: "Libellé pour l'équipe",
    reasonLabel: "Motif",
    reasonPlaceholder: "Liens spam répétés / abus",
    confirmAddBtn: "Confirmer l'ajout",
    tableLabel: "Tableau de la liste noire",
    colSubjectRef: "Identifiant",
    colNickname: "Note",
    colReason: "Motif",
    colCreatedAt: "Ajouté le",
    colActions: "Actions",
    noNickname: "Sans note",
    noReason: "Sans motif",
    removeBtn: "Débloquer",
    emptyUsersTitle: "Liste noire vide",
    emptyUsersDesc: "Les spectateurs bloqués manuellement apparaissent ici.",
    dialogTitle: "Confirmer le déblocage",
    dialogPrefix: "Retirer ",
    dialogSuffix: " de la liste noire de la chaîne ?",
    restoreScoreLabel: "Restaurer aussi le score de base",
    dialogConfirmBtn: "Confirmer",
    dialogCancelBtn: "Annuler",
  },
};
