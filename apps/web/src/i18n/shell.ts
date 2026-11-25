import type { ShellLocaleOption } from "@tcrn/ui-react/approved";
import type { VoxWardLocale } from "./types";

export const SHELL_LOCALES: readonly ShellLocaleOption[] = [
  { locale: "en", nativeName: "English", lang: "en" },
  { locale: "zh-CN", nativeName: "简体中文", lang: "zh-Hans" },
  { locale: "ja", nativeName: "日本語", lang: "ja" },
  { locale: "ko", nativeName: "한국어", lang: "ko" },
  { locale: "fr", nativeName: "Français", lang: "fr" },
];

export interface NavItemText {
  readonly label: string;
  readonly description: string;
}

export interface NavCopy {
  readonly workspaceGroup: string;
  readonly workspaceDescription: string;
  readonly backofficeGroup: string;
  readonly backofficeDescription: string;
  readonly items: {
    readonly overview: NavItemText;
    readonly moderation: NavItemText;
    readonly blocked: NavItemText;
    readonly data: NavItemText;
    readonly dock: NavItemText;
    readonly sandbox: NavItemText;
    readonly guides: NavItemText;
    readonly logs: NavItemText;
    readonly integrations: NavItemText;
    readonly users: NavItemText;
    readonly settings: NavItemText;
  };
  readonly disabledReasons: {
    readonly moderation: string;
    readonly blocked: string;
    readonly data: string;
    readonly logs: string;
    readonly integrations: string;
    readonly users: string;
    readonly settings: string;
  };
}

