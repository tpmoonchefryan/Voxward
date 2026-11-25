import type { ChangeKind, ChangeOutcome, LogViewerEvidence } from "@voxward/contracts";
import type { VoxWardLocale } from "./types";

export interface DataCopy {
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly checkingAria: string;
  readonly checkingTitle: string;
  readonly checkingDesc: (ch: string) => string;
  readonly noPermAria: string;
  readonly noPermMsg: string;
  readonly lookupAria: string;
  readonly subjectRefLabel: string;
  readonly subjectRefPlaceholder: string;
  readonly lookupBtn: string;
  readonly emptyTitle: string;
  readonly emptyDesc: string;
  readonly summaryAria: string;
  readonly summaryHeading: string;
  readonly labelSubjectRef: string;
  readonly labelScore: string;
  readonly scoreUnset: string;
  readonly labelList: string;
  readonly listBlacklist: string;
  readonly listWhitelist: string;
  readonly listNormal: string;
  readonly labelException: string;
  readonly exceptionActive: string;
  readonly exceptionNormal: string;
  readonly labelLedger: string;
  readonly ledgerCount: (n: string) => string;
  readonly retentionTableLabel: string;
  readonly colCategory: string;
  readonly colCount: string;
  readonly colDays: string;
  readonly daysUnit: (n: string) => string;
  readonly notices: Readonly<Record<string, string>>;
  readonly noticeFallback: string;
  readonly errors: Readonly<Record<string, string>>;
  readonly genericError: string;
  readonly networkError: string;
}

