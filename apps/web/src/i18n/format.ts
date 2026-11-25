import type { ChangeSummaryCode, ChangeSummaryParams } from "@voxward/contracts";
import type { VoxWardLocale } from "./types";

export const ADAPTER_STATUS_CODES = [
  "CONFIG_SAVED",
  "ACTION_EXECUTED",
  "OBS_OVERLAY_READY",
  "NATIVE_OUTPUT_READY",
  "MODELS_FETCHED",
] as const;
export type AdapterStatusCode = (typeof ADAPTER_STATUS_CODES)[number];

export type BuiltInCategoryCode = "spam" | "abuse" | "sensitive" | "friendly";
export type BuiltInRoleId = "role-owner" | "role-moderator" | "role-data-admin" | "role-auditor";
export type BuiltInDriverId =
  | "youtube-live-v3"
  | "kiro-cli"
  | "openai-compat"
  | "anthropic-compat"
  | "obs-overlay-source"
  | "native-readonly-protocol";
export type BuiltInAdapterAction =
  | "test-connection"
  | "reauthorize"
  | "restart-ingest"
  | "cli-self-check"
  | "cleanup-orphans"
  | "fetch-models"
  | "issue-output-token"
  | "issue-output-grant";

export const CHANGE_SUMMARY_TEMPLATES: Readonly<Record<VoxWardLocale, Readonly<Record<ChangeSummaryCode, string>>>> = {
  en: {
    MANUAL_VERDICT_DECIDED: "Manual verdict: {downstream}",
    MANUAL_VERDICT_OVERTURNED: "Overturned verdict: {before} -> {after}",
    MANUAL_RESEND_QUEUED: "Manual resend: queued expired message for redelivery",
    SCORE_ADJUSTED: "Score adjustment: {kind}",
    LIST_ENTRY_ADDED: "List update: added to {listKind}",
    LIST_ENTRY_REMOVED: "List update: removed from list",
    TERM_CANDIDATE_CONFIRMED: "Wordlist update: confirmed candidate terms",
    TERM_LIST_PUBLISHED: "Wordlist update: published version v{version}",
    TERM_ADDED: "Wordlist update: added term entry",
    TERM_DISABLED: "Wordlist update: disabled term entry",
    DATA_REQUEST_REGISTERED: "Data request registered ({kind}, mode: {mode}, request: {requestId})",
    DATA_REQUEST_VERIFIED: "Data request verification: {verdict} (method: {method}, request: {requestId})",
    DATA_REQUEST_DELETION_STARTED: "Data deletion started (mode: {mode}, request: {requestId})",
    DATA_REQUEST_DELETION_FINISHED: "Data deletion finished ({state}, request: {requestId})",
    CONTROLLED_MATERIAL_GENERATED: "Controlled compliance material generated ({kind}, request: {requestId})",
    SCORE_EXCEPTION_ENROLLED: "Scoring exception enrolled ({purpose}, request: {requestId})",
    SCORE_EXCEPTION_RESUMED: "Scoring resumed after exception review (request: {requestId})",
    DATA_REQUEST_CERTIFICATE: "Data request deletion certificate (content cleared)",
    SANDBOX_RESET: "Sandbox reset: deterministic baseline initialized",
    SANDBOX_EVENT_PROCESSED: "Sandbox event ({classification}, scenario: {scenario}, subject: {subject})",
    SANDBOX_PRIVACY_REQUEST: "Sandbox privacy request ({mode}, subject: {subject})",
  },
  "zh-CN": {
    MANUAL_VERDICT_DECIDED: "人工裁决：{downstream}",
    MANUAL_VERDICT_OVERTURNED: "复核改判：{before} -> {after}",
    MANUAL_RESEND_QUEUED: "人工补发：过期消息已重新入队投递",
    SCORE_ADJUSTED: "计分调整：{kind}",
    LIST_ENTRY_ADDED: "名单变更：加入{listKind}",
    LIST_ENTRY_REMOVED: "名单变更：移出名单",
    TERM_CANDIDATE_CONFIRMED: "词条变更：确认候选词条入库",
    TERM_LIST_PUBLISHED: "词条变更：已发布词表版本 v{version}",
    TERM_ADDED: "词条变更：词条入库",
    TERM_DISABLED: "词条变更：词条停用",
    DATA_REQUEST_REGISTERED: "数据请求已登记（类型：{kind}，模式：{mode}，请求：{requestId}）",
    DATA_REQUEST_VERIFIED: "数据请求核验：{verdict}（方式：{method}，请求：{requestId}）",
    DATA_REQUEST_DELETION_STARTED: "数据删除已启动（模式：{mode}，请求：{requestId}）",
    DATA_REQUEST_DELETION_FINISHED: "数据删除执行结束（状态：{state}，请求：{requestId}）",
    CONTROLLED_MATERIAL_GENERATED: "已生成受控合规说明材料（类型：{kind}，请求：{requestId}）",
    SCORE_EXCEPTION_ENROLLED: "记分例外已加入（{purpose}），请求 {requestId}",
    SCORE_EXCEPTION_RESUMED: "记分例外已恢复计分，请求 {requestId}",
    DATA_REQUEST_CERTIFICATE: "数据删除处理凭证（受控正文已清除）",
    SANDBOX_RESET: "沙盒重置：已恢复确定性基准状态",
    SANDBOX_EVENT_PROCESSED: "沙盒事件处理（{classification}，剧本：{scenario}，主体：{subject}）",
    SANDBOX_PRIVACY_REQUEST: "沙盒隐私请求（{mode}，主体：{subject}）",
  },
  ja: {
    MANUAL_VERDICT_DECIDED: "手動判定：{downstream}",
    MANUAL_VERDICT_OVERTURNED: "再審判定変更：{before} -> {after}",
    MANUAL_RESEND_QUEUED: "手動再送：期限切れメッセージを再配信キューへ登録",
    SCORE_ADJUSTED: "スコア調整：{kind}",
    LIST_ENTRY_ADDED: "リスト変更：{listKind}へ追加",
    LIST_ENTRY_REMOVED: "リスト変更：リストから解除",
    TERM_CANDIDATE_CONFIRMED: "用語変更：候補用語を確定登録",
    TERM_LIST_PUBLISHED: "用語変更：用語リスト v{version} を公開",
    TERM_ADDED: "用語変更：用語を登録",
    TERM_DISABLED: "用語変更：用語を無効化",
    DATA_REQUEST_REGISTERED: "データ申請を登録（種別：{kind}、モード：{mode}、申請：{requestId}）",
    DATA_REQUEST_VERIFIED: "データ申請確認：{verdict}（方法：{method}、申請：{requestId}）",
    DATA_REQUEST_DELETION_STARTED: "データ削除を開始（モード：{mode}、申請：{requestId}）",
    DATA_REQUEST_DELETION_FINISHED: "データ削除処理完了（状態：{state}、申請：{requestId}）",
    CONTROLLED_MATERIAL_GENERATED: "統制コンプライアンス資料を生成（種別：{kind}、申請：{requestId}）",
    SCORE_EXCEPTION_ENROLLED: "スコアリング例外を適用（{purpose}、申請：{requestId}）",
    SCORE_EXCEPTION_RESUMED: "例外解除によりスコアリングを再開（申請：{requestId}）",
    DATA_REQUEST_CERTIFICATE: "データ削除処理証明書（対象本文を消去済み）",
    SANDBOX_RESET: "サンドボックスリセット：決定論的ベースラインを初期化",
    SANDBOX_EVENT_PROCESSED: "サンドボックスイベント（{classification}、シナリオ：{scenario}、対象：{subject}）",
    SANDBOX_PRIVACY_REQUEST: "サンドボックスプライバシー申請（{mode}、対象：{subject}）",
  },
  ko: {
    MANUAL_VERDICT_DECIDED: "수동 판정: {downstream}",
    MANUAL_VERDICT_OVERTURNED: "재심 판정 변경: {before} -> {after}",
    MANUAL_RESEND_QUEUED: "수동 재전송: 만료된 메시지를 재전송 대기열에 등록",
    SCORE_ADJUSTED: "점수 조정: {kind}",
    LIST_ENTRY_ADDED: "목록 변경: {listKind}에 추가",
    LIST_ENTRY_REMOVED: "목록 변경: 목록에서 제거",
    TERM_CANDIDATE_CONFIRMED: "용어 변경: 후보 용어 확정 등록",
    TERM_LIST_PUBLISHED: "용어 변경: 용어 목록 v{version} 게시",
    TERM_ADDED: "용어 변경: 용어 추가",
    TERM_DISABLED: "용어 변경: 용어 비활성화",
    DATA_REQUEST_REGISTERED: "데이터 요청 등록(유형: {kind}, 모드: {mode}, 요청: {requestId})",
    DATA_REQUEST_VERIFIED: "데이터 요청 검증: {verdict} (방식: {method}, 요청: {requestId})",
    DATA_REQUEST_DELETION_STARTED: "데이터 삭제 시작(모드: {mode}, 요청: {requestId})",
    DATA_REQUEST_DELETION_FINISHED: "데이터 삭제 완료(상태: {state}, 요청: {requestId})",
    CONTROLLED_MATERIAL_GENERATED: "통제 컴플라이언스 자료 생성({kind}, 요청: {requestId})",
    SCORE_EXCEPTION_ENROLLED: "점수 예외 등록({purpose}, 요청: {requestId})",
    SCORE_EXCEPTION_RESUMED: "예외 해제로 점수 산정 재개(요청: {requestId})",
    DATA_REQUEST_CERTIFICATE: "데이터 삭제 처리 증명(제어된 본문 삭제됨)",
    SANDBOX_RESET: "샌드박스 초기화: 결정적 기준 상태 복원",
    SANDBOX_EVENT_PROCESSED: "샌드박스 이벤트({classification}, 시나리오: {scenario}, 대상: {subject})",
    SANDBOX_PRIVACY_REQUEST: "샌드박스 개인정보 요청({mode}, 대상: {subject})",
  },
  fr: {
    MANUAL_VERDICT_DECIDED: "Verdict manuel : {downstream}",
    MANUAL_VERDICT_OVERTURNED: "Verdict infirmé : {before} -> {after}",
    MANUAL_RESEND_QUEUED: "Renvoi manuel : message expiré remis en file",
    SCORE_ADJUSTED: "Ajustement de score : {kind}",
    LIST_ENTRY_ADDED: "Liste modifiée : ajouté à {listKind}",
    LIST_ENTRY_REMOVED: "Liste modifiée : retiré de la liste",
    TERM_CANDIDATE_CONFIRMED: "Lexique : termes candidats confirmés",
    TERM_LIST_PUBLISHED: "Lexique : version v{version} publiée",
    TERM_ADDED: "Lexique : terme ajouté",
    TERM_DISABLED: "Lexique : terme désactivé",
    DATA_REQUEST_REGISTERED: "Demande de données enregistrée ({kind}, mode : {mode}, id : {requestId})",
    DATA_REQUEST_VERIFIED: "Vérification demande : {verdict} (méthode : {method}, id : {requestId})",
    DATA_REQUEST_DELETION_STARTED: "Suppression démarrée (mode : {mode}, id : {requestId})",
    DATA_REQUEST_DELETION_FINISHED: "Suppression terminée ({state}, id : {requestId})",
    CONTROLLED_MATERIAL_GENERATED: "Rapport contrôlé généré ({kind}, id : {requestId})",
    SCORE_EXCEPTION_ENROLLED: "Exception de score activée ({purpose}, id : {requestId})",
    SCORE_EXCEPTION_RESUMED: "Score réactivé après exception (id : {requestId})",
    DATA_REQUEST_CERTIFICATE: "Certificat de suppression (contenu effacé)",
    SANDBOX_RESET: "Bac à sable réinitialisé : état de référence restauré",
    SANDBOX_EVENT_PROCESSED: "Événement bac à sable ({classification}, scénario : {scenario}, sujet : {subject})",
    SANDBOX_PRIVACY_REQUEST: "Demande confidentialité bac à sable ({mode}, sujet : {subject})",
  },
};

