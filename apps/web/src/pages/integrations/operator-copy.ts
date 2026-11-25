import type { VoxWardLocale } from "../../i18n";
import { formatNumber } from "../../i18n/format";
import type { ChannelAdapterView } from "./api";

const keys = ["kiro-cli","openai-compat","anthropic-compat","obs-overlay-source","native-readonly-protocol","test-connection","reauthorize","restart-ingest","cli-self-check","cleanup-orphans","fetch-models","issue-output-token","issue-output-grant","CONFIG_SAVED","SIMULATED_ACTION","SIMULATED_MODELS","OUTPUT_CONFIGURED","STATUS_UNKNOWN"];
const labels = {
  "en": ["Kiro CLI runtime","OpenAI-compatible","Anthropic-compatible","OBS overlay","blivechat / native read-only output","Check connection","Reauthorize OAuth","Restart ingestion","Run CLI self-check","Clean up orphan runs","Fetch model list","Issue OBS token","Issue desktop grant","Configuration saved","Simulation completed","Simulated model list loaded","Read-only output configured","No status available"],
  "zh-CN": ["Kiro CLI 本地运行时","OpenAI 兼容适配器","Anthropic 兼容适配器","OBS 投屏源","blivechat / 原生只读输出","检测连接","重新授权 OAuth","重启拉流","执行 CLI 自检","清理残留运行目录","获取模型列表","签发 OBS 令牌","签发桌面凭据","配置已保存","模拟操作已完成","已载入模拟模型列表","已配置只读输出","状态不可用"],
  "ja": ["Kiro CLI ランタイム","OpenAI 互換","Anthropic 互換","OBS オーバーレイ","blivechat / ネイティブ読み取り専用出力","接続を確認","OAuth を再認証","取り込みを再起動","CLI の自己診断","残った実行ディレクトリを削除","モデル一覧を取得","OBS トークンを発行","デスクトップ用資格情報を発行","設定を保存しました","シミュレーションが完了しました","模擬モデル一覧を取得しました","読み取り専用出力を設定しました","状態は不明です"],
  "ko": ["Kiro CLI 런타임","OpenAI 호환","Anthropic 호환","OBS 오버레이","blivechat / 네이티브 읽기 전용 출력","연결 확인","OAuth 재인증","수집 다시 시작","CLI 자체 진단 실행","남은 실행 디렉터리 정리","모델 목록 가져오기","OBS 토큰 발급","데스크톱 권한 발급","설정을 저장했습니다","시뮬레이션을 완료했습니다","모의 모델 목록을 가져왔습니다","읽기 전용 출력을 설정했습니다","상태 정보 없음"],
  "fr": ["Exécution Kiro CLI","Compatible OpenAI","Compatible Anthropic","Superposition OBS","Sortie blivechat / native en lecture seule","Vérifier la connexion","Réautoriser OAuth","Redémarrer l’ingestion","Lancer l’autodiagnostic CLI","Nettoyer les exécutions orphelines","Récupérer les modèles","Émettre un jeton OBS","Émettre un accès bureau","Configuration enregistrée","Simulation terminée","Liste simulée de modèles chargée","Sortie en lecture seule configurée","Aucun état disponible"],
} as const;

export function integrationLabel(locale: VoxWardLocale, code: string, fallback: string): string {
  return labels[locale][keys.indexOf(code)] ?? fallback;
}

export function integrationStatus(locale: VoxWardLocale, adapter: ChannelAdapterView): string {
  const legacy = adapter.lastStatus;
  const count = /^已从远端拉取 (\d+) 个可用模型$/.exec(legacy)?.[1];
  const details = adapter.lastStatusDetails ?? (
    legacy === "已保存配置" ? { code: "CONFIG_SAVED" } :
    count !== undefined ? { code: "SIMULATED_MODELS", count: Number(count) } :
    legacy.startsWith("已执行运维动作：") ? { code: "SIMULATED_ACTION" } :
    legacy === "OBS 透明投屏通道就绪" || legacy === "blivechat / 原生只读输出通道就绪"
      ? { code: "OUTPUT_CONFIGURED" } : { code: "STATUS_UNKNOWN" }
  );
  const label = integrationLabel(locale, details.code, integrationLabel(locale, "STATUS_UNKNOWN", ""));
  return details.count === undefined ? label : `${label} (${formatNumber(details.count, locale)})`;
}
