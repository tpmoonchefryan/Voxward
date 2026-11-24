import type { DemoRole, ScenarioId } from "../pages/sandbox/api";
import type { VoxWardLocale } from "./types";

export interface SandboxCopy {
  readonly bannerLabel: string;
  readonly bannerStateLabel: string;
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly workbenchAria: string;
  readonly consoleAria: string;
  readonly consoleHeading: string;
  readonly resetButton: string;
  readonly roleSwitcherAria: string;
  readonly roles: Readonly<Record<DemoRole, string>>;
  readonly scenariosAria: string;
  readonly scenarios: Readonly<Record<ScenarioId, string>>;
  readonly disabledStageViewer: string;
  readonly disabledNoPrivacy: string;
  readonly streamTitle: string;
  readonly streamRunning: string;
  readonly streamPaused: string;
  readonly streamCounts: (chatCount: number, scCount: number) => string;
  readonly nextScCountdown: (sec: number) => string;
  readonly pauseStreamBtn: string;
  readonly resumeStreamBtn: string;
  readonly pushScNowBtn: string;
  readonly chatCadenceLabel: string;
  readonly scIntervalLabel: string;
  readonly chatCadences: Readonly<Record<number, string>>;
  readonly scIntervals: Readonly<Record<number, string>>;
  readonly viewerDeniedTitle: string;
  readonly viewerDeniedDesc: string;
  readonly tabsAria: string;
  readonly tabs: {
    readonly moderation: string;
    readonly dock: string;
    readonly overlay: string;
    readonly data: string;
    readonly subjects: string;
  };
  readonly noModRoleTitle: string;
  readonly noModRoleDesc: string;
  readonly subjectsHeading: string;
  readonly subjectsTableLabel: string;
  readonly colSubject: string;
  readonly colScore: string;
  readonly colGen: string;
  readonly colException: string;
  readonly exceptionActive: string;
  readonly exceptionNormal: string;
  readonly emptySubjects: string;
  readonly errors: {
    readonly connect: string;
    readonly scenario: string;
    readonly decide: string;
    readonly reset: string;
  };
  readonly dockChannelName: string;
  readonly retentionCategory: string;
}