export interface SummaryEnumLabels {
  readonly ALLOW: string;
  readonly BLOCK: string;
  readonly BLACKLIST: string;
  readonly WHITELIST: string;
  readonly LEDGER_COMPENSATION: string;
  readonly MANUAL_LIMIT_REVIEW: string;
  readonly COMPLETED: string;
  readonly PARTIAL_FAILED: string;
  readonly VERIFIED: string;
  readonly REJECTED: string;
}

export const CHANGE_SUMMARY_ENUM_LABELS: Readonly<Record<VoxWardLocale, SummaryEnumLabels>> = {
  en: {
    ALLOW: "Allow",
    BLOCK: "Block",
    BLACKLIST: "Blacklist",
    WHITELIST: "Whitelist",
    LEDGER_COMPENSATION: "Ledger compensation",
    MANUAL_LIMIT_REVIEW: "Manual review required (subsequent entry hit clamp)",
    COMPLETED: "Completed",
    PARTIAL_FAILED: "Partial failed",
    VERIFIED: "Verified",
    REJECTED: "Rejected",
  },
  "zh-CN": {
    ALLOW: "放行",
    BLOCK: "拦截",
    BLACKLIST: "黑名单",
    WHITELIST: "白名单",
    LEDGER_COMPENSATION: "依据账本记录补偿",
    MANUAL_LIMIT_REVIEW: "需人工调整（后续条目触及上下限）",
    COMPLETED: "已完成",
    PARTIAL_FAILED: "部分失败",
    VERIFIED: "已核验通过",
    REJECTED: "已驳回",
  },
  ja: {
    ALLOW: "許可",
    BLOCK: "ブロック",
    BLACKLIST: "ブラックリスト",
    WHITELIST: "ホワイトリスト",
    LEDGER_COMPENSATION: "台帳記録に基づく補償",
    MANUAL_LIMIT_REVIEW: "手動確認が必要（後続エントリが上限/下限に到達）",
    COMPLETED: "完了",
    PARTIAL_FAILED: "一部失敗",
    VERIFIED: "確認済み",
    REJECTED: "却下",
  },
  ko: {
    ALLOW: "허용",
    BLOCK: "차단",
    BLACKLIST: "블랙리스트",
    WHITELIST: "화이트리스트",
    LEDGER_COMPENSATION: "원장 기록 기반 보상",
    MANUAL_LIMIT_REVIEW: "수동 조정 필요(후속 항목이 상/하한 도달)",
    COMPLETED: "완료",
    PARTIAL_FAILED: "부분 실패",
    VERIFIED: "검증됨",
    REJECTED: "거부됨",
  },
  fr: {
    ALLOW: "Autoriser",
    BLOCK: "Bloquer",
    BLACKLIST: "liste noire",
    WHITELIST: "liste blanche",
    LEDGER_COMPENSATION: "Compensation par grand livre",
    MANUAL_LIMIT_REVIEW: "Vérification manuelle requise (seuil atteint ensuite)",
    COMPLETED: "Terminée",
    PARTIAL_FAILED: "Échec partiel",
    VERIFIED: "Vérifiée",
    REJECTED: "Rejetée",
  },
};