export const DATA_COPY: Readonly<Record<VoxWardLocale, DataCopy>> = {
  en: {
    pageTitle: "Data Compliance",
    pageDescription:
      "Authorized data operators may look up viewer records, register async deletion requests, and verify identity.",
    checkingAria: "Checking data permission",
    checkingTitle: "Checking permission…",
    checkingDesc: (ch) => `Verifying data compliance capability on channel ${ch}.`,
    noPermAria: "No data compliance permission",
    noPermMsg:
      "Current account lacks data compliance permission. Ask the channel owner to grant data handling rights in Users & RBAC.",
    lookupAria: "Lookup by viewer reference",
    subjectRefLabel: "Viewer Subject Reference (Subject Ref)",
    subjectRefPlaceholder: "Enter stable subject identifier, e.g. sub_1024",
    lookupBtn: "Look Up Subject",
    emptyTitle: "Search for a viewer profile",
    emptyDesc:
      "Enter a stable viewer subject ref to inspect trust scores, retention rules, or register an export/deletion workflow.",
    summaryAria: "Subject Profile",
    summaryHeading: "Subject Profile",
    labelSubjectRef: "Subject Ref",
    labelScore: "Current Trust Score",
    scoreUnset: "Unscored",
    labelList: "List Status",
    listBlacklist: "Channel Blacklist",
    listWhitelist: "Channel Whitelist",
    listNormal: "Standard Viewer",
    labelException: "Scoring Exception",
    exceptionActive: "Exception active (new chat queued for manual review)",
    exceptionNormal: "Scored by regular rules",
    labelLedger: "Ledger Entries",
    ledgerCount: (n) => `${n} entries`,
    retentionTableLabel: "Data categories and retention schedule",
    colCategory: "Category",
    colCount: "Stored Rows",
    colDays: "Retention (Days)",
    daysUnit: (n) => `${n} days`,
    notices: {
      PROVIDER_COPY_NOT_CONTROLLED:
        "YouTube original messages and platform copies are outside this instance's deletion control and cannot be queried here.",
    },
    noticeFallback: "External platform data copies are not managed or erased by this instance.",
    errors: {
      UNAUTHENTICATED: "Please sign in first.",
      FORBIDDEN: "Current account has no data compliance permission for this operation.",
      DOWNSTREAM_READ_ONLY: "Read-only output credential cannot perform this action.",
      CSRF_INVALID: "Session expired. Refresh the page and try again.",
      SUBJECT_NOT_FOUND: "Subject not found in this channel.",
      REQUEST_NOT_FOUND: "Data request not found.",
      NOT_FOUND: "Action unavailable in this route.",
      ALREADY_DECIDED: "This request already has a verification decision.",
      INVALID_REQUEST: "Submitted data is incomplete or invalid.",
      INTERNAL_ERROR: "Service temporarily unavailable. Please try again later.",
    },
    genericError: "Action did not complete. Please try again later.",
    networkError: "Unable to connect to the service. Check your network.",
  },
  "zh-CN": {
    pageTitle: "数据合规",
    pageDescription:
      "仅限获授数据合规处理权限的操作员查询观众档案、登记异步清理并完成身份核验。",
    checkingAria: "数据权限检测",
    checkingTitle: "正在检查权限…",
    checkingDesc: (ch) => `当前正在核实频道 ${ch} 的数据合规授权。`,
    noPermAria: "无数据管理权限",
    noPermMsg:
      "当前账号没有数据管理权限，请联系频道所有者在「成员与权限」授予数据合规处置角色。",
    lookupAria: "按观众标识查询",
    subjectRefLabel: "观众唯一标识",
    subjectRefPlaceholder: "输入稳定主体编号，例如：sub_1024",
    lookupBtn: "检索主体档案",
    emptyTitle: "请先查询观众档案",
    emptyDesc:
      "输入稳定观众编号以查看积分数、留存策略摘要，以及发起导出/删除清理流程。",
    summaryAria: "主体概况",
    summaryHeading: "主体概况",
    labelSubjectRef: "主体编号",
    labelScore: "当前信任积分",
    scoreUnset: "未建分",
    labelList: "名单标记",
    listBlacklist: "频道黑名单",
    listWhitelist: "频道白名单",
    listNormal: "常规观众",
    labelException: "计分例外状态",
    exceptionActive: "已启用例外（新发言入人工队列）",
    exceptionNormal: "按正常规则计分",
    labelLedger: "积分流水记录数",
    ledgerCount: (n) => `${n} 条`,
    retentionTableLabel: "类别与数据保留周期",
    colCategory: "数据类别",
    colCount: "保留记录条数",
    colDays: "保留上限（天）",
    daysUnit: (n) => `${n} 天`,
    notices: {
      PROVIDER_COPY_NOT_CONTROLLED:
        "YouTube 原始内容与平台侧副本不由本实例删除，外部处理状态本实例无法查询。",
    },
    noticeFallback: "外部平台数据副本不由本实例统一清理。",
    errors: {
      UNAUTHENTICATED: "请先登录。",
      FORBIDDEN: "当前账号没有数据管理权限，无法执行此操作。",
      DOWNSTREAM_READ_ONLY: "输出凭据不能执行此操作。",
      CSRF_INVALID: "页面已过期，请刷新后重试。",
      SUBJECT_NOT_FOUND: "本频道中没有这个主体。",
      REQUEST_NOT_FOUND: "没有找到这个请求。",
      NOT_FOUND: "此页面不支持该操作。",
      ALREADY_DECIDED: "这个请求已经有核验结论。",
      INVALID_REQUEST: "提交的内容不完整或格式不正确。",
      INTERNAL_ERROR: "服务暂时不可用，请稍后再试。",
    },
    genericError: "操作没有完成，请稍后再试。",
    networkError: "无法连接服务，请检查网络后重试。",
  },
  ja: {
    pageTitle: "データコンプライアンス",
    pageDescription:
      "認可された担当者が視聴者プロフィールの照会、削除リクエストの登録、本人確認を行えます。",
    checkingAria: "データ権限確認",
    checkingTitle: "権限を確認しています…",
    checkingDesc: (ch) => `チャンネル ${ch} のデータ管理権限を確認中です。`,
    noPermAria: "データ管理権限なし",
    noPermMsg:
      "現在のアカウントにはデータ管理権限がありません。「メンバーと権限」からデータ処理ロールの付与を依頼してください。",
    lookupAria: "視聴者識別子による検索",
    subjectRefLabel: "視聴者識別子",
    subjectRefPlaceholder: "安定した識別子を入力 (例: sub_1024)",
    lookupBtn: "対象を検索",
    emptyTitle: "まず視聴者プロフィールを検索してください",
    emptyDesc:
      "安定した視聴者 ID を入力すると、信頼スコア、保持期間、エクスポート／削除手続きを確認できます。",
    summaryAria: "対象プロフィール",
    summaryHeading: "対象プロフィール",
    labelSubjectRef: "対象識別子",
    labelScore: "現在の信頼スコア",
    scoreUnset: "未設定",
    labelList: "リスト区分",
    listBlacklist: "ブラックリスト",
    listWhitelist: "ホワイトリスト",
    listNormal: "通常視聴者",
    labelException: "スコア例外ステータス",
    exceptionActive: "例外有効（新規発言は人手審査キューへ）",
    exceptionNormal: "通常ルールで採点",
    labelLedger: "スコア台帳件数",
    ledgerCount: (n) => `${n} 件`,
    retentionTableLabel: "データ分類と保持期間",
    colCategory: "データ分類",
    colCount: "保存件数",
    colDays: "保持上限（日）",
    daysUnit: (n) => `${n} 日`,
    notices: {
      PROVIDER_COPY_NOT_CONTROLLED:
        "YouTube のオリジナルコンテンツおよびプラットフォーム側のコピーは本インスタンスの管理対象外であり、外部状態の照会はできません。",
    },
    noticeFallback: "外部プラットフォーム上のデータコピーは本インスタンスで管理されません。",
    errors: {
      UNAUTHENTICATED: "先にログインしてください。",
      FORBIDDEN: "現在のアカウントにはデータ管理権限がありません。",
      DOWNSTREAM_READ_ONLY: "出力認証情報ではこの操作を行えません。",
      CSRF_INVALID: "ページの有効期限が切れました。更新して再試行してください。",
      SUBJECT_NOT_FOUND: "このチャンネルに対象が見つかりません。",
      REQUEST_NOT_FOUND: "リクエストが見つかりません。",
      NOT_FOUND: "このページではこの操作を利用できません。",
      ALREADY_DECIDED: "このリクエストは既に確認結論が出ています。",
      INVALID_REQUEST: "入力内容が不足しているか形式が無効です。",
      INTERNAL_ERROR: "サービスを一時的に利用できません。",
    },
    genericError: "操作を完了できませんでした。",
    networkError: "サービスに接続できません。ネットワークをご確認ください。",
  },
  ko: {
    pageTitle: "데이터 컴플라이언스",
    pageDescription:
      "권한이 부여된 운영자가 시청자 기록을 조회하고 비동기 정리 요청 등록 및 신원 확인을 수행합니다.",
    checkingAria: "데이터 권한 확인",
    checkingTitle: "권한 확인 중…",
    checkingDesc: (ch) => `채널 ${ch}의 데이터 컴플라이언스 권한을 확인하는 중입니다.`,
    noPermAria: "데이터 관리 권한 없음",
    noPermMsg:
      "현재 계정에 데이터 관리 권한이 없습니다. 「사용자 및 권한」에서 채널 소유자에게 데이터 처리 역할을 요청하세요.",
    lookupAria: "시청자 식별자로 조회",
    subjectRefLabel: "시청자 고유 식별자",
    subjectRefPlaceholder: "안정적 주체 ID 입력 (예: sub_1024)",
    lookupBtn: "주체 조회",
    emptyTitle: "먼저 시청자 프로필을 조회하세요",
    emptyDesc:
      "시청자 식별자를 입력하여 신뢰 점수, 보관 기간 요약 및 내보내기/정리 절차를 진행하세요.",
    summaryAria: "주체 개요",
    summaryHeading: "주체 개요",
    labelSubjectRef: "주체 ID",
    labelScore: "현재 신뢰 점수",
    scoreUnset: "미설정",
    labelList: "목록 상태",
    listBlacklist: "채널 블랙리스트",
    listWhitelist: "채널 화이트리스트",
    listNormal: "일반 시청자",
    labelException: "점수 예외 상태",
    exceptionActive: "예외 적용됨 (새 메시지는 수동 대기열로 이동)",
    exceptionNormal: "일반 규칙으로 점수 산정",
    labelLedger: "원장 기록 수",
    ledgerCount: (n) => `${n}건`,
    retentionTableLabel: "데이터 분류 및 보관 주기",
    colCategory: "데이터 분류",
    colCount: "보관 건수",
    colDays: "보관 한도(일)",
    daysUnit: (n) => `${n}일`,
    notices: {
      PROVIDER_COPY_NOT_CONTROLLED:
        "YouTube 원본 및 플랫폼 측 사본은 본 인스턴스의 제어 범위가 아니며 외부 처리 상태를 조회할 수 없습니다.",
    },
    noticeFallback: "외부 플랫폼 데이터 사본은 본 인스턴스에서 직접 제거하지 않습니다.",
    errors: {
      UNAUTHENTICATED: "먼저 로그인하세요.",
      FORBIDDEN: "현재 계정에 데이터 관리 권한이 없습니다.",
      DOWNSTREAM_READ_ONLY: "출력 자격 증명으로는 이 작업을 실행할 수 없습니다.",
      CSRF_INVALID: "세션이 만료되었습니다. 새로고침 후 다시 시도하세요.",
      SUBJECT_NOT_FOUND: "이 채널에서 해당 주체를 찾을 수 없습니다.",
      REQUEST_NOT_FOUND: "요청을 찾을 수 없습니다.",
      NOT_FOUND: "이 페이지에서는 이 작업을 사용할 수 없습니다.",
      ALREADY_DECIDED: "이 요청은 이미 검증 결론이 내려졌습니다.",
      INVALID_REQUEST: "제출된 내용이 불완전하거나 올바르지 않습니다.",
      INTERNAL_ERROR: "서비스를 일시적으로 사용할 수 없습니다.",
    },
    genericError: "작업이 완료되지 않았습니다. 잠시 후 다시 시도하세요.",
    networkError: "서비스에 연결할 수 없습니다. 네트워크를 확인하세요.",
  },
  fr: {
    pageTitle: "Conformité des données",
    pageDescription:
      "Les opérateurs autorisés consultent les profils spectateurs, enregistrent les suppressions asynchrones et valident l'identité.",
    checkingAria: "Vérification des droits données",
    checkingTitle: "Vérification des droits…",
    checkingDesc: (ch) => `Contrôle des droits de conformité pour la chaîne ${ch}.`,
    noPermAria: "Sans droit de conformité",
    noPermMsg:
      "Votre compte n'a pas l'autorisation requise. Demandez au propriétaire de la chaîne de vous l'attribuer dans Membres & RBAC.",
    lookupAria: "Recherche par identifiant spectateur",
    subjectRefLabel: "Identifiant du spectateur",
    subjectRefPlaceholder: "Identifiant stable, ex. : sub_1024",
    lookupBtn: "Rechercher le profil",
    emptyTitle: "Recherchez un profil spectateur",
    emptyDesc:
      "Saisissez un identifiant stable pour consulter les scores, la rétention et initier un export ou effacement.",
    summaryAria: "Profil du sujet",
    summaryHeading: "Profil du sujet",
    labelSubjectRef: "Identifiant",
    labelScore: "Score actuel",
    scoreUnset: "Non noté",
    labelList: "Liste",
    listBlacklist: "Liste noire",
    listWhitelist: "Liste blanche",
    listNormal: "Spectateur standard",
    labelException: "Exception de score",
    exceptionActive: "Exception active (file manuelle obligatoire)",
    exceptionNormal: "Notation normale",
    labelLedger: "Écritures du registre",
    ledgerCount: (n) => `${n} entrées`,
    retentionTableLabel: "Catégories et durée de conservation",
    colCategory: "Catégorie",
    colCount: "Enregistrements",
    colDays: "Conservation (jours)",
    daysUnit: (n) => `${n} jours`,
    notices: {
      PROVIDER_COPY_NOT_CONTROLLED:
        "Le contenu original YouTube et ses copies sur la plateforme restent hors du contrôle de cette instance.",
    },
    noticeFallback: "Les copies externes sur la plateforme ne sont pas gérées par cette instance.",
    errors: {
      UNAUTHENTICATED: "Veuillez d'abord vous connecter.",
      FORBIDDEN: "Autorisation manquante pour la gestion des données.",
      DOWNSTREAM_READ_ONLY: "Les jetons en lecture seule ne peuvent pas exécuter cette action.",
      CSRF_INVALID: "Session expirée. Actualisez et réessayez.",
      SUBJECT_NOT_FOUND: "Sujet introuvable sur cette chaîne.",
      REQUEST_NOT_FOUND: "Demande introuvable.",
      NOT_FOUND: "Cette action n’est pas disponible sur cette page.",
      ALREADY_DECIDED: "Cette demande dispose déjà d'une décision.",
      INVALID_REQUEST: "Contenu incomplet ou invalide.",
      INTERNAL_ERROR: "Service temporairement indisponible.",
    },
    genericError: "L'opération n'a pas pu aboutir.",
    networkError: "Impossible de joindre le service.",
  },
};

