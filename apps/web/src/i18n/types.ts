import type { TcrnLocale } from "@tcrn/ui-copy-state";
import type { ShellThemeMode } from "@tcrn/ui-react/approved";

export type VoxWardLocale = TcrnLocale;

export const VOXWARD_SUPPORTED_LOCALES: readonly VoxWardLocale[] = [
  "en",
  "zh-CN",
  "ja",
  "ko",
  "fr",
];

export const DEFAULT_VOXWARD_LOCALE: VoxWardLocale = "en";
export const DEFAULT_VOXWARD_THEME: ShellThemeMode = "halloween";

export function isVoxWardLocale(value: unknown): value is VoxWardLocale {
  return (
    value === "en" ||
    value === "zh-CN" ||
    value === "ja" ||
    value === "ko" ||
    value === "fr"
  );
}

export function normalizeVoxWardLocale(value: unknown): VoxWardLocale {
  return isVoxWardLocale(value) ? value : DEFAULT_VOXWARD_LOCALE;
}

export function pickLocale<T>(
  dict: Readonly<Record<VoxWardLocale, T>>,
  locale: VoxWardLocale,
): T {
  return dict[locale] ?? dict.en;
}