export const ADAPTER_STATUS_TEMPLATES: Readonly<Record<VoxWardLocale, Readonly<Record<AdapterStatusCode, string>>>> = {
  en: {
    CONFIG_SAVED: "Configuration saved",
    ACTION_EXECUTED: "Action executed: {action}",
    OBS_OVERLAY_READY: "OBS transparent overlay channel ready",
    NATIVE_OUTPUT_READY: "blivechat / native read-only channel ready",
    MODELS_FETCHED: "Fetched {count} models from endpoint",
  },
  "zh-CN": {
    CONFIG_SAVED: "已保存配置",
    ACTION_EXECUTED: "已执行运维动作：{action}",
    OBS_OVERLAY_READY: "OBS 透明投屏通道就绪",
    NATIVE_OUTPUT_READY: "blivechat / 原生只读输出通道就绪",
    MODELS_FETCHED: "已从远端拉取 {count} 个可用模型",
  },
  ja: {
    CONFIG_SAVED: "設定を保存しました",
    ACTION_EXECUTED: "運用アクションを実行しました：{action}",
    OBS_OVERLAY_READY: "OBS 透過オーバーレイ出力チャネル待機中",
    NATIVE_OUTPUT_READY: "blivechat / ネイティブ読み取り専用チャネル待機中",
    MODELS_FETCHED: "エンドポイントから {count} 個のモデルを取得しました",
  },
  ko: {
    CONFIG_SAVED: "설정 저장됨",
    ACTION_EXECUTED: "작업 실행됨: {action}",
    OBS_OVERLAY_READY: "OBS 투명 오버레이 채널 준비됨",
    NATIVE_OUTPUT_READY: "blivechat / 네이티브 읽기 전용 출력 준비됨",
    MODELS_FETCHED: "원격에서 {count}개 모델을 가져왔습니다",
  },
  fr: {
    CONFIG_SAVED: "Configuration enregistrée",
    ACTION_EXECUTED: "Action exécutée : {action}",
    OBS_OVERLAY_READY: "Canal OBS transparent prêt",
    NATIVE_OUTPUT_READY: "Canal lecture seule blivechat / natif prêt",
    MODELS_FETCHED: "{count} modèles récupérés depuis le point de terminaison",
  },
};

