import { canonicalizeContentLanguage } from "@voxward/contracts";

const HIRAGANA_OR_KATAKANA = /[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\uFF66-\uFF9F]/u;
const HANGUL = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/u;
const HAN = /\p{Script=Han}/u;
const LATIN = /\p{Script=Latin}/u;

const FRENCH_STRONG_MARKS = /[œæèêëîïôùûç]/iu;
const SPANISH_STRONG_MARKS = /[¿¡ñ]/iu;
const PORTUGUESE_STRONG_MARKS = /[ãõ]/iu;

const FRENCH_WORDS = new Set([
  "bonjour", "bonsoir", "merci", "salut", "avec", "pour", "vous", "nous", "mais", "dans",
  "très", "tres", "être", "etre", "pourquoi", "bienvenue", "vraiment", "incroyable", "chanson",
  "soirée", "soiree", "beaucoup", "français", "francais", "c'est", "qu'est", "alerte", "voilà",
]);
const SPANISH_WORDS = new Set([
  "hola", "gracias", "buenas", "noches", "pero", "para", "como", "está", "esta", "estás",
  "estas", "muy", "qué", "que", "canción", "cancion", "amigos", "también", "tambien",
  "siempre", "mucho", "saludos", "español", "espanol", "genial", "porque", "todo", "bien",
]);
const PORTUGUESE_WORDS = new Set([
  "olá", "ola", "obrigado", "obrigada", "você", "voce", "vocês", "voces", "muito", "noite",
  "tudo", "não", "nao", "parabéns", "parabens", "música", "musica", "melhor", "demais",
  "galera", "brasil", "português", "portugues", "bom", "boa", "estou", "aqui", "hoje",
]);

function detectLatinLanguage(text: string): "fr" | "es" | "pt-BR" | "en" {
  let fr = FRENCH_STRONG_MARKS.test(text) ? 2 : 0;
  let es = SPANISH_STRONG_MARKS.test(text) ? 3 : 0;
  let pt = PORTUGUESE_STRONG_MARKS.test(text) ? 3 : 0;

  if (/[à]/iu.test(text)) fr += 1;
  if (/[ç]/iu.test(text) && /(?:ção|ções|çã)/iu.test(text)) {
    pt += 3;
    fr = Math.max(0, fr - 1);
  }
  if (/[áéíóú]/iu.test(text)) {
    es += 0.5;
    pt += 0.5;
  }

  const tokens = text.toLowerCase().match(/[\p{Script=Latin}']+/gu) ?? [];
  for (const token of tokens) {
    if (FRENCH_WORDS.has(token)) fr += 1.5;
    if (SPANISH_WORDS.has(token)) es += 1.5;
    if (PORTUGUESE_WORDS.has(token)) pt += 1.5;
  }

  const best = Math.max(fr, es, pt);
  if (best < 2) return "en";
  const winners: Array<"fr" | "es" | "pt-BR"> = [];
  if (fr === best) winners.push("fr");
  if (es === best) winners.push("es");
  if (pt === best) winners.push("pt-BR");
  return winners.length === 1 ? winners[0]! : "en";
}

/**
 * Lightweight local script + Latin-language detector returning canonical language tags
 * (`ja`, `ko`, `zh-Hans`, `fr`, `es`, `pt-BR`, `en`, `"mixed"`, or `"und"`).
 */
export function detectMessageLanguage(text: string): string {
  const hasKana = HIRAGANA_OR_KATAKANA.test(text);
  const hasHangul = HANGUL.test(text);
  const hasHan = HAN.test(text);
  const hasLatin = LATIN.test(text);

  if (hasKana) {
    if (hasHangul || hasLatin) return "mixed";
    return "ja";
  }
  if (hasHangul) {
    if (hasHan || hasLatin) return "mixed";
    return "ko";
  }
  if (hasHan) {
    return hasLatin ? "mixed" : "zh-Hans";
  }
  if (hasLatin) return detectLatinLanguage(text);
  return "und";
}

function primarySubtag(tag: string): string {
  const dash = tag.indexOf("-");
  return dash === -1 ? tag.toLowerCase() : tag.slice(0, dash).toLowerCase();
}

/**
 * Checks whether a rule scoped to `ruleLanguage` applies to a message whose detected/declared language is `messageLanguage`.
 */
export function matchLanguageScope(ruleLanguage: string | undefined, messageLanguage: string): boolean {
  if (ruleLanguage === undefined || ruleLanguage === "") return true;
  const ruleCanonical = canonicalizeContentLanguage(ruleLanguage);
  if (ruleCanonical === null || ruleCanonical === "und") return true;

  const msgCanonical = canonicalizeContentLanguage(messageLanguage) ?? "und";
  if (msgCanonical === "mixed" || msgCanonical === "und") return true;
  if (ruleCanonical === msgCanonical) return true;

  // Different Chinese scripts (zh-Hans vs zh-Hant) stay scoped unless the rule is untagged ("und").
  if (primarySubtag(ruleCanonical) === "zh" || primarySubtag(msgCanonical) === "zh") {
    return false;
  }
  return primarySubtag(ruleCanonical) === primarySubtag(msgCanonical);
}