export const SANDBOX_COPY: Readonly<Record<VoxWardLocale, SandboxCopy>> = {
  en: {
    bannerLabel: "SYNTHETIC SANDBOX · Simulated demo environment (no real platform data)",
    bannerStateLabel: "Synthetic Env",
    pageTitle: "Interactive Sandbox",
    pageDescription:
      "Exercise moderation, Super Chat translation, score rejudgement, data cleanup, and 4-role RBAC directly with formal workbenches.",
    workbenchAria: "Sandbox Workspace",
    consoleAria: "Sandbox Controls",
    consoleHeading: "Role & Scenario Controller",
    resetButton: "Reset Sandbox",
    roleSwitcherAria: "Demo role switcher",
    roles: {
      DEMO_STREAMER: "Streamer View",
      DEMO_MODERATOR: "Moderator View",
      DEMO_PRIVACY_AUDITOR: "Data Auditor",
      DEMO_STAGE_VIEWER: "Stage Visitor",
    },
    scenariosAria: "Preset demo scenarios",
    scenarios: {
      "normal-scoring": "1. Normal Chat Scoring",
      "spam-toxicity-block": "2. Spam & Toxicity Block",
      "superchat-translation": "3. SC Translation & Tiers",
      "manual-review": "4. Queue Manual Review",
      "privacy-delete": "5. Delete Data Request",
      "privacy-delete-and-except": "6. Delete & Score Exception",
    },
    disabledStageViewer: "Stage Visitor role cannot trigger backend scenarios",
    disabledNoPrivacy: "Current demo role lacks data compliance permission",
    streamTitle: "Live Stream Simulator",
    streamRunning: "Stream Running",
    streamPaused: "Stream Paused",
    streamCounts: (c, s) => `Chat ${c} / SC ${s}`,
    nextScCountdown: (sec) => `Next SC in ~${sec}s`,
    pauseStreamBtn: "Pause Stream",
    resumeStreamBtn: "Resume Stream",
    pushScNowBtn: "+ Push SC Now",
    chatCadenceLabel: "Chat Cadence",
    scIntervalLabel: "SC Interval",
    chatCadences: {
      2500: "Calm (every 2.5s)",
      1400: "Standard (every 1.4s)",
      800: "Busy (every 0.8s)",
    },
    scIntervals: {
      5000: "Frequent (every 5s)",
      8000: "Standard (every 8s)",
      15000: "Relaxed (every 15s)",
    },
    viewerDeniedTitle: "Backend modules hidden by Stage Visitor policy",
    viewerDeniedDesc:
      "Stage Visitor only holds read-only public stage visibility; moderation, data export, and scenario triggers are disabled. Switch role above to test operator views.",
    tabsAria: "Sandbox formal workbench tabs",
    tabs: {
      moderation: "Moderation Workbench",
      dock: "Pure Danmaku Dock Preview",
      overlay: "OBS Overlay Stage Preview",
      data: "Data Compliance Workbench",
      subjects: "Scores & Logs Snapshot",
    },
    noModRoleTitle: "Moderation unavailable for Data Auditor role",
    noModRoleDesc: "Switch back to Streamer View or Moderator View to preview the live moderation workbench.",
    subjectsHeading: "Synthetic Viewer Trust Scores (In-Memory)",
    subjectsTableLabel: "Synthetic viewer scores table",
    colSubject: "Viewer Ref",
    colScore: "Trust Score",
    colGen: "Generation",
    colException: "Exception",
    exceptionActive: "Score Exception Active",
    exceptionNormal: "Normal Scoring",
    emptySubjects: "No synthetic viewers yet",
    errors: {
      connect: "Unable to connect to the local sandbox engine.",
      scenario: "Failed to trigger demo scenario.",
      decide: "Failed to submit sandbox review decision.",
      reset: "Failed to reset sandbox state.",
    },
    dockChannelName: "Synthetic Demo Room",
    retentionCategory: "Sandbox Synthetic Score Ledger",
  },
  "zh-CN": {
    bannerLabel: "SYNTHETIC SANDBOX · 合成演示环境（非真实平台数据）",
    bannerStateLabel: "合成环境",
    pageTitle: "交互演练沙盒",
    pageDescription:
      "直接复用 VoxWard 正式工作台页面演练审核、SC 精翻、评分重判、数据清理及四角色权限收敛。",
    workbenchAria: "演示沙盒工作区",
    consoleAria: "沙盒演示控制台",
    consoleHeading: "当前角色与合成情景控制台",
    resetButton: "一键重置沙盒状态",
    roleSwitcherAria: "演示角色切换",
    roles: {
      DEMO_STREAMER: "主播视图",
      DEMO_MODERATOR: "房管视图",
      DEMO_PRIVACY_AUDITOR: "数据合规员",
      DEMO_STAGE_VIEWER: "无后台访客",
    },
    scenariosAria: "预设业务演示场景",
    scenarios: {
      "normal-scoring": "1. 正常弹幕计分",
      "spam-toxicity-block": "2. 恶意与垃圾拦截",
      "superchat-translation": "3. SC 精翻与等级展示",
      "manual-review": "4. 触发人工审核队列",
      "privacy-delete": "5. 登记仅删数据请求",
      "privacy-delete-and-except": "6. 删除并加入记分例外",
    },
    disabledStageViewer: "仅舞台访客角色无权触发后台剧情",
    disabledNoPrivacy: "当前演练角色缺少数据合规处理权限",
    streamTitle: "实时弹幕流模拟器",
    streamRunning: "弹幕流运行中",
    streamPaused: "弹幕流已暂停",
    streamCounts: (c, s) => `弹幕 ${c} / SC ${s}`,
    nextScCountdown: (sec) => `约 ${sec} 秒后进下一条 SC`,
    pauseStreamBtn: "暂停弹幕流",
    resumeStreamBtn: "继续弹幕流",
    pushScNowBtn: "+ 立即进一条 SC",
    chatCadenceLabel: "弹幕频率",
    scIntervalLabel: "SC 进场间隔",
    chatCadences: {
      2500: "舒缓（每 2.5 秒）",
      1400: "标准（每 1.4 秒）",
      800: "热闹（每 0.8 秒）",
    },
    scIntervals: {
      5000: "高频（每 5 秒）",
      8000: "标准（每 8 秒）",
      15000: "舒缓（每 15 秒）",
    },
    viewerDeniedTitle: "后台功能已按当前角色策略拒止",
    viewerDeniedDesc:
      "「无后台访客」仅拥有公开舞台只读视角；审阅裁决、数据导出及情景触发能力均已禁用。如需体验正式管理员或房管界面，请在顶部横幅切换示范角色。",
    tabsAria: "沙盒复用的正式业务工作台",
    tabs: {
      moderation: "正式审核工作台视图",
      dock: "纯净弹幕姬预览",
      overlay: "OBS 投屏实时预览",
      data: "数据合规工作台视图",
      subjects: "沙盒积分与日志快照",
    },
    noModRoleTitle: "当前演练角色不具备审核裁决权限",
    noModRoleDesc: "当前选择的是数据合规员角色；请切回「主播视图」或「房管视图」体验审核工作台。",
    subjectsHeading: "演练观众当前信任分（合成内存态）",
    subjectsTableLabel: "演练观众积分表",
    colSubject: "观众标识",
    colScore: "信任分",
    colGen: "状态代数",
    colException: "例外状态",
    exceptionActive: "加入记分例外",
    exceptionNormal: "正常计分",
    emptySubjects: "暂无演示观众数据",
    errors: {
      connect: "无法连接本地演示沙盒引擎，请确认沙盒服务已运行。",
      scenario: "触发演示场景失败。",
      decide: "演示审阅提交失败。",
      reset: "重置沙盒失败。",
    },
    dockChannelName: "演练虚拟频道",
    retentionCategory: "沙盒合成积分流水",
  },
  ja: {
    bannerLabel: "SYNTHETIC SANDBOX · 合成デモ環境（実プラットフォームデータなし）",
    bannerStateLabel: "合成環境",
    pageTitle: "インタラクティブサンドボックス",
    pageDescription:
      "本番ワークベンチをそのまま使い、モデレーション、SC 翻訳、再判定、データ削除、4 ロール権限制御を検証できます。",
    workbenchAria: "サンドボックスワークスペース",
    consoleAria: "サンドボックス操作パネル",
    consoleHeading: "ロール＆シナリオコントローラー",
    resetButton: "サンドボックスを初期化",
    roleSwitcherAria: "デモロール切り替え",
    roles: {
      DEMO_STREAMER: "配信者ビュー",
      DEMO_MODERATOR: "モデレータービュー",
      DEMO_PRIVACY_AUDITOR: "データ監査担当",
      DEMO_STAGE_VIEWER: "ステージ閲覧者",
    },
    scenariosAria: "プリセットデモシナリオ",
    scenarios: {
      "normal-scoring": "1. 通常コメント加点",
      "spam-toxicity-block": "2. スパム・有害ブロック",
      "superchat-translation": "3. SC 翻訳＆ティア表示",
      "manual-review": "4. 人手審査キューへ送る",
      "privacy-delete": "5. データ削除のみ申請",
      "privacy-delete-and-except": "6. 削除＆スコア例外登録",
    },
    disabledStageViewer: "ステージ閲覧者ロールはシナリオを実行できません",
    disabledNoPrivacy: "現在のロールにはデータ管理権限がありません",
    streamTitle: "ライブコメントシミュレーター",
    streamRunning: "配信中",
    streamPaused: "一時停止中",
    streamCounts: (c, s) => `チャット ${c} / SC ${s}`,
    nextScCountdown: (sec) => `次の SC まで約 ${sec} 秒`,
    pauseStreamBtn: "ストリーム一時停止",
    resumeStreamBtn: "ストリーム再開",
    pushScNowBtn: "+ 今すぐ SC を追加",
    chatCadenceLabel: "コメント間隔",
    scIntervalLabel: "SC 出現間隔",
    chatCadences: {
      2500: "ゆったり (2.5秒毎)",
      1400: "標準 (1.4秒毎)",
      800: "活発 (0.8秒毎)",
    },
    scIntervals: {
      5000: "高頻度 (5秒毎)",
      8000: "標準 (8秒毎)",
      15000: "低頻度 (15秒毎)",
    },
    viewerDeniedTitle: "ステージ閲覧者ポリシーにより管理機能は非表示です",
    viewerDeniedDesc:
      "「ステージ閲覧者」は公開ステージの読み取りのみ許可されています。管理画面を体験するには上部で別ロールを選択してください。",
    tabsAria: "サンドボックス用本番ワークベンチタブ",
    tabs: {
      moderation: "審査ワークベンチ",
      dock: "シンプルコメントビュー",
      overlay: "OBS オーバーレイプレビュー",
      data: "データコンプライアンス",
      subjects: "スコア＆ログスナップショット",
    },
    noModRoleTitle: "データ監査ロールには審査権限がありません",
    noModRoleDesc: "「配信者ビュー」または「モデレータービュー」に切り替えて審査ワークベンチをお試しください。",
    subjectsHeading: "合成視聴者の信頼スコア（メモリ内）",
    subjectsTableLabel: "合成視聴者スコア一覧",
    colSubject: "視聴者識別子",
    colScore: "信頼スコア",
    colGen: "処理世代",
    colException: "例外ステータス",
    exceptionActive: "スコア例外適用",
    exceptionNormal: "通常採点",
    emptySubjects: "デモ視聴者データはまだありません",
    errors: {
      connect: "ローカルサンドボックスエンジンに接続できません。",
      scenario: "デモシナリオの実行に失敗しました。",
      decide: "サンドボックス判定の送信に失敗しました。",
      reset: "サンドボックスのリセットに失敗しました。",
    },
    dockChannelName: "サンドボックス仮想チャンネル",
    retentionCategory: "サンドボックス合成スコア台帳",
  },
  ko: {
    bannerLabel: "SYNTHETIC SANDBOX · 합성 데모 환경 (실제 플랫폼 데이터 없음)",
    bannerStateLabel: "합성 환경",
    pageTitle: "인터랙티브 샌드박스",
    pageDescription:
      "정식 워크벤치를 그대로 사용하여 검토, SC 번역, 점수 재판정, 데이터 삭제 및 4개 역할 RBAC를 체험하세요.",
    workbenchAria: "샌드박스 작업 영역",
    consoleAria: "샌드박스 데모 콘솔",
    consoleHeading: "역할 및 시나리오 제어판",
    resetButton: "샌드박스 초기화",
    roleSwitcherAria: "데모 역할 전환",
    roles: {
      DEMO_STREAMER: "스트리머 뷰",
      DEMO_MODERATOR: "모더레이터 뷰",
      DEMO_PRIVACY_AUDITOR: "데이터 감사자",
      DEMO_STAGE_VIEWER: "무대 방문자",
    },
    scenariosAria: "사전 설정 데모 시나리오",
    scenarios: {
      "normal-scoring": "1. 일반 채팅 점수 반영",
      "spam-toxicity-block": "2. 스팸 및 악성 차단",
      "superchat-translation": "3. SC 번역 및 등급 표시",
      "manual-review": "4. 수동 검토 대기열 추가",
      "privacy-delete": "5. 데이터 삭제 요청 등록",
      "privacy-delete-and-except": "6. 삭제 및 점수 예외 등록",
    },
    disabledStageViewer: "무대 방문자 역할은 백엔드 시나리오를 실행할 수 없습니다",
    disabledNoPrivacy: "현재 역할에 데이터 컴플라이언스 권한이 없습니다",
    streamTitle: "실시간 채팅 시뮬레이터",
    streamRunning: "실행 중",
    streamPaused: "일시정지됨",
    streamCounts: (c, s) => `채팅 ${c} / SC ${s}`,
    nextScCountdown: (sec) => `다음 SC까지 약 ${sec}초`,
    pauseStreamBtn: "스트림 일시정지",
    resumeStreamBtn: "스트림 재개",
    pushScNowBtn: "+ 즉시 SC 추가",
    chatCadenceLabel: "채팅 빈도",
    scIntervalLabel: "SC 간격",
    chatCadences: {
      2500: "여유 (2.5초마다)",
      1400: "표준 (1.4초마다)",
      800: "활발 (0.8초마다)",
    },
    scIntervals: {
      5000: "고빈도 (5초마다)",
      8000: "표준 (8초마다)",
      15000: "여유 (15초마다)",
    },
    viewerDeniedTitle: "현재 역할 정책에 의해 백엔드 기능이 제한되었습니다",
    viewerDeniedDesc:
      "「무대 방문자」는 공개 무대 읽기 전용 화면만 볼 수 있습니다. 운영자 화면을 보려면 위에서 역할을 전환하세요.",
    tabsAria: "샌드박스 정식 워크벤치 탭",
    tabs: {
      moderation: "실시간 검토 워크벤치",
      dock: "클린 채팅 독 미리보기",
      overlay: "OBS 오버레이 미리보기",
      data: "데이터 컴플라이언스",
      subjects: "점수 및 로그 스냅샷",
    },
    noModRoleTitle: "데이터 감사자 역할에는 검토 권한이 없습니다",
    noModRoleDesc: "실시간 검토 워크벤치를 보려면 「스트리머 뷰」 또는 「모더레이터 뷰」로 전환하세요.",
    subjectsHeading: "합성 시청자 신뢰 점수 (인메모리)",
    subjectsTableLabel: "시청자 신뢰 점수 표",
    colSubject: "시청자 식별자",
    colScore: "신뢰 점수",
    colGen: "처리 세대",
    colException: "예외 상태",
    exceptionActive: "점수 예외 적용됨",
    exceptionNormal: "정상 점수 산정",
    emptySubjects: "시뮬레이션된 시청자 데이터가 없습니다",
    errors: {
      connect: "로컬 샌드박스 엔진에 연결할 수 없습니다.",
      scenario: "데모 시나리오 실행에 실패했습니다.",
      decide: "검토 판정 제출에 실패했습니다.",
      reset: "샌드박스 초기화에 실패했습니다.",
    },
    dockChannelName: "샌드박스 가상 채널",
    retentionCategory: "샌드박스 합성 점수 원장",
  },
  fr: {
    bannerLabel: "SYNTHETIC SANDBOX · Environnement simulé (aucune donnée réelle)",
    bannerStateLabel: "Env. Synthétique",
    pageTitle: "Bac à sable interactif",
    pageDescription:
      "Testez la modération, la traduction Super Chat, la réévaluation, la suppression et les 4 rôles RBAC dans les vues officielles.",
    workbenchAria: "Espace Bac à sable",
    consoleAria: "Console du Bac à sable",
    consoleHeading: "Contrôleur de rôle et scénarios",
    resetButton: "Réinitialiser",
    roleSwitcherAria: "Sélecteur de rôle démo",
    roles: {
      DEMO_STREAMER: "Vue Streamer",
      DEMO_MODERATOR: "Vue Modérateur",
      DEMO_PRIVACY_AUDITOR: "Auditeur Données",
      DEMO_STAGE_VIEWER: "Visiteur Scène",
    },
    scenariosAria: "Scénarios prédéfinis",
    scenarios: {
      "normal-scoring": "1. Notation normale",
      "spam-toxicity-block": "2. Blocage spam & toxicité",
      "superchat-translation": "3. Traduction SC & paliers",
      "manual-review": "4. File d'attente manuelle",
      "privacy-delete": "5. Demande d'effacement",
      "privacy-delete-and-except": "6. Effacement & exception",
    },
    disabledStageViewer: "Le rôle Visiteur ne peut pas déclencher de scénarios serveur",
    disabledNoPrivacy: "Le rôle actuel n'a pas l'autorisation de conformité",
    streamTitle: "Simulateur de flux en direct",
    streamRunning: "Flux actif",
    streamPaused: "Flux en pause",
    streamCounts: (c, s) => `Messages ${c} / SC ${s}`,
    nextScCountdown: (sec) => `Prochain SC dans ~${sec}s`,
    pauseStreamBtn: "Mettre en pause",
    resumeStreamBtn: "Reprendre le flux",
    pushScNowBtn: "+ Envoyer un SC",
    chatCadenceLabel: "Cadence chat",
    scIntervalLabel: "Intervalle SC",
    chatCadences: {
      2500: "Calme (toutes les 2,5s)",
      1400: "Standard (toutes les 1,4s)",
      800: "Intense (toutes les 0,8s)",
    },
    scIntervals: {
      5000: "Fréquent (5s)",
      8000: "Standard (8s)",
      15000: "Espacé (15s)",
    },
    viewerDeniedTitle: "Modules d'administration restreints pour ce rôle",
    viewerDeniedDesc:
      "Le rôle Visiteur de scène dispose uniquement de la vue publique en lecture seule. Changez de rôle ci-dessus pour tester les outils opérateur.",
    tabsAria: "Vues officielles réutilisées",
    tabs: {
      moderation: "Atelier de Modération",
      dock: "Aperçu Dock épuré",
      overlay: "Aperçu Scène OBS",
      data: "Conformité des Données",
      subjects: "Scores & Journaux",
    },
    noModRoleTitle: "Modération indisponible pour le rôle Auditeur Données",
    noModRoleDesc: "Revenez à Vue Streamer ou Vue Modérateur pour accéder à l'atelier de modération.",
    subjectsHeading: "Scores de confiance synthétiques (en mémoire)",
    subjectsTableLabel: "Tableau des scores synthétiques",
    colSubject: "Identifiant spectateur",
    colScore: "Score",
    colGen: "Génération",
    colException: "Exception",
    exceptionActive: "Exception active",
    exceptionNormal: "Notation normale",
    emptySubjects: "Aucune donnée spectateur",
    errors: {
      connect: "Impossible de joindre le moteur de bac à sable local.",
      scenario: "Échec du déclenchement du scénario.",
      decide: "Échec de la décision de modération.",
      reset: "Échec de la réinitialisation du bac à sable.",
    },
    dockChannelName: "Chaîne Démo Synthétique",
    retentionCategory: "Registre de scores synthétique",
  },
};