export const BUILT_IN_TERM_CATEGORIES: Readonly<
  Record<VoxWardLocale, Readonly<Record<BuiltInCategoryCode, { readonly label: string; readonly description: string }>>>
> = {
  en: {
    spam: { label: "Spam & Flooding", description: "High-frequency repetition, external links, or ad spam" },
    abuse: { label: "Harassment & Abuse", description: "Insults, targeted harassment, and hate speech" },
    sensitive: { label: "High-Risk & Evasion", description: "Prohibited terms and obfuscated evasion variants" },
    friendly: { label: "Friendly Memes", description: "Verified safe community phrases and inside jokes" },
  },
  "zh-CN": {
    spam: { label: "垃圾刷屏", description: "高频重复、外链导流或广告垃圾信息" },
    abuse: { label: "人身攻击", description: "辱骂、恶意骚扰与仇恨言论" },
    sensitive: { label: "高敏禁词", description: "违禁词与规避变形表达" },
    friendly: { label: "常用热梗", description: "已确认安全的社区友好高频词" },
  },
  ja: {
    spam: { label: "スパム・連投", description: "高頻度の連投、外部誘導、広告スパム" },
    abuse: { label: "誹謗中傷", description: "侮辱、悪意ある嫌がらせ、ヘイト発言" },
    sensitive: { label: "高リスク禁止語", description: "禁止語および伏せ字・回避表現" },
    friendly: { label: "コミュニティ定番語", description: "安全性確認済みの好意的な定番フレーズ" },
  },
  ko: {
    spam: { label: "스팸/도배", description: "고빈도 반복, 외부 링크 유도 및 광고성 스팸" },
    abuse: { label: "인신공격", description: "욕설, 악의적 괴롭힘 및 혐오 표현" },
    sensitive: { label: "고위험 금칙어", description: "금지 표현 및 우회 변형 표현" },
    friendly: { label: "커뮤니티 밈", description: "안전이 확인된 우호적 고빈도 표현" },
  },
  fr: {
    spam: { label: "Spam & Flood", description: "Répétitions fréquentes, liens externes ou publicités" },
    abuse: { label: "Harcèlement & Abus", description: "Insultes, harcèlement ciblé et discours haineux" },
    sensitive: { label: "Termes sensibles", description: "Termes interdits et variantes de contournement" },
    friendly: { label: "Expressions amicales", description: "Références communautaires validées sans risque" },
  },
};

export const BUILT_IN_RBAC_ROLES: Readonly<
  Record<VoxWardLocale, Readonly<Record<BuiltInRoleId, { readonly name: string; readonly description: string }>>>
