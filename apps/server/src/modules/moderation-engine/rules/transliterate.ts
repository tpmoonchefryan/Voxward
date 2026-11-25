import {
  DEFAULT_NORMALIZE_OPTIONS,
  type MappedText,
  type MappedUnit,
  type MatchField,
  type NormalizeOptions,
  normalizeUnit,
  splitUnits,
} from "./normalize.js";

/** A reading of a text. `complete` is false when some characters have no reading, so the reading is unreliable. */
export interface Reading {
  readonly mapped: MappedText;
  readonly complete: boolean;
}

/**
 * Local reading port. An implementation must not call an external service: the reading of a nickname
 * may not widen the data sent outside the server. `normalization` is the option set the keys were checked with
 * and the text is read with. A rule set must use the same set (S006 design 4.8).
 */
export interface Transliterator {
  readonly normalization: NormalizeOptions;
  /** False when backed by an empty reading table and unable to transliterate non-ASCII scripts. */
  readonly available?: boolean;
  transliterate(field: MatchField, text: string): Reading;
}

const READING = /^[a-z0-9]+$/;
const IGNORABLE = /^[\p{Z}\p{P}\p{S}]+$/u;

/**
 * Table-driven transliterator, the minimal implementation of the port. The table maps a normalized
 * character to its reading. ASCII letters and digits read as themselves. Spaces, punctuation and symbols
 * read as nothing. A character with no table entry makes the reading incomplete. No language library is used.
 * Keys are checked, and text is read, with `normalization`.
 */
export function createTableTransliterator(
  table: ReadonlyMap<string, string>,
  normalization: NormalizeOptions = DEFAULT_NORMALIZE_OPTIONS,
): Transliterator {
  const options: NormalizeOptions = { stripCombiningMarks: normalization.stripCombiningMarks };
  for (const [key, reading] of table) {
    const validKey = key.length > 0 && normalizeUnit(key, options) === key;
    if (!validKey || !READING.test(reading)) {
      throw new TypeError("transliteration table: keys must be normalized and readings must be [a-z0-9]+");
    }
  }
  return {
    normalization: options,
    available: table.size > 0,
    transliterate(field, text) {
      let reading = "";
      let complete = true;
      const units: MappedUnit[] = [];
      for (const unit of splitUnits(text)) {
        const spoken = readingOf(normalizeUnit(unit.raw, options), table);
        if (spoken === null) complete = false;
        const emitted = spoken ?? "";
        units.push({
          start: reading.length,
          end: reading.length + emitted.length,
          srcStart: unit.srcStart,
          srcEnd: unit.srcEnd,
          field,
        });
        reading += emitted;
      }
      return { mapped: { text: reading, units }, complete };
    },
  };
}

function readingOf(normal: string, table: ReadonlyMap<string, string>): string | null {
  if (normal.length === 0) return "";
  const tabled = table.get(normal);
  if (tabled !== undefined) return tabled;
  if (READING.test(normal)) return normal;
  if (IGNORABLE.test(normal)) return "";
  return null;
}

/**
 * Built-in local kana (Hiragana + Katakana) and common CJK homophone baseline readings so reading rules
 * and nickname transliteration operate locally without calling external services (VW3-R-008).
 */