export interface DeleteActionsCopy {
  readonly sectionAria: string;
  readonly heading: string;
  readonly registeredPrefix: string;
  readonly idPrefix: string;
  readonly disclaimer: string;
  readonly modes: {
    readonly DELETE_DATA_ONLY: { readonly label: string; readonly effect: string };
    readonly DELETE_AND_EXCEPT: { readonly label: string; readonly effect: string };
  };
  readonly minimalPreferenceNote: string;
  readonly confirmTitlePrefix: string;
  readonly submittingLabel: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly failedFallback: (code: string) => string;
}

export const DELETE_ACTIONS_COPY: Readonly<Record<VoxWardLocale, DeleteActionsCopy>> = {
  en: {
    sectionAria: "Data removal & cleanup requests",
    heading: "Removal Actions",
    registeredPrefix: "Request registered; status: Pending Verification. No data has been removed yet. (Ref: ",
    idPrefix: "",
    disclaimer: "Registration itself removes no data; identity verification is required before asynchronous cleanup runs.",
    modes: {
      DELETE_DATA_ONLY: {
        label: "Erase stored data only",
        effect: "Queues removal of stored data for this subject without adding or lifting a scoring exception; future messages remain scored normally.",
      },
      DELETE_AND_EXCEPT: {
        label: "Erase data & add score exception",
        effect: "Queues removal of stored data and enrolls a scoring exception upon execution: future chat is never scored and enters manual review.",
      },
    },
    minimalPreferenceNote:
      "Enrollment retains one minimal preference record (channel scope + subject marker + flag). No prior trust scores or alias history are retained.",
    confirmTitlePrefix: "Register request: ",
    submittingLabel: "Registering…",
    confirmLabel: "Confirm registration",
    cancelLabel: "Cancel",
    failedFallback: (code) => `Registration failed (${code})`,
  },
  "zh-CN": {
    sectionAria: "删除与数据清理请求",
    heading: "删除操作",
    registeredPrefix: "已登记请求，状态：待核验。尚未删除任何数据。（编号：",
    idPrefix: "",
    disclaimer: "登记本身不删除任何数据，需经人工核验后由异步队列执行清理。",
    modes: {
      DELETE_DATA_ONLY: {
        label: "仅删除数据",
        effect: "删除该主体现有的数据。不新增、也不撤销记分例外；之后的发言仍按现有规则计分。",
      },
      DELETE_AND_EXCEPT: {
        label: "删除并加入记分例外名单",
        effect:
          "删除该主体现有的数据，并在执行时加入记分例外名单：之后不再计分，每条新消息进入审核。登记时尚未生效，执行完成前仍会计分。",
      },
    },
    minimalPreferenceNote:
      "加入名单需要保留一条最小偏好记录：频道范围的主体标记和偏好类型。不保存旧分数或昵称历史。之后的发言仍会进入审核。",
    confirmTitlePrefix: "将登记：",
    submittingLabel: "正在登记…",
    confirmLabel: "确认登记删除请求",
    cancelLabel: "取消",
    failedFallback: (code) => `登记失败 (${code})`,
  },
  ja: {
    sectionAria: "データ整理リクエスト",
    heading: "データ整理操作",
    registeredPrefix: "リクエスト登録済み（ステータス：確認待ち）。この時点ではまだデータは消去されていません。（ID：",
    idPrefix: "",
    disclaimer: "登録時点ではデータは消去されません。本人確認の完了後に非同期キューが処理します。",
    modes: {
      DELETE_DATA_ONLY: {
        label: "データのみ整理",
        effect: "保持中のデータを消去対象とします。スコア例外は追加・解除せず、以降の発言も通常どおり採点されます。",
      },
      DELETE_AND_EXCEPT: {
        label: "データ整理＆スコア例外へ登録",
        effect: "保持中のデータを消去対象とし、実行時にスコア例外へ登録します。以降は採点されず全件審査対象となります。",
      },
    },
    minimalPreferenceNote:
      "例外登録には最小限の選好記録（チャンネル・識別子・種別フラグ）のみ保持し、過去のスコアやニックネーム履歴は保存しません。",
    confirmTitlePrefix: "登録対象：",
    submittingLabel: "登録中…",
    confirmLabel: "リクエスト登録を確定",
    cancelLabel: "キャンセル",
    failedFallback: (code) => `登録に失敗しました (${code})`,
  },
  ko: {
    sectionAria: "데이터 정리 요청",
    heading: "정리 요청 작업",
    registeredPrefix: "요청이 등록되었습니다(상태: 검증 대기). 아직 어떤 데이터도 제거되지 않았습니다. (ID: ",
    idPrefix: "",
    disclaimer: "요청 등록 자체는 데이터를 지우지 않으며, 수동 신원 검증 후 비동기 대기열이 처리합니다.",
    modes: {
      DELETE_DATA_ONLY: {
        label: "데이터만 정리",
        effect: "보유 데이터를 정리 대상으로 등록합니다. 점수 예외는 추가·해제하지 않으며 이후 메시지는 기존 규칙대로 채점됩니다.",
      },
      DELETE_AND_EXCEPT: {
        label: "데이터 정리 및 점수 예외 등록",
        effect: "보유 데이터를 정리하고 실행 시 점수 예외 목록에 추가합니다. 이후에는 채점하지 않고 수동 검토 대기열로 보냅니다.",
      },
    },
    minimalPreferenceNote:
      "예외 등록 시 최소 선호 기록(채널 범위 식별자 및 플래그)만 보관하며 이전 점수나 닉네임 이력은 보존하지 않습니다.",
    confirmTitlePrefix: "등록 예정: ",
    submittingLabel: "등록 중…",
    confirmLabel: "정리 요청 등록 확정",
    cancelLabel: "취소",
    failedFallback: (code) => `등록 실패 (${code})`,
  },
  fr: {
    sectionAria: "Demandes d'effacement des données",
    heading: "Actions d'effacement",
    registeredPrefix: "Demande enregistrée (statut : en attente de vérification). Aucune donnée n'a encore été retirée. (Réf. : ",
    idPrefix: "",
    disclaimer: "L'enregistrement ne retire aucune donnée ; une vérification préalable est requise avant le traitement asynchrone.",
    modes: {
      DELETE_DATA_ONLY: {
        label: "Effacer les données seules",
        effect: "Planifie l'effacement des données conservées sans activer d'exception de notation.",
      },
      DELETE_AND_EXCEPT: {
        label: "Effacer et exclure de la notation",
        effect: "Planifie l'effacement et active une exception à l'exécution : les futurs messages passent en revue manuelle sans score.",
      },
    },
    minimalPreferenceNote:
      "L'exclusion ne conserve qu'un marqueur minimal par chaîne (sans anciens scores ni historique de pseudos).",
    confirmTitlePrefix: "À enregistrer : ",
    submittingLabel: "Enregistrement…",
    confirmLabel: "Confirmer l'enregistrement",
    cancelLabel: "Annuler",
    failedFallback: (code) => `Échec d'enregistrement (${code})`,
  },
};