> = {
  en: {
    "role-owner": {
      name: "Channel Owner",
      description: "Full administrative access across moderation, settings, integrations, and members.",
    },
    "role-moderator": {
      name: "Moderator",
      description: "Handles live moderation queues, verdict overturns, wordlists, and blocked users.",
    },
    "role-data-admin": {
      name: "Privacy & Data Admin",
      description: "Manages viewer data inquiries, verification, and two-stage deletion execution.",
    },
    "role-auditor": {
      name: "Read-Only Auditor",
      description: "Inspects technical, change, and integration logs without write or overturn rights.",
    },
  },
  "zh-CN": {
    "role-owner": {
      name: "频道所有者",
      description: "拥有审核、配置、集成与成员完全管理权。",
    },
    "role-moderator": {
      name: "房管",
      description: "负责实时审核队列、拦截重判、词条与手动黑名单管理。",
    },
    "role-data-admin": {
      name: "隐私与数据管理员",
      description: "专责处理观众数据查询、核验与两阶段删除请求。",
    },
    "role-auditor": {
      name: "只读日志审计员",
      description: "仅查看技术日志、变更日志与外部集成日志，禁止改判与修改配置。",
    },
  },
  ja: {
    "role-owner": {
      name: "チャンネルオーナー",
      description: "審査、設定、連携、メンバー管理のすべての権限を持ちます。",
    },
    "role-moderator": {
      name: "モデレーター",
      description: "リアルタイム審査キュー、再判定、用語リスト、ブロック管理を担当します。",
    },
    "role-data-admin": {
      name: "プライバシー・データ管理者",
      description: "視聴者データ照会、本人確認、二段階削除の実行を担当します。",
    },
    "role-auditor": {
      name: "読み取り専用監査者",
      description: "技術・変更・連携ログの閲覧のみ可能で、判定変更や設定変更はできません。",
    },
  },
  ko: {
    "role-owner": {
      name: "채널 소유자",
      description: "검토, 설정, 연동 및 멤버 관리에 대한 전체 권한을 가집니다.",
    },
    "role-moderator": {
      name: "방장/모더레이터",
      description: "실시간 검토 대기열, 재판정, 단어 목록 및 차단 사용자 관리를 담당합니다.",
    },
    "role-data-admin": {
      name: "개인정보·데이터 관리자",
      description: "시청자 데이터 조회, 검증 및 2단계 삭제 실행을 전담합니다.",
    },
    "role-auditor": {
      name: "읽기 전용 감사자",
      description: "기술·변경·연동 로그 조회만 가능하며 판정 변경 및 설정 수정은 금지됩니다.",
    },
  },
  fr: {
    "role-owner": {
      name: "Propriétaire de chaîne",
      description: "Contrôle complet sur la modération, les paramètres, les intégrations et les membres.",
    },
    "role-moderator": {
      name: "Modérateur",
      description: "Gère la file temps réel, les révisions de verdicts, lexiques et utilisateurs bloqués.",
    },
    "role-data-admin": {
      name: "Administrateur Confidentialité",
      description: "Traite les demandes d’accès, vérifications et suppressions en deux étapes.",
    },
    "role-auditor": {
      name: "Auditeur lecture seule",
      description: "Consulte les journaux techniques, de changement et d’intégration sans écriture.",
    },
  },
};

export const ADAPTER_DRIVER_COPY: Readonly<
  Record<VoxWardLocale, Readonly<Record<BuiltInDriverId, { readonly displayName: string; readonly summary: string }>>>
