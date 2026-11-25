import type { VoxWardLocale } from "../../i18n";

export const CSV_ENCODINGS = ["utf-8", "shift_jis", "euc-kr"] as const;
export type CsvEncoding = (typeof CSV_ENCODINGS)[number];

export function decodeTermCsv(bytes: ArrayBuffer, encoding: CsvEncoding): string {
  return new TextDecoder(encoding, { fatal: true }).decode(bytes);
}

const labels = {
  en: ["File encoding", "Could not decode the file. Select its encoding or convert it to UTF-8.", "Invalid quotes", "Too many columns", "Invalid term or category", "Invalid match kind", "Invalid language tag", "Wordlist limit reached", "Invalid regular expression", "Could not import row"],
  "zh-CN": ["文件编码", "无法解码文件。请选择对应编码或转换为 UTF-8。", "引号格式不正确", "列数过多", "词条或分类无效", "匹配方式无效", "语言标签无效", "词表已达上限", "正则表达式无效", "无法导入该行"],
  ja: ["ファイルの文字コード", "ファイルを読み取れませんでした。文字コードを選択するか、UTF-8 に変換してください。", "引用符が不正です", "列が多すぎます", "用語または分類が無効です", "一致方法が無効です", "言語タグが無効です", "用語リストの上限に達しました", "正規表現が無効です", "行をインポートできませんでした"],
  ko: ["파일 인코딩", "파일을 읽을 수 없습니다. 인코딩을 선택하거나 UTF-8로 변환하세요.", "잘못된 따옴표", "열이 너무 많음", "잘못된 용어 또는 분류", "잘못된 일치 방식", "잘못된 언어 태그", "단어 목록 한도 초과", "잘못된 정규식", "행을 가져올 수 없음"],
  fr: ["Encodage du fichier", "Fichier illisible. Sélectionnez son encodage ou convertissez-le en UTF-8.", "Guillemets invalides", "Trop de colonnes", "Terme ou catégorie invalide", "Mode de correspondance invalide", "Code de langue invalide", "Limite du lexique atteinte", "Expression régulière invalide", "Impossible d’importer la ligne"],
} as const;

const errors = [
  "CSV_INVALID_QUOTING", "CSV_EXTRA_COLUMNS", "CSV_INVALID_TERM", "CSV_INVALID_MATCH_KIND",
  "CSV_INVALID_LANGUAGE", "CSV_ENTRY_LIMIT", "CSV_INVALID_REGEX",
];

export function csvCopy(locale: VoxWardLocale) {
  const messages = labels[locale];
  return {
    encoding: messages[0],
    invalidEncoding: messages[1],
    error: (code: string) => {
      const index = errors.indexOf(code);
      return index < 0 ? messages[9] : (messages[index + 2] ?? messages[9]);
    },
  };
}
