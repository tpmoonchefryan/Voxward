import type { VoxWardLocale } from "../../i18n";
import type { TermCategoryView } from "./api";

const labels: Readonly<Record<VoxWardLocale, Readonly<Record<string, readonly [string, string]>>>> = {
  "en": {
    spam: ["Spam","Repeated messages, unsolicited links or ads"],
    abuse: ["Abuse","Insults, harassment and hate speech"],
    sensitive: ["Sensitive terms","Prohibited terms and evasive variants"],
    friendly: ["Community phrases","Common phrases confirmed safe for this community"],
  },
  "zh-CN": {
    spam: ["垃圾刷屏","高频重复、外链导流或广告垃圾信息"],
    abuse: ["人身攻击","辱骂、恶意骚扰与仇恨言论"],
    sensitive: ["高敏禁词","违禁词与规避变形表达"],
    friendly: ["常用热梗","已确认安全的社区友好高频词"],
  },
  "ja": {
    spam: ["スパム","連投、迷惑リンク、広告"],
    abuse: ["迷惑行為","侮辱、嫌がらせ、ヘイトスピーチ"],
    sensitive: ["要注意語句","禁止語句と検出回避の表記"],
    friendly: ["コミュニティの定番表現","安全が確認されたよく使う表現"],
  },
  "ko": {
    spam: ["스팸","반복 메시지, 원치 않는 링크 또는 광고"],
    abuse: ["괴롭힘","모욕, 괴롭힘 및 혐오 표현"],
    sensitive: ["주의 용어","금지어 및 탐지 회피 표현"],
    friendly: ["커뮤니티 표현","안전하다고 확인된 자주 쓰는 표현"],
  },
  "fr": {
    spam: ["Spam","Messages répétés, liens non sollicités ou publicités"],
    abuse: ["Abus","Insultes, harcèlement et discours haineux"],
    sensitive: ["Termes sensibles","Termes interdits et variantes de contournement"],
    friendly: ["Expressions de la communauté","Expressions courantes confirmées comme sûres"],
  },
};

export function localizeTermCategory(category: TermCategoryView, locale: VoxWardLocale): TermCategoryView {
  const copy = category.builtIn ? labels[locale][category.code] : undefined;
  return copy === undefined ? category : { ...category, label: copy[0], description: copy[1] };
}
