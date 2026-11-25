import type { VoxWardLocale } from "./types";

export function formatNumber(value: number, locale: VoxWardLocale): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatCurrency(value: number, currency: string, locale: VoxWardLocale): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
}

export function formatDateTime(value: string, locale: VoxWardLocale): string {
  return new Date(value).toLocaleString(locale);
}

export function formatTime(value: string, locale: VoxWardLocale): string {
  return new Date(value).toLocaleTimeString(locale);
}
