import { canonicalLanguageTag } from "./sc-languages.js";

export function messageLanguageOf(text: string, known?: string): string {
  const tag = canonicalLanguageTag(known);
  if (tag !== null && tag !== "und" && tag !== "auto") return tag;
  const normalized = text.normalize("NFKC");
  const kana = /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(normalized);
  const hangul = /\p{Script=Hangul}/u.test(normalized);
  const han = /\p{Script=Han}/u.test(normalized);
  const latin = /\p{Script=Latin}/u.test(normalized);
  const cyrillic = /\p{Script=Cyrillic}/u.test(normalized);
  const greek = /\p{Script=Greek}/u.test(normalized);
  const arabic = /\p{Script=Arabic}/u.test(normalized);
  if ([kana || han, hangul, latin, cyrillic, greek, arabic].filter(Boolean).length > 1 && !(han && hangul && !kana && !latin && !cyrillic && !greek && !arabic)) {
    return "mixed";
  }
  return kana ? "ja" : hangul ? "ko" : "und";
}

export function languageScopeOf(ruleLanguage: string, messageLanguage: string): "match" | "uncertain" | "different" {
  if (ruleLanguage === "und" || ruleLanguage === messageLanguage) return "match";
  if (messageLanguage === "und" || messageLanguage === "mixed") return "uncertain";
  if (ruleLanguage === "mixed") return "different";
  const [ruleBase] = ruleLanguage.split("-");
  const [messageBase] = messageLanguage.split("-");
  if (ruleBase !== messageBase) return "different";
  return ruleLanguage === ruleBase ? "match" : "uncertain";
}