const BUILTIN_RAW_READINGS: ReadonlyArray<readonly [string, string]> = [
  // Hiragana
  ["あ", "a"], ["い", "i"], ["う", "u"], ["え", "e"], ["お", "o"],
  ["か", "ka"], ["き", "ki"], ["く", "ku"], ["け", "ke"], ["こ", "ko"],
  ["が", "ga"], ["ぎ", "gi"], ["ぐ", "gu"], ["げ", "ge"], ["ご", "go"],
  ["さ", "sa"], ["し", "shi"], ["す", "su"], ["せ", "se"], ["そ", "so"],
  ["ざ", "za"], ["じ", "ji"], ["ず", "zu"], ["ぜ", "ze"], ["ぞ", "zo"],
  ["た", "ta"], ["ち", "chi"], ["つ", "tsu"], ["て", "te"], ["と", "to"],
  ["だ", "da"], ["ぢ", "ji"], ["づ", "zu"], ["で", "de"], ["ど", "do"],
  ["な", "na"], ["に", "ni"], ["ぬ", "nu"], ["ね", "ne"], ["の", "no"],
  ["は", "ha"], ["ひ", "hi"], ["ふ", "fu"], ["へ", "he"], ["ほ", "ho"],
  ["ば", "ba"], ["び", "bi"], ["ぶ", "bu"], ["べ", "be"], ["ぼ", "bo"],
  ["ぱ", "pa"], ["ぴ", "pi"], ["ぷ", "pu"], ["ぺ", "pe"], ["ぽ", "po"],
  ["ま", "ma"], ["み", "mi"], ["む", "mu"], ["め", "me"], ["も", "mo"],
  ["や", "ya"], ["ゆ", "yu"], ["よ", "yo"],
  ["ら", "ra"], ["り", "ri"], ["る", "ru"], ["れ", "re"], ["ろ", "ro"],
  ["わ", "wa"], ["を", "wo"], ["ん", "n"],
  ["ぁ", "a"], ["ぃ", "i"], ["ぅ", "u"], ["ぇ", "e"], ["ぉ", "o"],
  ["ゃ", "ya"], ["ゅ", "yu"], ["ょ", "yo"], ["っ", "t"],
  // Katakana
  ["ア", "a"], ["イ", "i"], ["ウ", "u"], ["エ", "e"], ["オ", "o"],
  ["カ", "ka"], ["キ", "ki"], ["ク", "ku"], ["ケ", "ke"], ["コ", "ko"],
  ["ガ", "ga"], ["ギ", "gi"], ["グ", "gu"], ["ゲ", "ge"], ["ゴ", "go"],
  ["サ", "sa"], ["シ", "shi"], ["ス", "su"], ["セ", "se"], ["ソ", "so"],
  ["ザ", "za"], ["ジ", "ji"], ["ズ", "zu"], ["ゼ", "ze"], ["ゾ", "zo"],
  ["タ", "ta"], ["チ", "chi"], ["ツ", "tsu"], ["テ", "te"], ["ト", "to"],
  ["ダ", "da"], ["ヂ", "ji"], ["ヅ", "zu"], ["デ", "de"], ["ド", "do"],
  ["ナ", "na"], ["ニ", "ni"], ["ヌ", "nu"], ["ネ", "ne"], ["ノ", "no"],
  ["ハ", "ha"], ["ヒ", "hi"], ["フ", "fu"], ["ヘ", "he"], ["ホ", "ho"],
  ["バ", "ba"], ["ビ", "bi"], ["ブ", "bu"], ["ベ", "be"], ["ボ", "bo"],
  ["パ", "pa"], ["ピ", "pi"], ["プ", "pu"], ["ペ", "pe"], ["ポ", "po"],
  ["マ", "ma"], ["ミ", "mi"], ["ム", "mu"], ["メ", "me"], ["モ", "mo"],
  ["ヤ", "ya"], ["ユ", "yu"], ["ヨ", "yo"],
  ["ラ", "ra"], ["リ", "ri"], ["ル", "ru"], ["レ", "re"], ["ロ", "ro"],
  ["ワ", "wa"], ["ヲ", "wo"], ["ン", "n"],
  ["ァ", "a"], ["ィ", "i"], ["ゥ", "u"], ["ェ", "e"], ["ォ", "o"],
  ["ャ", "ya"], ["ュ", "yu"], ["ョ", "yo"], ["ッ", "t"], ["ヴ", "vu"],
  // Baseline common CJK homophone & moderation characters
  ["禁", "jin"], ["进", "jin"], ["近", "jin"], ["词", "ci"], ["次", "ci"], ["此", "ci"],
  ["草", "cao"], ["操", "cao"], ["曹", "cao"], ["滚", "gun"], ["傻", "sha"], ["杀", "sha"],
  ["沙", "sha"], ["逼", "bi"], ["比", "bi"], ["闭", "bi"], ["死", "si"], ["私", "si"],
  ["丝", "si"], ["四", "si"], ["毒", "du"], ["赌", "du"], ["度", "du"], ["骗", "pian"],
  ["片", "pian"], ["钱", "qian"], ["前", "qian"], ["号", "hao"], ["好", "hao"], ["群", "qun"],
  ["信", "xin"], ["心", "xin"], ["新", "xin"], ["微", "wei"], ["加", "jia"], ["假", "jia"],
  ["买", "mai"], ["卖", "mai"], ["外", "wai"], ["挂", "gua"], ["代", "dai"], ["练", "lian"],
  ["刷", "shua"], ["赞", "zan"], ["粉", "fen"], ["水", "shui"], ["军", "jun"], ["黑", "hei"],
  ["红", "hong"], ["白", "bai"], ["黄", "huang"], ["绿", "lv"], ["色", "se"], ["情", "qing"],
  ["暴", "bao"], ["力", "li"], ["血", "xue"], ["腥", "xing"], ["敏", "min"], ["感", "gan"],
  ["妈", "ma"], ["骂", "ma"], ["马", "ma"], ["狗", "gou"], ["猪", "zhu"], ["蠢", "chun"],
  ["笨", "ben"], ["废", "fei"], ["物", "wu"], ["垃", "la"], ["圾", "ji"], ["嘴", "zui"],
  ["打", "da"], ["大", "da"], ["小", "xiao"], ["中", "zhong"], ["国", "guo"], ["人", "ren"],
  ["日", "ri"], ["本", "ben"], ["爱", "ai"], ["你", "ni"], ["我", "wo"], ["他", "ta"],
  ["她", "ta"], ["们", "men"], ["不", "bu"], ["是", "shi"], ["的", "de"], ["了", "le"],
  ["在", "zai"], ["有", "you"], ["和", "he"], ["测", "ce"], ["试", "shi"], ["名", "ming"],
  ["字", "zi"], ["星", "xing"], ["光", "guang"], ["夜", "ye"], ["月", "yue"], ["花", "hua"],
];

const cachedDefaultTransliterators = new Map<boolean, Transliterator>();

/** Builds the default built-in local transliterator for the given normalization options. */
export function createDefaultTransliterator(
  normalization: NormalizeOptions = DEFAULT_NORMALIZE_OPTIONS,
): Transliterator {
  const cached = cachedDefaultTransliterators.get(normalization.stripCombiningMarks);
  if (cached !== undefined) return cached;
  const table = new Map<string, string>();
  for (const [rawKey, reading] of BUILTIN_RAW_READINGS) {
    const normalizedKey = normalizeUnit(rawKey, normalization);
    if (normalizedKey.length > 0 && !table.has(normalizedKey) && READING.test(reading)) {
      table.set(normalizedKey, reading);
    }
  }
  const built = createTableTransliterator(table, normalization);
  cachedDefaultTransliterators.set(normalization.stripCombiningMarks, built);
  return built;
}