export const NAV_COPY: Readonly<Record<VoxWardLocale, NavCopy>> = {
  en: {
    workspaceGroup: "Workspace",
    workspaceDescription: "Moderation, blocked records, data compliance, and live views",
    backofficeGroup: "Administration",
    backofficeDescription: "Audit logs, integrations, members & RBAC, and channel settings",
    items: {
      overview: { label: "Overview", description: "Service health check and quick workspace launcher" },
      moderation: { label: "Moderation", description: "Real-time moderation queue, AI candidates, and bypass stream" },
      blocked: { label: "Blocked", description: "Confirmed blocked records, score rejudge, and manual blocklist" },
      data: { label: "Data Compliance", description: "Subject lookup, export verification, and async deletion" },
      dock: { label: "Pure Danmaku Dock", description: "Open frameless single-column YouTube-style live chat dock" },
      sandbox: { label: "Sandbox", description: "Interactive demo scenarios, stream simulator, and role switching" },
      guides: { label: "Guides", description: "Compatibility matrix, loopback topology, and troubleshooting" },
      logs: { label: "Audit Logs", description: "Technical, change, and sanitized HTTP integration logs" },
      integrations: { label: "Integrations", description: "Live platform, AI provider adapters, and output credentials" },
      users: { label: "Users & RBAC", description: "Member assignment and Deny > Grant > Not Set tri-state matrix" },
      settings: { label: "Settings", description: "Wordlists, CSV import, SC translation, scoring, and retention" },
    },
    disabledReasons: {
      moderation: "Missing moderation read permission",
      blocked: "Missing blocked records management permission",
      data: "Requires data compliance permission",
      logs: "Requires log audit access",
      integrations: "Requires integrations management permission",
      users: "Requires member & role management permission",
      settings: "Requires settings management permission",
    },
  },
  "zh-CN": {
    workspaceGroup: "直播工作台",
    workspaceDescription: "审核、拦截管理、数据合规与现场视图",
    backofficeGroup: "系统管理",
    backofficeDescription: "日志审计、适配器集成、成员权限与设置",
    items: {
      overview: { label: "工作台概览", description: "服务健康检查与快速工作台入口" },
      moderation: { label: "审核后台", description: "实时待审队列、AI 候选词确认与直播旁路流" },
      blocked: { label: "拦截管理", description: "已拦截记录评分重判与本地黑名单管理" },
      data: { label: "数据合规", description: "用户记录核查、导出与匿名化删除" },
      dock: { label: "纯净弹幕姬", description: "在新窗口打开 YouTube 风格单栏纯净弹幕姬" },
      sandbox: { label: "演练沙盒", description: "预设演示场景与四角色权限演练环境" },
      guides: { label: "接入指南", description: "平台兼容矩阵、桌面回环拓扑与排障清单" },
      logs: { label: "日志审计", description: "技术日志、变更日志与第三方 HTTP 集成日志" },
      integrations: { label: "集成管理", description: "直播平台与 AI 提供商适配器及输出凭据" },
      users: { label: "成员权限", description: "频道成员分配与 Deny > Grant > Not Set 权限模型" },
      settings: { label: "系统设置", description: "规则词库、CSV 导入、计分与数据保留策略" },
    },
    disabledReasons: {
      moderation: "当前账号缺少实时审核权限",
      blocked: "当前账号缺少拦截管理权限",
      data: "需具备数据合规处理权限",
      logs: "需获授日志审计访问权限",
      integrations: "需具备系统集成与输出配置权限",
      users: "需具备成员与权限管理职责",
      settings: "需具备系统设置与词库维护权限",
    },
  },
  ja: {
    workspaceGroup: "配信ワークスペース",
    workspaceDescription: "モデレーション、ブロック管理、データコンプライアンス、ライブ表示",
    backofficeGroup: "システム管理",
    backofficeDescription: "監査ログ、連携管理、メンバー権限、チャンネル設定",
    items: {
      overview: { label: "概要", description: "サービス稼働状況とワークスペース起動" },
      moderation: { label: "モデレーション", description: "リアルタイム審査キュー、AI候補ワード確認、バイパス配信" },
      blocked: { label: "ブロック管理", description: "ブロック履歴のスコア再判定と手動ブロックリスト" },
      data: { label: "データ管理", description: "視聴者データ照会、本人確認、非同期削除申請" },
      dock: { label: "シンプルコメントビュー", description: "YouTube 風 1 列ライブコメント表示を新規ウィンドウで開く" },
      sandbox: { label: "サンドボックス", description: "合成シナリオ、コメントシミュレーター、権限ロール切替" },
      guides: { label: "導入ガイド", description: "互換マトリクス、ループバック構成、トラブルシューティング" },
      logs: { label: "監査ログ", description: "技術ログ、変更履歴、HTTP 連携ログの確認" },
      integrations: { label: "連携管理", description: "配信プラットフォーム、AI プロバイダー、出力認証情報" },
      users: { label: "メンバーと権限", description: "複数ロール割り当てと Deny > Grant > Not Set 権限マトリクス" },
      settings: { label: "設定", description: "用語辞書、CSV 取込、SC 翻訳、スコア・保持ポリシー" },
    },
    disabledReasons: {
      moderation: "審査キューの閲覧権限がありません",
      blocked: "ブロック管理の権限がありません",
      data: "データコンプライアンス権限が必要です",
      logs: "監査ログの閲覧権限が必要です",
      integrations: "連携および出力設定の権限が必要です",
      users: "メンバーおよびロール管理の権限が必要です",
      settings: "システム設定および辞書管理の権限が必要です",
    },
  },
  ko: {
    workspaceGroup: "방송 워크스페이스",
    workspaceDescription: "실시간 검토, 차단 관리, 데이터 컴플라이언스 및 라이브 뷰",
    backofficeGroup: "시스템 관리",
    backofficeDescription: "감사 로그, 연동 관리, 멤버 권한 및 채널 설정",
    items: {
      overview: { label: "개요", description: "서비스 상태 점검 및 빠른 워크스페이스 이동" },
      moderation: { label: "실시간 검토", description: "검토 대기열, AI 후보 용어 확인 및 라이브 바이패스 스트림" },
      blocked: { label: "차단 관리", description: "확정된 차단 기록 점수 재판정 및 수동 차단 목록" },
      data: { label: "데이터 컴플라이언스", description: "시청자 기록 조회, 검증 및 비동기 삭제 처리" },
      dock: { label: "클린 채팅 독", description: "새 창에서 YouTube 스타일 단일 열 클린 채팅 독 열기" },
      sandbox: { label: "연습 샌드박스", description: "사전 시나리오, 채팅 시뮬레이터 및 역할 전환 검증" },
      guides: { label: "연동 가이드", description: "지원 매트릭스, 로컬 루프백 토폴로지 및 문제 해결" },
      logs: { label: "감사 로그", description: "기술 로그, 변경 로그 및 HTTP 연동 마스킹 로그" },
      integrations: { label: "연동 관리", description: "방송 플랫폼, AI 어댑터 및 읽기 전용 출력 자격 증명" },
      users: { label: "사용자 및 권한", description: "다중 역할 할당 및 Deny > Grant > Not Set 3상태 권한" },
      settings: { label: "설정", description: "용어 사전, CSV 가져오기, SC 번역, 점수 및 보관 정책" },
    },
    disabledReasons: {
      moderation: "실시간 검토 읽기 권한이 없습니다",
      blocked: "차단 기록 관리 권한이 없습니다",
      data: "데이터 컴플라이언스 권한이 필요합니다",
      logs: "감사 로그 접근 권한이 필요합니다",
      integrations: "연동 및 출력 구성 권한이 필요합니다",
      users: "사용자 및 역할 관리 권한이 필요합니다",
      settings: "설정 및 용어 사전 관리 권한이 필요합니다",
    },
  },
  fr: {
    workspaceGroup: "Espace direct",
    workspaceDescription: "Modération, blocages, conformité des données et vues en direct",
    backofficeGroup: "Administration",
    backofficeDescription: "Journaux d'audit, intégrations, rôles RBAC et paramètres",
    items: {
      overview: { label: "Vue d'ensemble", description: "État du service et accès rapide aux espaces de travail" },
      moderation: { label: "Modération", description: "File temps réel, termes IA suggérés et flux direct" },
      blocked: { label: "Blocages", description: "Messages bloqués, réévaluation du score et liste noire" },
      data: { label: "Données", description: "Consultation des profils, vérification et suppression asynchrone" },
      dock: { label: "Dock épuré", description: "Ouvrir le dock de chat épuré style YouTube dans une fenêtre" },
      sandbox: { label: "Bac à sable", description: "Scénarios synthétiques, simulateur de chat et rôles" },
      guides: { label: "Guides", description: "Matrice de support, boucle locale et dépannage" },
      logs: { label: "Journaux", description: "Journaux techniques, modifications et requêtes HTTP" },
      integrations: { label: "Intégrations", description: "Plateformes, fournisseurs IA et jetons de sortie" },
      users: { label: "Utilisateurs", description: "Attribution des rôles et matrice Deny > Grant > Not Set" },
      settings: { label: "Paramètres", description: "Listes de termes, import CSV, traduction SC et rétention" },
    },
    disabledReasons: {
      moderation: "Autorisation de lecture de modération manquante",
      blocked: "Autorisation de gestion des blocages manquante",
      data: "Autorisation de conformité des données requise",
      logs: "Accès aux journaux d'audit requis",
      integrations: "Autorisation de gestion des intégrations requise",
      users: "Autorisation de gestion des membres requise",
      settings: "Autorisation de gestion des paramètres requise",
    },
  },
};