export interface RequestStatusCopy {
  readonly sectionAria: string;
  readonly heading: string;
  readonly emptyTitle: string;
  readonly kinds: Readonly<Record<string, string>>;
  readonly kindFallback: string;
  readonly modes: Readonly<Record<string, string>>;
  readonly methods: Readonly<Record<string, string>>;
  readonly stages: Readonly<Record<string, string>>;
  readonly verStates: { readonly VERIFIED: string; readonly REJECTED: string; readonly PENDING: string };
  readonly labelId: string;
  readonly labelStage: string;
  readonly labelMethod: string;
  readonly targetDone: string;
  readonly targetFailed: string;
  readonly targetPending: string;
  readonly pendingBanner: (n: number) => string;
  readonly verifyOwnership: string;
  readonly verifyAuthorization: string;
  readonly rejectVerify: string;
  readonly executeBtn: string;
}

export const REQUEST_STATUS_COPY: Readonly<Record<VoxWardLocale, RequestStatusCopy>> = {
  en: {
    sectionAria: "Request status",
    heading: "Request Status",
    emptyTitle: "No data requests for this subject yet.",
    kinds: {
      ACCESS: "Access Request",
      CORRECTION: "Correction Request",
      DELETE: "Removal Request",
      STOP_SCORING: "Stop Scoring Request",
    },
    kindFallback: "Request",
    modes: {
      DELETE_DATA_ONLY: "Erase stored data only",
      DELETE_AND_EXCEPT: "Erase data & add score exception",
    },
    methods: {
      ACCOUNT_OWNERSHIP: "Account ownership verified",
      REQUEST_AUTHORIZATION: "Request authorization verified",
    },
    stages: {
      AWAITING_VERIFICATION: "Awaiting verification, not executed.",
      REJECTED: "Verification rejected; will not execute.",
      AWAITING_EXECUTION: "Verified and awaiting execution.",
      NOT_EXECUTED_HERE: "Not executed locally on this instance.",
      EXECUTING: "Executing cleanup targets.",
      COMPLETED: "Execution finished.",
      PARTIAL_FAILED: "Partially failed; see target details.",
      CANCELLED: "Cancelled; will not execute.",
    },
    verStates: { VERIFIED: "Verified", REJECTED: "Rejected", PENDING: "Pending Verification" },
    labelId: "Request ID",
    labelStage: "Current Stage",
    labelMethod: "Verification Method",
    targetDone: "Done",
    targetFailed: "Failed",
    targetPending: "Queued",
    pendingBanner: (n) => `${n} background cleanup target(s) still queued.`,
    verifyOwnership: "Verify: Account Ownership",
    verifyAuthorization: "Verify: Request Authorization",
    rejectVerify: "Reject Verification",
    executeBtn: "Execute Verified Request",
  },
  "zh-CN": {
    sectionAria: "请求状态",
    heading: "请求状态",
    emptyTitle: "这个主体还没有请求。",
    kinds: {
      ACCESS: "访问请求",
      CORRECTION: "更正请求",
      DELETE: "删除请求",
      STOP_SCORING: "停止计分请求",
    },
    kindFallback: "请求",
    modes: {
      DELETE_DATA_ONLY: "仅删除数据",
      DELETE_AND_EXCEPT: "删除并加入记分例外名单",
    },
    methods: {
      ACCOUNT_OWNERSHIP: "确认账号归属",
      REQUEST_AUTHORIZATION: "确认请求授权",
    },
    stages: {
      AWAITING_VERIFICATION: "待核验，尚未执行。",
      REJECTED: "核验未通过，不会执行。",
      AWAITING_EXECUTION: "已核验，等待执行。本页面不执行删除。",
      NOT_EXECUTED_HERE: "本实例暂不执行此类请求，停留在待处理。",
      EXECUTING: "执行中。",
      COMPLETED: "执行完成。",
      PARTIAL_FAILED: "部分失败，见下列条目。",
      CANCELLED: "已取消，不会执行。",
    },
    verStates: { VERIFIED: "已核验通过", REJECTED: "核验未通过", PENDING: "待核验" },
    labelId: "编号",
    labelStage: "当前阶段",
    labelMethod: "核验方式",
    targetDone: "处理完毕",
    targetFailed: "部分失败",
    targetPending: "队列处理中",
    pendingBanner: (n) => `尚有 ${n} 项后台处理任务处于队列中，尚未全部完成清理。`,
    verifyOwnership: "核验通过：确认账号归属",
    verifyAuthorization: "核验通过：确认请求授权",
    rejectVerify: "拒绝核验",
    executeBtn: "立即执行已核验请求",
  },
  ja: {
    sectionAria: "リクエスト状態",
    heading: "リクエスト状態",
    emptyTitle: "この対象の申請はまだありません。",
    kinds: {
      ACCESS: "開示請求",
      CORRECTION: "訂正請求",
      DELETE: "整理請求",
      STOP_SCORING: "採点停止請求",
    },
    kindFallback: "リクエスト",
    modes: {
      DELETE_DATA_ONLY: "データのみ整理",
      DELETE_AND_EXCEPT: "データ整理＆スコア例外へ登録",
    },
    methods: {
      ACCOUNT_OWNERSHIP: "アカウント所有権確認",
      REQUEST_AUTHORIZATION: "依頼権限確認",
    },
    stages: {
      AWAITING_VERIFICATION: "確認待ち（未実行）。",
      REJECTED: "確認却下のため実行されません。",
      AWAITING_EXECUTION: "確認済み・実行待ち。",
      NOT_EXECUTED_HERE: "本インスタンスでは自動実行対象外です。",
      EXECUTING: "処理実行中。",
      COMPLETED: "処理完了。",
      PARTIAL_FAILED: "一部失敗（下記対象を参照）。",
      CANCELLED: "取り消されました。",
    },
    verStates: { VERIFIED: "確認済み", REJECTED: "却下", PENDING: "確認待ち" },
    labelId: "リクエスト ID",
    labelStage: "現在ステージ",
    labelMethod: "確認方式",
    targetDone: "完了",
    targetFailed: "一部失敗",
    targetPending: "キュー処理中",
    pendingBanner: (n) => `バックグラウンド対象が残り ${n} 件キューに存在します。`,
    verifyOwnership: "承認：アカウント所有確認",
    verifyAuthorization: "承認：申請権限確認",
    rejectVerify: "却下",
    executeBtn: "確認済みリクエストを実行",
  },
  ko: {
    sectionAria: "요청 상태",
    heading: "요청 상태",
    emptyTitle: "이 주체에 대한 요청이 아직 없습니다.",
    kinds: {
      ACCESS: "열람 요청",
      CORRECTION: "정정 요청",
      DELETE: "정리 요청",
      STOP_SCORING: "채점 중단 요청",
    },
    kindFallback: "요청",
    modes: {
      DELETE_DATA_ONLY: "데이터만 정리",
      DELETE_AND_EXCEPT: "데이터 정리 및 점수 예외 등록",
    },
    methods: {
      ACCOUNT_OWNERSHIP: "계정 소유권 확인",
      REQUEST_AUTHORIZATION: "요청 권한 확인",
    },
    stages: {
      AWAITING_VERIFICATION: "검증 대기 중이며 아직 실행되지 않았습니다.",
      REJECTED: "검증이 거부되어 실행되지 않습니다.",
      AWAITING_EXECUTION: "검증 완료, 실행 대기 중.",
      NOT_EXECUTED_HERE: "이 인스턴스에서는 해당 요청을 실행하지 않습니다.",
      EXECUTING: "실행 중.",
      COMPLETED: "실행 완료.",
      PARTIAL_FAILED: "부분 실패 (아래 대상 참조).",
      CANCELLED: "취소됨.",
    },
    verStates: { VERIFIED: "검증됨", REJECTED: "거부됨", PENDING: "검증 대기" },
    labelId: "요청 번호",
    labelStage: "현재 단계",
    labelMethod: "검증 방식",
    targetDone: "처리 완료",
    targetFailed: "일부 실패",
    targetPending: "대기열 처리 중",
    pendingBanner: (n) => `백그라운드 대상 ${n}건이 대기열에 남아 있습니다.`,
    verifyOwnership: "승인: 계정 소유 확인",
    verifyAuthorization: "승인: 요청 권한 확인",
    rejectVerify: "검증 거부",
    executeBtn: "검증된 요청 실행",
  },
  fr: {
    sectionAria: "État des demandes",
    heading: "État des demandes",
    emptyTitle: "Aucune demande enregistrée pour ce sujet.",
    kinds: {
      ACCESS: "Demande d'accès",
      CORRECTION: "Demande de rectification",
      DELETE: "Demande d'effacement",
      STOP_SCORING: "Arrêt de la notation",
    },
    kindFallback: "Demande",
    modes: {
      DELETE_DATA_ONLY: "Effacer les données seules",
      DELETE_AND_EXCEPT: "Effacer et exclure de la notation",
    },
    methods: {
      ACCOUNT_OWNERSHIP: "Propriété du compte vérifiée",
      REQUEST_AUTHORIZATION: "Autorisation de demande vérifiée",
    },
    stages: {
      AWAITING_VERIFICATION: "En attente de vérification.",
      REJECTED: "Vérification refusée.",
      AWAITING_EXECUTION: "Vérifiée, en attente d'exécution.",
      NOT_EXECUTED_HERE: "Non exécutée sur cette instance.",
      EXECUTING: "Exécution en cours.",
      COMPLETED: "Exécution terminée.",
      PARTIAL_FAILED: "Échec partiel.",
      CANCELLED: "Annulée.",
    },
    verStates: { VERIFIED: "Vérifiée", REJECTED: "Refusée", PENDING: "En attente" },
    labelId: "Identifiant",
    labelStage: "Étape actuelle",
    labelMethod: "Méthode",
    targetDone: "Terminé",
    targetFailed: "Échec",
    targetPending: "En file",
    pendingBanner: (n) => `${n} cible(s) de nettoyage restent en file.`,
    verifyOwnership: "Valider : Propriété du compte",
    verifyAuthorization: "Valider : Autorisation",
    rejectVerify: "Refuser",
    executeBtn: "Exécuter la demande vérifiée",
  },
};

