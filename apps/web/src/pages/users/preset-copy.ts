import type { VoxWardLocale } from "../../i18n";
import type { RbacRoleView } from "./api";

const presets = ["role-owner", "role-moderator", "role-data-admin"];
const copy = {
  "en": ["Channel owner","Moderator","Privacy and data administrator"],
  "zh-CN": ["频道所有者","房管","隐私与数据管理员"],
  "ja": ["チャンネル所有者","モデレーター","プライバシー・データ管理者"],
  "ko": ["채널 소유자","채팅 관리자","개인정보 및 데이터 관리자"],
  "fr": ["Propriétaire de la chaîne","Modérateur","Responsable des données personnelles"],
} as const;

export function localizeRole(role: RbacRoleView, locale: VoxWardLocale): RbacRoleView {
  const index = role.systemPreset ? presets.indexOf(role.id) : -1;
  const name = copy[locale][index];
  return name === undefined ? role : { ...role, name };
}
