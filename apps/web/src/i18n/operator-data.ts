import { TECHNICAL_STAGES, type TechnicalStage } from "@voxward/contracts";
import type { VoxWardLocale } from "./types";

const labels = {
  "en": ["Technical logs","Evidence","Change logs","Data request certificate"],
  "zh-CN": ["技术日志","证据","变更日志","数据请求凭证"],
  "ja": ["技術ログ","証跡","変更ログ","データ請求の証明書"],
  "ko": ["기술 로그","증거","변경 로그","데이터 요청 증명서"],
  "fr": ["Journaux techniques","Éléments de preuve","Journaux de modifications","Certificat de demande de données"],
} as const;

export function dataCategoryLabel(category: string, locale: VoxWardLocale): string {
  const index = ["TECHNICAL_LOG", "EVIDENCE", "CHANGE_LOG"].indexOf(category);
  return labels[locale][index] ?? category;
}

const summaries = {
  "en": ["Manual decision: blocked","Manual decision: allowed","Decision revised","Score corrected from ledger","Manual score adjustment required after a limit was reached","Expired message delivered again","Data request registered","Data request verification recorded","Deletion started","Controlled material generated","Score exception removed","Score exception added"],
  "zh-CN": ["人工裁决：拦截","人工裁决：放行","已复核改判","已依据账本纠正计分","触及评分上下限，需手动调整","已人工补发过期消息","已登记数据请求","已记录请求核验结果","已开始删除","已生成受控材料","已移除记分例外","已加入记分例外"],
  "ja": ["手動判定：ブロック","手動判定：許可","判定を変更","台帳に基づきスコアを修正","上限または下限に達したため手動調整が必要","期限切れメッセージを再配信","データ請求を登録","確認結果を記録","削除を開始","管理対象の資料を作成","スコアの例外を解除","スコアの例外を追加"],
  "ko": ["수동 판정: 차단","수동 판정: 허용","판정 변경","원장에 따라 점수 수정","한도 도달로 수동 조정 필요","만료된 메시지를 다시 전송함","데이터 요청 등록","요청 확인 결과 기록","삭제 시작","관리 자료 생성","점수 예외 해제","점수 예외 추가"],
  "fr": ["Décision manuelle : blocage","Décision manuelle : autorisation","Décision révisée","Score corrigé d’après le registre","Ajustement manuel requis après atteinte d’une limite","Message expiré renvoyé","Demande de données enregistrée","Vérification de la demande enregistrée","Suppression démarrée","Données contrôlées générées","Exception de score supprimée","Exception de score ajoutée"],
} as const;

const auditPatterns = [
  /^人工裁决：拦截$/, /^人工裁决：放行$/, /^复核改判：(拦截|放行) → (拦截|放行)$/,
  /^纠正计分（依据账本记录）$/, /^纠分需人工调整：其后有条目触及上下限$/, /^人工补发：过期消息重新投递$/,
  /^DATA_REQUEST registered .* request=(\S+)$/, /^DATA_REQUEST verification=.* request=(\S+)$/,
  /^DATA_REQUEST deletion started .* request=(\S+)$/, /^CONTROLLED_MATERIAL_GENERATED .* request=(\S+)$/,
  /^记分例外已恢复计分，请求 (\S+)$/, /^记分例外已加入（[^）]+），请求 (\S+)$/,
];

export function auditSummaryLabel(summary: string, locale: VoxWardLocale): string {
  if (summary === "DATA_REQUEST_CERTIFICATE") return labels[locale][3];
  for (const [index, pattern] of auditPatterns.entries()) {
    const match = pattern.exec(summary);
    const label = summaries[locale][index];
    if (match === null || label === undefined) continue;
    if (index === 2) {
      const verdict = (tag: string | undefined) => summaries[locale][tag === "拦截" ? 0 : 1];
      return `${label}: ${verdict(match[1])} → ${verdict(match[2])}`;
    }
    return match[1] === undefined ? label : `${label} (${match[1]})`;
  }
  return summary;
}

const stageLabels = {
  en: ["Ingestion", "Base rule check", "Routing", "Model call", "JSON validation", "Commit", "Delivery", "Error"],
  "zh-CN": ["接收事件", "基础规则检查", "路由", "模型调用", "JSON 校验", "提交", "投递", "错误"],
  ja: ["取り込み", "基本ルールの確認", "ルーティング", "モデル呼び出し", "JSON 検証", "確定", "配信", "エラー"],
  ko: ["수집", "기본 규칙 검사", "라우팅", "모델 호출", "JSON 검증", "확정", "전송", "오류"],
  fr: ["Ingestion", "Vérification des règles de base", "Routage", "Appel du modèle", "Validation JSON", "Enregistrement", "Diffusion", "Erreur"],
} as const;

export function auditStageLabel(stage: TechnicalStage, locale: VoxWardLocale): string {
  return stageLabels[locale][TECHNICAL_STAGES.indexOf(stage)] ?? stage;
}