export interface LogsCopy {
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly chainAria: string;
  readonly filterAria: string;
  readonly filterLabel: string;
  readonly filterPlaceholder: string;
  readonly refreshBtn: string;
  readonly clearFilterBtn: string;
  readonly tabsAria: string;
  readonly tabs: { readonly technical: string; readonly change: string; readonly integration: string };
  readonly splitTechLabel: string;
  readonly emptyTechTitle: string;
  readonly viewDetailBtn: string;
  readonly viewChainBtn: string;
  readonly emptyTechDetailTitle: string;
  readonly changeSectionAria: string;
  readonly changeTableLabel: string;
  readonly colsChange: {
    readonly occurredAt: string;
    readonly kind: string;
    readonly outcome: string;
    readonly actor: string;
    readonly summary: string;
    readonly actions: string;
  };
  readonly traceChainBtn: string;
  readonly noChainLabel: string;
  readonly emptyChangeTitle: string;
  readonly splitIntLabel: string;
  readonly emptyIntTitle: string;
  readonly emptyIntDesc: string;
  readonly viewHttpBtn: string;
  readonly httpDetailAria: string;
  readonly adapterLabel: string;
  readonly reqSummaryLabel: string;
  readonly statusLatencyLabel: string;
  readonly corrLabel: string;
  readonly jumpChainBtn: string;
  readonly reqHeadersLabel: string;
  readonly copyHeadersLabel: string;
  readonly reqBodyLabel: string;
  readonly copyBodyLabel: string;
  readonly resHeadersLabel: string;
  readonly resBodyLabel: string;
  readonly copyResBodyLabel: string;
  readonly emptyIntDetailTitle: string;
  readonly techStatus: { readonly timedOut: string; readonly failed: string; readonly skipped: string; readonly ok: string };
  readonly changeKinds: Readonly<Record<ChangeKind, string>>;
  readonly changeOutcomes: Readonly<Record<ChangeOutcome, string>>;
  readonly errors: {
    readonly UNAUTHENTICATED: string;
    readonly FORBIDDEN: string;
    readonly NOT_FOUND: string;
    readonly NETWORK: string;
    readonly fallback: string;
    readonly nonError: string;
  };
  readonly chain: {
    readonly aria: string;
    readonly title: string;
    readonly prevBtn: string;
    readonly nextBtn: string;
    readonly backBtn: string;
    readonly loadingTitle: string;
    readonly emptyTitle: string;
    readonly splitLabel: string;
    readonly stepsHeader: (n: number) => string;
    readonly pickStepTitle: string;
  };
  readonly jsonPanel: {
    readonly aria: string;
    readonly loadingTitle: string;
    readonly headerTitle: (seq: number, stage: string) => string;
    readonly labelTask: string;
    readonly labelModel: string;
    readonly labelContract: string;
    readonly labelRuleVer: string;
    readonly labelBatch: string;
    readonly labelErrorCode: string;
    readonly none: string;
    readonly stageData: string;
    readonly expiredBadge: string;
    readonly emptyPayload: string;
    readonly invalidJsonBadge: string;
    readonly evidenceLabels: Readonly<Record<LogViewerEvidence["kind"], string>>;
  };
}