> = {
  en: {
    "youtube-live-v3": {
      displayName: "YouTube Live Data API v3",
      summary: "Official Live Chat streamList ingestion with Super Chat payment and membership mapping.",
    },
    "kiro-cli": {
      displayName: "Kiro CLI Isolated Runtime Adapter",
      summary: "Executes disposable sandboxed Kiro CLI moderation & SC translation sessions with automatic cleanup.",
    },
    "openai-compat": {
      displayName: "OpenAI-Compatible Adapter",
      summary: "OpenAI Chat/Responses compatible endpoint supporting custom Base URL and /models discovery.",
    },
    "anthropic-compat": {
      displayName: "Anthropic-Compatible Adapter",
      summary: "Anthropic Messages API compatible endpoint with custom Base URL and API version headers.",
    },
    "obs-overlay-source": {
      displayName: "OBS Transparent Overlay Source",
      summary: "Pushes approved messages and 7-tier Super Chats via read-only WebSocket using #cred grants.",
    },
    "native-readonly-protocol": {
      displayName: "blivechat / Native Read-Only Protocol",
      summary: "Read-only loopback WebSocket output and one-time credentials for native desktop clients.",
    },
  },
  "zh-CN": {
    "youtube-live-v3": {
      displayName: "YouTube Live Data API v3",
      summary: "官方直播聊天 streamList 拉流与 Super Chat / 会员身份映射。",
    },
    "kiro-cli": {
      displayName: "Kiro CLI 本地运行时适配器",
      summary: "一次性受限会话调用 Kiro CLI / Crew 执行内容审核与 SC 精翻，并在终态自动清理运行目录。",
    },
    "openai-compat": {
      displayName: "OpenAI 基础格式适配器",
      summary: "兼容 OpenAI Chat/Responses 基础协议与自定义 Base Endpoint，支持从 /models 拉取可用模型。",
    },
    "anthropic-compat": {
      displayName: "Anthropic 基础格式适配器",
      summary: "兼容 Anthropic Messages 基础协议、自定义 Endpoint 与版本请求头。",
    },
    "obs-overlay-source": {
      displayName: "OBS 透明投屏源",
      summary: "通过单向只读通道向 OBS 浏览器源推送已放行弹幕与 7 级 Super Chat。",
    },
    "native-readonly-protocol": {
      displayName: "blivechat / 原生只读输出协议",
      summary: "面向本机回环连接器与 blivechat 等原生桌面客户端的单向只读 WebSocket 推送与一次性授权凭据。",
    },
  },
  ja: {
    "youtube-live-v3": {
      displayName: "YouTube Live Data API v3",
      summary: "公式ライブチャット streamList 取得と Super Chat 決済・メンバーシップ連携。",
    },
    "kiro-cli": {
      displayName: "Kiro CLI 分離ランタイムアダプター",
      summary: "使い捨ての隔離セッションで Kiro CLI 審査・SC 翻訳を実行し、終了時に自動削除します。",
    },
    "openai-compat": {
      displayName: "OpenAI 互換アダプター",
      summary: "OpenAI Chat/Responses 互換エンドポイントと /models からのモデル取得に対応します。",
    },
    "anthropic-compat": {
      displayName: "Anthropic 互換アダプター",
      summary: "Anthropic Messages API 互換エンドポイントとバージョンヘッダーに対応します。",
    },
    "obs-overlay-source": {
      displayName: "OBS 透過オーバーレイソース",
      summary: "許可済みメッセージと 7 段階 Super Chat を読み取り専用 WebSocket で OBS へ配信します。",
    },
    "native-readonly-protocol": {
      displayName: "blivechat / ネイティブ読み取り専用プロトコル",
      summary: "ローカルループバック接続および blivechat 等向けの読み取り専用 WebSocket 出力と一時資格情報。",
    },
  },
  ko: {
    "youtube-live-v3": {
      displayName: "YouTube Live Data API v3",
      summary: "공식 라이브 채팅 streamList 수집 및 Super Chat 결제/멤버십 매핑.",
    },
    "kiro-cli": {
      displayName: "Kiro CLI 격리 런타임 어댑터",
      summary: "일회성 격리 세션으로 Kiro CLI 검토 및 SC 번역을 실행하고 종료 시 자동 정리합니다.",
    },
    "openai-compat": {
      displayName: "OpenAI 호환 어댑터",
      summary: "커스텀 Base URL 및 /models 목록 조회를 지원하는 OpenAI 호환 어댑터.",
    },
    "anthropic-compat": {
      displayName: "Anthropic 호환 어댑터",
      summary: "커스텀 엔드포인트 및 API 버전 헤더를 지원하는 Anthropic Messages 호환 어댑터.",
    },
    "obs-overlay-source": {
      displayName: "OBS 투명 오버레이 소스",
      summary: "읽기 전용 WebSocket으로 승인된 메시지와 7단계 Super Chat을 OBS에 푸시합니다.",
    },
    "native-readonly-protocol": {
      displayName: "blivechat / 네이티브 읽기 전용 프로토콜",
      summary: "로컬 루프백 및 데스크톱 클라이언트를 위한 읽기 전용 WebSocket 출력과 일회용 자격 증명.",
    },
  },
  fr: {
    "youtube-live-v3": {
      displayName: "YouTube Live Data API v3",
      summary: "Collecte streamList officielle avec suivi des paiements Super Chat et adhésions.",
    },
    "kiro-cli": {
      displayName: "Adaptateur Runtime Kiro CLI",
      summary: "Exécute des sessions jetables isolées pour la modération et traduction SC avec nettoyage automatique.",
    },
    "openai-compat": {
      displayName: "Adaptateur compatible OpenAI",
      summary: "Point de terminaison OpenAI avec Base URL personnalisée et découverte /models.",
    },
    "anthropic-compat": {
      displayName: "Adaptateur compatible Anthropic",
      summary: "Point de terminaison Anthropic Messages avec URL personnalisée et en-tête de version.",
    },
    "obs-overlay-source": {
      displayName: "Source Overlay Transparent OBS",
      summary: "Diffuse les messages approuvés et Super Chats 7 niveaux via WebSocket lecture seule.",
    },
    "native-readonly-protocol": {
      displayName: "blivechat / Protocole natif lecture seule",
      summary: "Flux WebSocket local lecture seule et jeton à usage unique pour clients natifs.",
    },
  },
};

export const ADAPTER_ACTION_LABELS: Readonly<
  Record<VoxWardLocale, Readonly<Record<BuiltInAdapterAction, string>>>