export interface ShellChromeCopy {
  readonly activeChannel: string;
  readonly signIn: string;
  readonly signOut: string;
  readonly guest: string;
  readonly sessionRequiredTitle: string;
  readonly sessionRequiredBody: string;
  readonly signInNow: string;
  readonly stageVisitorRestricted: {
    readonly moderation: string;
    readonly blocked: string;
    readonly data: string;
    readonly logs: string;
    readonly integrations: string;
    readonly users: string;
    readonly settings: string;
  };
}

export const SHELL_CHROME_COPY: Readonly<Record<VoxWardLocale, ShellChromeCopy>> = {
  en: {
    activeChannel: "Active channel",
    signIn: "Sign in",
    signOut: "Sign out",
    guest: "Guest",
    sessionRequiredTitle: "Session required",
    sessionRequiredBody: "Sign in with an operator or channel admin account to continue.",
    signInNow: "Sign in",
    stageVisitorRestricted: {
      moderation: "Stage Viewer role has no moderation permission",
      blocked: "Stage Viewer role has no blocklist management permission",
      data: "Stage Viewer role has no data compliance permission",
      logs: "Stage Viewer role has no audit log access",
      integrations: "Stage Viewer role has no integration management permission",
      users: "Stage Viewer role has no user management permission",
      settings: "Stage Viewer role has no settings management permission",
    },
  },
  "zh-CN": {
    activeChannel: "当前频道",
    signIn: "登录账号",
    signOut: "退出登录",
    guest: "未登录",
    sessionRequiredTitle: "需要登录会话",
    sessionRequiredBody: "请先登录操作员或频道管理员账号，再访问当前工作台内容。",
    signInNow: "立即登录",
    stageVisitorRestricted: {
      moderation: "仅舞台访客角色无后台审核权限",
      blocked: "仅舞台访客角色无拦截管理权限",
      data: "仅舞台访客角色无数据合规权限",
      logs: "仅舞台访客角色无审计日志权限",
      integrations: "仅舞台访客角色无集成管理权限",
      users: "仅舞台访客角色无成员管理权限",
      settings: "仅舞台访客角色无系统设置权限",
    },
  },
  ja: {
    activeChannel: "現在のチャンネル",
    signIn: "ログイン",
    signOut: "ログアウト",
    guest: "ゲスト",
    sessionRequiredTitle: "ログインが必要です",
    sessionRequiredBody: "ワークスペースにアクセスするには運用者または管理者のアカウントでログインしてください。",
    signInNow: "今すぐログイン",
    stageVisitorRestricted: {
      moderation: "ステージ閲覧者ロールにはモデレーション権限がありません",
      blocked: "ステージ閲覧者ロールにはブロック管理権限がありません",
      data: "ステージ閲覧者ロールにはデータ管理権限がありません",
      logs: "ステージ閲覧者ロールには監査ログ権限がありません",
      integrations: "ステージ閲覧者ロールには連携管理権限がありません",
      users: "ステージ閲覧者ロールにはメンバー管理権限がありません",
      settings: "ステージ閲覧者ロールには設定権限がありません",
    },
  },
  ko: {
    activeChannel: "현재 채널",
    signIn: "로그인",
    signOut: "로그아웃",
    guest: "게스트",
    sessionRequiredTitle: "로그인 세션 필요",
    sessionRequiredBody: "계속하려면 운영자 또는 채널 관리자 계정으로 로그인하세요.",
    signInNow: "로그인하기",
    stageVisitorRestricted: {
      moderation: "스테이지 방문자 역할에는 검토 권한이 없습니다",
      blocked: "스테이지 방문자 역할에는 차단 관리 권한이 없습니다",
      data: "스테이지 방문자 역할에는 데이터 관리 권한이 없습니다",
      logs: "스테이지 방문자 역할에는 감사 로그 권한이 없습니다",
      integrations: "스테이지 방문자 역할에는 연동 관리 권한이 없습니다",
      users: "스테이지 방문자 역할에는 사용자 관리 권한이 없습니다",
      settings: "스테이지 방문자 역할에는 설정 권한이 없습니다",
    },
  },
  fr: {
    activeChannel: "Chaîne active",
    signIn: "Connexion",
    signOut: "Déconnexion",
    guest: "Invité",
    sessionRequiredTitle: "Session requise",
    sessionRequiredBody: "Connectez-vous avec un compte opérateur ou administrateur pour continuer.",
    signInNow: "Se connecter",
    stageVisitorRestricted: {
      moderation: "Le rôle Visiteur de scène n'a pas accès à la modération",
      blocked: "Le rôle Visiteur de scène n'a pas accès aux blocages",
      data: "Le rôle Visiteur de scène n'a pas accès aux données",
      logs: "Le rôle Visiteur de scène n'a pas accès aux journaux",
      integrations: "Le rôle Visiteur de scène n'a pas accès aux intégrations",
      users: "Le rôle Visiteur de scène n'a pas accès aux utilisateurs",
      settings: "Le rôle Visiteur de scène n'a pas accès aux paramètres",
    },
  },
};