export const LOGS_COPY: Readonly<Record<VoxWardLocale, LogsCopy>> = {
  en: {
    pageTitle: "Audit Logs",
    pageDescription:
      "Bidirectional correlation search across technical processing pipelines, configuration change audits, and sanitized third-party HTTP logs.",
    chainAria: "Correlation chain trace",
    filterAria: "Log correlation filter",
    filterLabel: "Filter by correlation ID (cross-searches technical, change, and integration logs)",
    filterPlaceholder: "Enter correlation ID…",
    refreshBtn: "Refresh Logs",
    clearFilterBtn: "Clear filter",
    tabsAria: "Audit log categories",
    tabs: { technical: "Technical Logs", change: "Change Logs", integration: "Integration Logs" },
    splitTechLabel: "Technical log list and detail",
    emptyTechTitle: "No technical logs",
    viewDetailBtn: "View Detail",
    viewChainBtn: "Trace Chain",
    emptyTechDetailTitle: "Select a technical log on the left to inspect its stage snapshot",
    changeSectionAria: "Change audit table",
    changeTableLabel: "Change Logs",
    colsChange: {
      occurredAt: "Occurred At",
      kind: "Change Kind",
      outcome: "Outcome",
      actor: "Actor",
      summary: "Summary",
      actions: "Trace",
    },
    traceChainBtn: "Trace Pipeline",
    noChainLabel: "No chain",
    emptyChangeTitle: "No change records",
    splitIntLabel: "Sanitized HTTP integration logs",
    emptyIntTitle: "No integration HTTP logs yet",
    emptyIntDesc:
      "Redacted request headers and response payloads appear here after connection checks or remote model syncs in Integrations.",
    viewHttpBtn: "Inspect HTTP",
    httpDetailAria: "HTTP payload detail",
    adapterLabel: "Adapter Instance",
    reqSummaryLabel: "HTTP Request",
    statusLatencyLabel: "Status / Latency",
    corrLabel: "Correlation ID",
    jumpChainBtn: "Open Trace Chain",
    reqHeadersLabel: "Request Headers (auth secrets redacted by policy)",
    copyHeadersLabel: "Copy headers",
    reqBodyLabel: "Raw Request Body",
    copyBodyLabel: "Copy request body",
    resHeadersLabel: "Response Headers (redacted)",
    resBodyLabel: "Raw Response Body",
    copyResBodyLabel: "Copy response body",
    emptyIntDetailTitle: "Select an integration log on the left to inspect its HTTP request and response",
    techStatus: { timedOut: "Timed Out", failed: "Error", skipped: "Skipped", ok: "OK" },
    changeKinds: {
      CONFIG_CHANGED: "Config & Policy Update",
      MEMBER_GRANTED: "Member Granted",
      MEMBER_REVOKED: "Member Revoked",
      CREDENTIAL_CHANGED: "Output Credential Update",
      OUTPUT_GRANT_CHANGED: "Desktop Output Grant Update",
      LIST_CHANGED: "Viewer List Change",
      TERM_CHANGED: "Wordlist Maintenance",
      RULE_VERSION_PUBLISHED: "Rule Version Published",
      MANUAL_VERDICT: "Manual Moderation Verdict",
      SCORE_CHANGED: "Trust Score Adjusted",
      SCORE_EXCEPTION_CHANGED: "Score Exception Updated",
      DATA_REQUEST_CHANGED: "Data Compliance Request Updated",
    },
    changeOutcomes: { SUCCEEDED: "Succeeded", FAILED: "Failed", PARTIAL: "Partial" },
    errors: {
      UNAUTHENTICATED: "Please sign in first.",
      FORBIDDEN: "You do not have permission to view logs for this channel.",
      NOT_FOUND: "This log entry does not exist or has expired.",
      NETWORK: "Unable to connect to the server.",
      fallback: "Failed to load logs. Please try again later.",
      nonError: "Failed to load.",
    },
    chain: {
      aria: "Correlation chain timeline",
      title: "Processing Chain",
      prevBtn: "Previous Step",
      nextBtn: "Next Step",
      backBtn: "Back to List",
      loadingTitle: "Reconstructing trace chain…",
      emptyTitle: "No technical stages found for this correlation ID",
      splitLabel: "Pipeline steps and detail",
      stepsHeader: (n) => `Pipeline Steps (${n} total)`,
      pickStepTitle: "Select any pipeline stage to inspect detailed evidence",
    },
    jsonPanel: {
      aria: "Log Detail",
      loadingTitle: "Loading log detail…",
      headerTitle: (seq, stage) => `Log Detail · #${seq} ${stage}`,
      labelTask: "Task",
      labelModel: "Model",
      labelContract: "Contract Version",
      labelRuleVer: "Rule Template Version",
      labelBatch: "Batch",
      labelErrorCode: "Error Code",
      none: "None",
      stageData: "Stage Metadata (raw)",
      expiredBadge: "Content expired",
      emptyPayload: "Empty",
      invalidJsonBadge: "Invalid JSON syntax",
      evidenceLabels: {
        MESSAGE_TEXT: "Original Message Text",
        TRANSLATION: "Translation",
        ITEM_ID_MAP: "Item ID Map",
        VALIDATED_JSON: "Validated JSON",
      },
    },
  },
  "zh-CN": {
    pageTitle: "日志审计",
    pageDescription:
      "双向关联检索频道系统处理链路、配置变更审计日志以及第三方 HTTP 请求脱敏报文。",
    chainAria: "单条关联链路追查",
    filterAria: "日志关联筛选栏",
    filterLabel: "按关联追踪号检索（支持跨技术/变更/集成日志联合排查）",
    filterPlaceholder: "输入关联编号过滤…",
    refreshBtn: "刷新日志",
    clearFilterBtn: "清除过滤",
    tabsAria: "日志审计分类",
    tabs: { technical: "技术日志", change: "变更日志", integration: "集成日志" },
    splitTechLabel: "技术日志列表与详情",
    emptyTechTitle: "暂无技术日志",
    viewDetailBtn: "查看详情",
    viewChainBtn: "查看整条链路",
    emptyTechDetailTitle: "从左侧选择一条技术日志查看节点快照",
    changeSectionAria: "变更审计日志表",
    changeTableLabel: "变更日志",
    colsChange: {
      occurredAt: "发生时间",
      kind: "变更类别",
      outcome: "执行结果",
      actor: "操作主体",
      summary: "摘要说明",
      actions: "链路追踪",
    },
    traceChainBtn: "追踪处理链路",
    noChainLabel: "无关联链路",
    emptyChangeTitle: "暂无变更记录",
    splitIntLabel: "第三方集成 HTTP 日志与脱敏报文",
    emptyIntTitle: "暂无第三方集成请求日志",
    emptyIntDesc: "在「集成管理」执行连通检测或拉取模型列表后，脱敏请求头与原始返回体将记录于此。",
    viewHttpBtn: "查看 HTTP 报文",
    httpDetailAria: "HTTP 报文详情",
    adapterLabel: "适配器实例",
    reqSummaryLabel: "HTTP 请求摘要",
    statusLatencyLabel: "响应状态码 / 耗时",
    corrLabel: "关联追踪号",
    jumpChainBtn: "跳转关联链路",
    reqHeadersLabel: "请求头（已按安全策略自动脱敏敏感认证头）",
    copyHeadersLabel: "复制请求头",
    reqBodyLabel: "原始请求体",
    copyBodyLabel: "复制请求体",
    resHeadersLabel: "响应头（已脱敏）",
    resBodyLabel: "原始响应体",
    copyResBodyLabel: "复制响应体",
    emptyIntDetailTitle: "从左侧选择一条集成日志查看 HTTP 请求与响应原文",
    techStatus: { timedOut: "超时", failed: "异常", skipped: "跳过", ok: "完成" },
    changeKinds: {
      CONFIG_CHANGED: "系统与策略配置变更",
      MEMBER_GRANTED: "成员授权变更",
      MEMBER_REVOKED: "成员权限收回",
      CREDENTIAL_CHANGED: "输出令牌与凭据变更",
      OUTPUT_GRANT_CHANGED: "桌面输出授权变更",
      LIST_CHANGED: "观众名单调整",
      TERM_CHANGED: "审核词库维护",
      RULE_VERSION_PUBLISHED: "规则版本发布",
      MANUAL_VERDICT: "人工审核裁决",
      SCORE_CHANGED: "观众信任分调整",
      SCORE_EXCEPTION_CHANGED: "计分例外状态变更",
      DATA_REQUEST_CHANGED: "数据合规请求变更",
    },
    changeOutcomes: { SUCCEEDED: "成功", FAILED: "失败", PARTIAL: "部分成功" },
    errors: {
      UNAUTHENTICATED: "请先登录。",
      FORBIDDEN: "没有查看该频道日志的权限。",
      NOT_FOUND: "这条日志不存在，或已经到期。",
      NETWORK: "无法连接服务器。",
      fallback: "加载失败，请稍后再试。",
      nonError: "加载失败。",
    },
    chain: {
      aria: "关联链路时间线",
      title: "处理链",
      prevBtn: "上一条",
      nextBtn: "下一条",
      backBtn: "返回列表",
      loadingTitle: "正在重建关联链路…",
      emptyTitle: "该关联编号暂无处理节点",
      splitLabel: "链路步骤与细节视图",
      stepsHeader: (n) => `阶段顺序（共 ${n} 步）`,
      pickStepTitle: "请选择任一处理步骤查看详细日志与取证",
    },
    jsonPanel: {
      aria: "日志详情",
      loadingTitle: "正在加载详情…",
      headerTitle: (seq, stage) => `日志详情 · #${seq} ${stage}`,
      labelTask: "任务",
      labelModel: "模型",
      labelContract: "契约版本",
      labelRuleVer: "规则模板版本",
      labelBatch: "批次",
      labelErrorCode: "错误代码",
      none: "无",
      stageData: "阶段数据（原始）",
      expiredBadge: "内容已到期",
      emptyPayload: "空",
      invalidJsonBadge: "未通过 JSON 解析",
      evidenceLabels: {
        MESSAGE_TEXT: "消息原文",
        TRANSLATION: "译文",
        ITEM_ID_MAP: "临时编号映射",
        VALIDATED_JSON: "校验后 JSON",
      },
    },
  },
  ja: {
    pageTitle: "監査ログ",
    pageDescription: "技術処理パイプライン、設定変更監査ログ、マスク済み HTTP 連携ログを双方向に相関検索できます。",
    chainAria: "相関処理チェーン追跡",
    filterAria: "ログ相関フィルター",
    filterLabel: "相関 ID で絞り込み（技術・変更・連携ログを横断検索）",
    filterPlaceholder: "相関 ID を入力…",
    refreshBtn: "更新",
    clearFilterBtn: "クリア",
    tabsAria: "監査ログ分類",
    tabs: { technical: "技術ログ", change: "変更ログ", integration: "連携 HTTP ログ" },
    splitTechLabel: "技術ログ一覧と詳細",
    emptyTechTitle: "技術ログはありません",
    viewDetailBtn: "詳細を見る",
    viewChainBtn: "チェーン全体を追跡",
    emptyTechDetailTitle: "左側から技術ログを選択してスナップショットを表示",
    changeSectionAria: "変更監査テーブル",
    changeTableLabel: "変更ログ",
    colsChange: {
      occurredAt: "発生時刻",
      kind: "変更種別",
      outcome: "結果",
      actor: "操作主体",
      summary: "概要",
      actions: "チェーン追跡",
    },
    traceChainBtn: "処理チェーンを追跡",
    noChainLabel: "関連チェーンなし",
    emptyChangeTitle: "変更履歴はありません",
    splitIntLabel: "外部連携 HTTP ログと詳細",
    emptyIntTitle: "外部連携 HTTP ログはまだありません",
    emptyIntDesc: "「連携管理」で疎通確認やモデル取得を実行すると、認証情報をマスクした電文がここに記録されます。",
    viewHttpBtn: "HTTP 電文を表示",
    httpDetailAria: "HTTP 電文詳細",
    adapterLabel: "アダプター",
    reqSummaryLabel: "HTTP リクエスト",
    statusLatencyLabel: "ステータス / レイテンシ",
    corrLabel: "相関 ID",
    jumpChainBtn: "相関チェーンを開く",
    reqHeadersLabel: "リクエストヘッダー（機密ヘッダーは自動マスク済み）",
    copyHeadersLabel: "ヘッダーをコピー",
    reqBodyLabel: "生リクエストボディ",
    copyBodyLabel: "リクエストボディをコピー",
    resHeadersLabel: "レスポンスヘッダー（マスク済み）",
    resBodyLabel: "生レスポンスボディ",
    copyResBodyLabel: "レスポンスボディをコピー",
    emptyIntDetailTitle: "左側から連携ログを選択して HTTP 電文を確認してください",
    techStatus: { timedOut: "タイムアウト", failed: "異常", skipped: "スキップ", ok: "完了" },
    changeKinds: {
      CONFIG_CHANGED: "設定・ポリシー変更",
      MEMBER_GRANTED: "メンバー権限付与",
      MEMBER_REVOKED: "メンバー権限回収",
      CREDENTIAL_CHANGED: "出力トークン変更",
      OUTPUT_GRANT_CHANGED: "デスクトップ権限変更",
      LIST_CHANGED: "視聴者リスト変更",
      TERM_CHANGED: "用語辞書メンテナンス",
      RULE_VERSION_PUBLISHED: "ルールバージョン公開",
      MANUAL_VERDICT: "手動モデレーション判定",
      SCORE_CHANGED: "信頼スコア調整",
      SCORE_EXCEPTION_CHANGED: "スコア例外ステータス変更",
      DATA_REQUEST_CHANGED: "データ管理リクエスト変更",
    },
    changeOutcomes: { SUCCEEDED: "成功", FAILED: "失敗", PARTIAL: "一部成功" },
    errors: {
      UNAUTHENTICATED: "先にログインしてください。",
      FORBIDDEN: "このチャンネルのログ閲覧権限がありません。",
      NOT_FOUND: "このログは存在しないか有効期限が切れています。",
      NETWORK: "サーバーに接続できません。",
      fallback: "ログの読み込みに失敗しました。",
      nonError: "読み込みに失敗しました。",
    },
    chain: {
      aria: "相関チェーンタイムライン",
      title: "処理チェーン",
      prevBtn: "前へ",
      nextBtn: "次へ",
      backBtn: "一覧に戻る",
      loadingTitle: "処理チェーンを再構築しています…",
      emptyTitle: "この相関 ID のノードはありません",
      splitLabel: "チェーンステップと詳細",
      stepsHeader: (n) => `ステージ順序（計 ${n} ステップ）`,
      pickStepTitle: "任意のステップを選択して詳細ログと証跡を確認してください",
    },
    jsonPanel: {
      aria: "ログ詳細",
      loadingTitle: "詳細を読み込んでいます…",
      headerTitle: (seq, stage) => `ログ詳細 · #${seq} ${stage}`,
      labelTask: "タスク",
      labelModel: "モデル",
      labelContract: "コントラクト版",
      labelRuleVer: "ルールテンプレート版",
      labelBatch: "バッチ",
      labelErrorCode: "エラーコード",
      none: "なし",
      stageData: "ステージデータ（生データ）",
      expiredBadge: "期限切れ",
      emptyPayload: "空",
      invalidJsonBadge: "JSON 構文エラー",
      evidenceLabels: {
        MESSAGE_TEXT: "メッセージ原文",
        TRANSLATION: "翻訳文",
        ITEM_ID_MAP: "一時 ID マップ",
        VALIDATED_JSON: "検証済み JSON",
      },
    },
  },
  ko: {
    pageTitle: "감사 로그",
    pageDescription:
      "기술 처리 파이프라인, 설정 변경 감사 로그 및 마스킹된 HTTP 연동 로그를 양방향으로 상관 추적합니다.",
    chainAria: "상관 체인 추적",
    filterAria: "로그 상관 필터",
    filterLabel: "상관 추적 번호로 검색 (기술/변경/연동 로그 통합 조회)",
    filterPlaceholder: "상관 번호 입력…",
    refreshBtn: "로그 새로고침",
    clearFilterBtn: "필터 지우기",
    tabsAria: "감사 로그 분류",
    tabs: { technical: "기술 로그", change: "변경 로그", integration: "연동 로그" },
    splitTechLabel: "기술 로그 목록 및 상세",
    emptyTechTitle: "기술 로그가 없습니다",
    viewDetailBtn: "상세 보기",
    viewChainBtn: "전체 체인 추적",
    emptyTechDetailTitle: "왼쪽에서 기술 로그를 선택하여 단계 스냅샷을 확인하세요",
    changeSectionAria: "변경 감사 로그 표",
    changeTableLabel: "변경 로그",
    colsChange: {
      occurredAt: "발생 시각",
      kind: "변경 종류",
      outcome: "결과",
      actor: "작업자",
      summary: "요약",
      actions: "체인 추적",
    },
    traceChainBtn: "처리 체인 추적",
    noChainLabel: "연관 체인 없음",
    emptyChangeTitle: "변경 기록이 없습니다",
    splitIntLabel: "HTTP 연동 로그 및 마스킹 페이로드",
    emptyIntTitle: "서드파티 연동 HTTP 로그가 없습니다",
    emptyIntDesc: "「연동 관리」에서 연결 점검이나 모델 목록을 불러오면 마스킹된 전문이 여기에 기록됩니다.",
    viewHttpBtn: "HTTP 전문 보기",
    httpDetailAria: "HTTP 전문 상세",
    adapterLabel: "어댑터 인스턴스",
    reqSummaryLabel: "HTTP 요청 요약",
    statusLatencyLabel: "응답 코드 / 지연",
    corrLabel: "상관 추적 번호",
    jumpChainBtn: "상관 체인으로 이동",
    reqHeadersLabel: "요청 헤더 (민감 인증 헤더 자동 마스킹)",
    copyHeadersLabel: "요청 헤더 복사",
    reqBodyLabel: "요청 본문",
    copyBodyLabel: "요청 본문 복사",
    resHeadersLabel: "응답 헤더 (마스킹됨)",
    resBodyLabel: "응답 본문",
    copyResBodyLabel: "응답 본문 복사",
    emptyIntDetailTitle: "왼쪽에서 연동 로그를 선택하여 HTTP 요청 및 응답 원문을 확인하세요",
    techStatus: { timedOut: "시간 초과", failed: "오류", skipped: "건너뜀", ok: "완료" },
    changeKinds: {
      CONFIG_CHANGED: "시스템 및 정책 설정 변경",
      MEMBER_GRANTED: "멤버 권한 부여",
      MEMBER_REVOKED: "멤버 권한 회수",
      CREDENTIAL_CHANGED: "출력 토큰 및 자격 증명 변경",
      OUTPUT_GRANT_CHANGED: "데스크톱 출력 권한 변경",
      LIST_CHANGED: "시청자 목록 조정",
      TERM_CHANGED: "검토 용어 사전 관리",
      RULE_VERSION_PUBLISHED: "규칙 버전 배포",
      MANUAL_VERDICT: "수동 검토 판정",
      SCORE_CHANGED: "시청자 신뢰 점수 조정",
      SCORE_EXCEPTION_CHANGED: "점수 예외 상태 변경",
      DATA_REQUEST_CHANGED: "데이터 컴플라이언스 요청 변경",
    },
    changeOutcomes: { SUCCEEDED: "성공", FAILED: "실패", PARTIAL: "부분 성공" },
    errors: {
      UNAUTHENTICATED: "먼저 로그인하세요.",
      FORBIDDEN: "이 채널의 로그를 볼 권한이 없습니다.",
      NOT_FOUND: "로그 항목이 없거나 만료되었습니다.",
      NETWORK: "서버에 연결할 수 없습니다.",
      fallback: "로그를 불러오지 못했습니다.",
      nonError: "불러오기 실패.",
    },
    chain: {
      aria: "상관 체인 타임라인",
      title: "처리 체인",
      prevBtn: "이전 단계",
      nextBtn: "다음 단계",
      backBtn: "목록으로",
      loadingTitle: "상관 체인을 재구성하는 중…",
      emptyTitle: "이 상관 번호에 해당하는 단계가 없습니다",
      splitLabel: "체인 단계 및 상세 뷰",
      stepsHeader: (n) => `단계 순서 (총 ${n}단계)`,
      pickStepTitle: "처리 단계를 선택해 상세 로그와 증적을 확인하세요",
    },
    jsonPanel: {
      aria: "로그 상세",
      loadingTitle: "상세 정보를 불러오는 중…",
      headerTitle: (seq, stage) => `로그 상세 · #${seq} ${stage}`,
      labelTask: "작업",
      labelModel: "모델",
      labelContract: "계약 버전",
      labelRuleVer: "규칙 템플릿 버전",
      labelBatch: "배치",
      labelErrorCode: "오류 코드",
      none: "없음",
      stageData: "단계 데이터(원본)",
      expiredBadge: "콘텐츠 만료됨",
      emptyPayload: "비어 있음",
      invalidJsonBadge: "JSON 파싱 실패",
      evidenceLabels: {
        MESSAGE_TEXT: "메시지 원문",
        TRANSLATION: "번역문",
        ITEM_ID_MAP: "임시 ID 매핑",
        VALIDATED_JSON: "검증된 JSON",
      },
    },
  },
  fr: {
    pageTitle: "Journaux d'audit",
    pageDescription:
      "Recherche bidirectionnelle dans les pipelines techniques, modifications de configuration et journaux HTTP masqués.",
    chainAria: "Chaîne de corrélation",
    filterAria: "Filtre de corrélation",
    filterLabel: "Filtrer par identifiant de corrélation",
    filterPlaceholder: "Saisir l'identifiant…",
    refreshBtn: "Actualiser",
    clearFilterBtn: "Effacer",
    tabsAria: "Catégories de journaux",
    tabs: { technical: "Technique", change: "Modifications", integration: "Intégrations HTTP" },
    splitTechLabel: "Journaux techniques",
    emptyTechTitle: "Aucun journal technique",
    viewDetailBtn: "Voir détail",
    viewChainBtn: "Voir la chaîne",
    emptyTechDetailTitle: "Sélectionnez un journal technique à gauche",
    changeSectionAria: "Tableau des modifications",
    changeTableLabel: "Journaux de modification",
    colsChange: {
      occurredAt: "Date",
      kind: "Type",
      outcome: "Résultat",
      actor: "Acteur",
      summary: "Résumé",
      actions: "Chaîne",
    },
    traceChainBtn: "Tracer la chaîne",
    noChainLabel: "Sans chaîne",
    emptyChangeTitle: "Aucune modification",
    splitIntLabel: "Journaux HTTP d'intégration",
    emptyIntTitle: "Aucun journal HTTP tiers",
    emptyIntDesc: "Les en-têtes masqués et charges utiles apparaissent après un test ou une synchronisation dans Intégrations.",
    viewHttpBtn: "Voir HTTP",
    httpDetailAria: "Détail HTTP",
    adapterLabel: "Adaptateur",
    reqSummaryLabel: "Requête HTTP",
    statusLatencyLabel: "Statut / Latence",
    corrLabel: "Corrélation",
    jumpChainBtn: "Ouvrir la chaîne",
    reqHeadersLabel: "En-têtes requête (secrets masqués)",
    copyHeadersLabel: "Copier les en-têtes",
    reqBodyLabel: "Corps de requête brut",
    copyBodyLabel: "Copier le corps",
    resHeadersLabel: "En-têtes réponse (masqués)",
    resBodyLabel: "Corps de réponse brut",
    copyResBodyLabel: "Copier la réponse",
    emptyIntDetailTitle: "Sélectionnez un journal d'intégration à gauche",
    techStatus: { timedOut: "Expiré", failed: "Erreur", skipped: "Ignoré", ok: "OK" },
    changeKinds: {
      CONFIG_CHANGED: "Mise à jour configuration",
      MEMBER_GRANTED: "Accès membre accordé",
      MEMBER_REVOKED: "Accès membre révoqué",
      CREDENTIAL_CHANGED: "Jeton de sortie modifié",
      OUTPUT_GRANT_CHANGED: "Autorisation bureau modifiée",
      LIST_CHANGED: "Liste spectateurs modifiée",
      TERM_CHANGED: "Lexique mis à jour",
      RULE_VERSION_PUBLISHED: "Version de règles publiée",
      MANUAL_VERDICT: "Décision manuelle",
      SCORE_CHANGED: "Score ajusté",
      SCORE_EXCEPTION_CHANGED: "Exception de score modifiée",
      DATA_REQUEST_CHANGED: "Demande conformité mise à jour",
    },
    changeOutcomes: { SUCCEEDED: "Succès", FAILED: "Échec", PARTIAL: "Partiel" },
    errors: {
      UNAUTHENTICATED: "Veuillez vous connecter.",
      FORBIDDEN: "Accès refusé aux journaux de cette chaîne.",
      NOT_FOUND: "Journal introuvable ou expiré.",
      NETWORK: "Serveur injoignable.",
      fallback: "Échec du chargement des journaux.",
      nonError: "Échec du chargement.",
    },
    chain: {
      aria: "Chronologie de la chaîne",
      title: "Chaîne de traitement",
      prevBtn: "Précédent",
      nextBtn: "Suivant",
      backBtn: "Retour à la liste",
      loadingTitle: "Reconstruction de la chaîne…",
      emptyTitle: "Aucune étape trouvée",
      splitLabel: "Étapes et détails",
      stepsHeader: (n) => `Étapes du pipeline (${n} au total)`,
      pickStepTitle: "Sélectionnez une étape pour voir les détails",
    },
    jsonPanel: {
      aria: "Détail du journal",
      loadingTitle: "Chargement du détail…",
      headerTitle: (seq, stage) => `Détail · #${seq} ${stage}`,
      labelTask: "Tâche",
      labelModel: "Modèle",
      labelContract: "Version contrat",
      labelRuleVer: "Version règles",
      labelBatch: "Lot",
      labelErrorCode: "Code erreur",
      none: "Aucun",
      stageData: "Métadonnées brutes de l’étape",
      expiredBadge: "Contenu expiré",
      emptyPayload: "Vide",
      invalidJsonBadge: "JSON invalide",
      evidenceLabels: {
        MESSAGE_TEXT: "Message original",
        TRANSLATION: "Traduction",
        ITEM_ID_MAP: "Table de correspondance",
        VALIDATED_JSON: "JSON validé",
      },
    },
  },
};