> = {
  en: {
    "test-connection": "Test Connection",
    reauthorize: "Reauthorize OAuth",
    "restart-ingest": "Restart Ingest",
    "cli-self-check": "Run CLI Self-Check",
    "cleanup-orphans": "Clean Orphan Runs",
    "fetch-models": "Fetch Remote Models",
    "issue-output-token": "Issue OBS Grant",
    "issue-output-grant": "Issue Desktop Grant",
  },
  "zh-CN": {
    "test-connection": "检测连接状态",
    reauthorize: "发起 OAuth 重授权",
    "restart-ingest": "重启直播拉流",
    "cli-self-check": "执行 CLI 自检",
    "cleanup-orphans": "清理孤儿运行目录",
    "fetch-models": "获取远端可用模型列表",
    "issue-output-token": "签发 OBS 投屏凭据",
    "issue-output-grant": "签发桌面插件凭据",
  },
  ja: {
    "test-connection": "接続テスト",
    reauthorize: "OAuth 再認可",
    "restart-ingest": "取得を再起動",
    "cli-self-check": "CLI セルフチェック",
    "cleanup-orphans": "孤立ディレクトリを削除",
    "fetch-models": "リモートモデル取得",
    "issue-output-token": "OBS 用資格情報を発行",
    "issue-output-grant": "デスクトップ用資格情報を発行",
  },
  ko: {
    "test-connection": "연결 테스트",
    reauthorize: "OAuth 재인증",
    "restart-ingest": "수집 재시작",
    "cli-self-check": "CLI 자체 점검",
    "cleanup-orphans": "고아 디렉터리 정리",
    "fetch-models": "원격 모델 가져오기",
    "issue-output-token": "OBS 자격 증명 발급",
    "issue-output-grant": "데스크톱 자격 증명 발급",
  },
  fr: {
    "test-connection": "Tester la connexion",
    reauthorize: "Réautoriser OAuth",
    "restart-ingest": "Redémarrer la collecte",
    "cli-self-check": "Auto-vérification CLI",
    "cleanup-orphans": "Nettoyer dossiers orphelins",
    "fetch-models": "Récupérer les modèles",
    "issue-output-token": "Émettre jeton OBS",
    "issue-output-grant": "Émettre jeton bureau",
  },
};

export function interpolateTemplate(
  template: string,
  params: Readonly<Record<string, string | number | boolean | null | undefined>>,
  enumLabels?: Readonly<Record<string, string>>,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => {
    const value = params[key];
    if (value === null || value === undefined) return "-";
    const str = String(value);
    if (enumLabels && Object.prototype.hasOwnProperty.call(enumLabels, str)) {
      return enumLabels[str] ?? str;
    }
    return str;
  });
}

export function formatChangeLogSummary(
  item: {
    readonly summary: string;
    readonly summaryCode?: ChangeSummaryCode | null;
    readonly summaryParams?: ChangeSummaryParams | null;
  },
  locale: VoxWardLocale,
): string {
  if (!item.summaryCode) return item.summary;
  const templates = CHANGE_SUMMARY_TEMPLATES[locale] ?? CHANGE_SUMMARY_TEMPLATES.en;
  const template = templates[item.summaryCode];
  if (!template) return item.summary;
  const labels = (CHANGE_SUMMARY_ENUM_LABELS[locale] ?? CHANGE_SUMMARY_ENUM_LABELS.en) as unknown as Record<string, string>;
  return interpolateTemplate(template, item.summaryParams ?? {}, labels);
}

export function formatAdapterStatus(
  adapter: {
    readonly lastStatus: string;
    readonly lastStatusCode?: AdapterStatusCode | null;
    readonly lastStatusParams?: Readonly<Record<string, string | number>> | null;
  },
  locale: VoxWardLocale,
): string {
  if (!adapter.lastStatusCode) return adapter.lastStatus;
  const templates = ADAPTER_STATUS_TEMPLATES[locale] ?? ADAPTER_STATUS_TEMPLATES.en;
  const template = templates[adapter.lastStatusCode];
  if (!template) return adapter.lastStatus;
  return interpolateTemplate(template, adapter.lastStatusParams ?? {});
}

export function formatBuiltInTermCategory(
  category: {
    readonly code: string;
    readonly label: string;
    readonly description: string;
    readonly builtIn?: boolean;
  },
  locale: VoxWardLocale,
): { readonly label: string; readonly description: string } {
  if (category.builtIn !== true) {
    return { label: category.label, description: category.description };
  }
  const dict = BUILT_IN_TERM_CATEGORIES[locale] ?? BUILT_IN_TERM_CATEGORIES.en;
  const entry = dict[category.code as BuiltInCategoryCode];
  return entry ?? { label: category.label, description: category.description };
}

export function formatBuiltInRbacRole(
  role: {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly builtIn?: boolean;
    readonly systemPreset?: boolean;
  },
  locale: VoxWardLocale,
): { readonly name: string; readonly description: string } {
  if (role.builtIn !== true && role.systemPreset !== true) {
    return { name: role.name, description: role.description };
  }
  const dict = BUILT_IN_RBAC_ROLES[locale] ?? BUILT_IN_RBAC_ROLES.en;
  const entry = dict[role.id as BuiltInRoleId];
  return entry ?? { name: role.name, description: role.description };
}