export interface LoginCopy {
  readonly pageAria: string;
  readonly cardAria: string;
  readonly heading: string;
  readonly subtitle: string;
  readonly accountLabel: string;
  readonly accountPlaceholder: string;
  readonly passwordLabel: string;
  readonly passwordPlaceholder: string;
  readonly showPassword: string;
  readonly hidePassword: string;
  readonly submitLabel: string;
  readonly backHome: string;
  readonly publicNavAria: string;
  readonly sandboxLink: string;
  readonly guidesLink: string;
  readonly languageButtonAria: string;
  readonly languageMenuLabel: string;
  readonly invalidCredentialsError: string;
  readonly networkError: string;
}

export const LOGIN_COPY: Readonly<Record<VoxWardLocale, LoginCopy>> = {
  en: {
    pageAria: "VoxWard Sign In",
    cardAria: "Sign in to VoxWard",
    heading: "Sign in",
    subtitle: "Enter your operator account and password to continue",
    accountLabel: "Account",
    accountPlaceholder: "Enter account",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter password",
    showPassword: "Show",
    hidePassword: "Hide",
    submitLabel: "Sign in",
    backHome: "Back to overview",
    publicNavAria: "Public destinations",
    sandboxLink: "Sandbox",
    guidesLink: "Guides",
    languageButtonAria: "Switch sign-in page language",
    languageMenuLabel: "Sign-in page language",
    invalidCredentialsError: "Invalid account or password. Please try again.",
    networkError: "Sign-in request failed. Check your network connection.",
  },
  "zh-CN": {
    pageAria: "VoxWard 登录页",
    cardAria: "登录 VoxWard",
    heading: "登录",
    subtitle: "输入操作员账号与密码以继续",
    accountLabel: "登录账号",
    accountPlaceholder: "输入登录账号",
    passwordLabel: "密码",
    passwordPlaceholder: "输入密码",
    showPassword: "显示",
    hidePassword: "隐藏",
    submitLabel: "确认登录",
    backHome: "返回概览",
    publicNavAria: "公开入口",
    sandboxLink: "演练沙盒",
    guidesLink: "接入指南",
    languageButtonAria: "切换登录页语言",
    languageMenuLabel: "登录页显示语言",
    invalidCredentialsError: "账号或密码不正确，请重试。",
    networkError: "登录请求失败，请检查网络连接。",
  },
  ja: {
    pageAria: "VoxWard ログインページ",
    cardAria: "VoxWard にログイン",
    heading: "ログイン",
    subtitle: "続行するには運用者アカウントとパスワードを入力してください",
    accountLabel: "アカウント",
    accountPlaceholder: "アカウント名を入力",
    passwordLabel: "パスワード",
    passwordPlaceholder: "パスワードを入力",
    showPassword: "表示",
    hidePassword: "非表示",
    submitLabel: "ログイン",
    backHome: "概要に戻る",
    publicNavAria: "公開ページ",
    sandboxLink: "サンドボックス",
    guidesLink: "導入ガイド",
    languageButtonAria: "ログイン画面の言語を切り替え",
    languageMenuLabel: "ログイン画面の表示言語",
    invalidCredentialsError: "アカウントまたはパスワードが正しくありません。",
    networkError: "ログインに失敗しました。ネットワーク接続をご確認ください。",
  },
  ko: {
    pageAria: "VoxWard 로그인 페이지",
    cardAria: "VoxWard 로그인",
    heading: "로그인",
    subtitle: "계속하려면 운영자 계정과 비밀번호를 입력하세요",
    accountLabel: "계정",
    accountPlaceholder: "계정 입력",
    passwordLabel: "비밀번호",
    passwordPlaceholder: "비밀번호 입력",
    showPassword: "표시",
    hidePassword: "숨기기",
    submitLabel: "로그인",
    backHome: "개요로 돌아가기",
    publicNavAria: "공개 페이지",
    sandboxLink: "샌드박스",
    guidesLink: "연동 가이드",
    languageButtonAria: "로그인 페이지 언어 전환",
    languageMenuLabel: "로그인 페이지 표시 언어",
    invalidCredentialsError: "계정 또는 비밀번호가 올바르지 않습니다.",
    networkError: "로그인 요청에 실패했습니다. 네트워크 연결을 확인하세요.",
  },
  fr: {
    pageAria: "Connexion VoxWard",
    cardAria: "Se connecter à VoxWard",
    heading: "Connexion",
    subtitle: "Saisissez votre compte opérateur et votre mot de passe pour continuer",
    accountLabel: "Compte",
    accountPlaceholder: "Saisir le compte",
    passwordLabel: "Mot de passe",
    passwordPlaceholder: "Saisir le mot de passe",
    showPassword: "Afficher",
    hidePassword: "Masquer",
    submitLabel: "Se connecter",
    backHome: "Retour à l'accueil",
    publicNavAria: "Accès publics",
    sandboxLink: "Bac à sable",
    guidesLink: "Guides",
    languageButtonAria: "Changer la langue de connexion",
    languageMenuLabel: "Langue de la page de connexion",
    invalidCredentialsError: "Compte ou mot de passe invalide. Veuillez réessayer.",
    networkError: "Échec de la connexion. Vérifiez votre connexion réseau.",
  },
};
