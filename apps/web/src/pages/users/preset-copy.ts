import type { VoxWardLocale } from "../../i18n";
import type { RbacRoleView } from "./api";

const presets = ["role-owner", "role-moderator", "role-data-admin"];
const copy = {
  "en": ["Channel owner","Moderator","Privacy and data administrator","Full channel administration","Manage moderation and wordlists","Handle viewer data requests"],
  "zh-CN": ["频道所有者","房管","隐私与数据管理员","管理频道的全部功能","管理审核与词表","处理观众数据请求"],
  "ja": ["チャンネル所有者","モデレーター","プライバシー・データ管理者","チャンネル全体を管理","モデレーションと用語リストを管理","視聴者データの請求に対応"],
  "ko": ["채널 소유자","채팅 관리자","개인정보 및 데이터 관리자","채널 전체 관리","검토 및 단어 목록 관리","시청자 데이터 요청 처리"],
  "fr": ["Propriétaire de la chaîne","Modérateur","Responsable des données personnelles","Administrer toute la chaîne","Gérer la modération et les lexiques","Traiter les demandes de données des spectateurs"],
} as const;

export function localizeRole(role: RbacRoleView, locale: VoxWardLocale): RbacRoleView {
  const index = role.systemPreset ? presets.indexOf(role.id) : -1;
  const name = copy[locale][index];
  const description = copy[locale][index + presets.length];
  return index < 0 || name === undefined || description === undefined ? role : { ...role, name, description };
}