export function formatAdapterCatalogDriver(
  driverId: string,
  fallback: { readonly displayName: string; readonly summary: string },
  locale: VoxWardLocale,
): { readonly displayName: string; readonly summary: string } {
  const dict = ADAPTER_DRIVER_COPY[locale] ?? ADAPTER_DRIVER_COPY.en;
  return dict[driverId as BuiltInDriverId] ?? fallback;
}

export function formatAdapterActionLabel(
  action: string,
  fallback: string,
  locale: VoxWardLocale,
): string {
  const dict = ADAPTER_ACTION_LABELS[locale] ?? ADAPTER_ACTION_LABELS.en;
  return dict[action as BuiltInAdapterAction] ?? fallback;
}

const RETENTION_CATEGORY_LABELS: Readonly<Record<VoxWardLocale, Readonly<Record<string, string>>>> = {
  en: {
    TECHNICAL_LOG: "Technical Log Metadata",
    EVIDENCE: "Message & Translation Evidence",
    CHANGE_LOG: "Change Audit Log",
  },
  "zh-CN": {
    TECHNICAL_LOG: "技术日志元数据",
    EVIDENCE: "消息正文与翻译证据",
    CHANGE_LOG: "变更审计日志",
  },
  ja: {
    TECHNICAL_LOG: "技術ログメタデータ",
    EVIDENCE: "メッセージ本文・翻訳証跡",
    CHANGE_LOG: "変更監査ログ",
  },
  ko: {
    TECHNICAL_LOG: "기술 로그 메타데이터",
    EVIDENCE: "메시지 본문 및 번역 증적",
    CHANGE_LOG: "변경 감사 로그",
  },
  fr: {
    TECHNICAL_LOG: "Métadonnées de journal technique",
    EVIDENCE: "Texte des messages et traductions",
    CHANGE_LOG: "Journal d'audit des modifications",
  },
};

export function formatRetentionCategory(category: string, locale: VoxWardLocale): string {
  const dict = RETENTION_CATEGORY_LABELS[locale] ?? RETENTION_CATEGORY_LABELS.en;
  return dict[category] ?? category;
}

const TECHNICAL_STAGE_LABELS: Readonly<Record<VoxWardLocale, Readonly<Record<string, string>>>> = {
  en: {
    INGEST: "Ingest",
    BASE_RULES: "Base Rules",
    ROUTE: "Routing",
    AI_CALL: "AI Inference",
    SCHEMA_VALIDATE: "Schema Validation",
    COMMIT: "Verdict Commit",
    SCORE: "Scoring",
    DELIVER: "Output Delivery",
    REVIEW: "Background Review",
    DATA_DELETE: "Data Deletion",
  },
  "zh-CN": {
    INGEST: "消息接入",
    BASE_RULES: "基础规则",
    ROUTE: "路由分发",
    AI_CALL: "AI 推理",
    SCHEMA_VALIDATE: "结构校验",
    COMMIT: "裁决落库",
    SCORE: "积分结算",
    DELIVER: "下游投递",
    REVIEW: "后台复盘",
    DATA_DELETE: "数据删除",
  },
  ja: {
    INGEST: "取り込み",
    BASE_RULES: "基本ルール",
    ROUTE: "ルーティング",
    AI_CALL: "AI 推論",
    SCHEMA_VALIDATE: "スキーマ検証",
    COMMIT: "判定確定",
    SCORE: "スコア計算",
    DELIVER: "出力配信",
    REVIEW: "バックグラウンド再審",
    DATA_DELETE: "データ削除",
  },
  ko: {
    INGEST: "수신",
    BASE_RULES: "기본 규칙",
    ROUTE: "라우팅",
    AI_CALL: "AI 추론",
    SCHEMA_VALIDATE: "스키마 검증",
    COMMIT: "판정 커밋",
    SCORE: "점수 산정",
    DELIVER: "출력 전송",
    REVIEW: "백그라운드 재심",
    DATA_DELETE: "데이터 삭제",
  },
  fr: {
    INGEST: "Ingestion",
    BASE_RULES: "Règles de base",
    ROUTE: "Routage",
    AI_CALL: "Inférence IA",
    SCHEMA_VALIDATE: "Validation schéma",
    COMMIT: "Validation verdict",
    SCORE: "Calcul du score",
    DELIVER: "Diffusion sortie",
    REVIEW: "Révision différée",
    DATA_DELETE: "Suppression données",
  },
};

export function formatTechnicalStage(stage: string, locale: VoxWardLocale): string {
  const dict = TECHNICAL_STAGE_LABELS[locale] ?? TECHNICAL_STAGE_LABELS.en;
  return dict[stage] ?? stage;
}

export function formatLocalizedTimestamp(iso: string, locale: VoxWardLocale): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleString(locale);
}
