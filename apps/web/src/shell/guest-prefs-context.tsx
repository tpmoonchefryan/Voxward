import { createContext, useContext, useState, type ReactNode } from "react";
import type { ShellThemeMode } from "@tcrn/ui-react/approved";
import {
  DEFAULT_VOXWARD_LOCALE,
  DEFAULT_VOXWARD_THEME,
  type VoxWardLocale,
} from "../i18n/types";

export interface VoxWardGuestPrefsValue {
  readonly theme: ShellThemeMode;
  readonly locale: VoxWardLocale;
  readonly setGuestTheme: (theme: ShellThemeMode) => void;
  readonly setGuestLocale: (locale: VoxWardLocale) => void;
  readonly resetGuestPrefs: () => void;
}

const VoxWardGuestPrefsContext = createContext<VoxWardGuestPrefsValue>({
  theme: DEFAULT_VOXWARD_THEME,
  locale: DEFAULT_VOXWARD_LOCALE,
  setGuestTheme: () => {},
  setGuestLocale: () => {},
  resetGuestPrefs: () => {},
});

/**
 * Ephemeral React-only guest preferences holder (no localStorage/sessionStorage).
 * Preserves guest theme & 5-language choices across client-side SPA navigation while
 * always starting at `halloween` + `en` on fresh page loads.
 */
export function VoxWardGuestPrefsProvider({ children }: { readonly children: ReactNode }) {
  const [theme, setTheme] = useState<ShellThemeMode>(DEFAULT_VOXWARD_THEME);
  const [locale, setLocale] = useState<VoxWardLocale>(DEFAULT_VOXWARD_LOCALE);

  const resetGuestPrefs = () => {
    setTheme(DEFAULT_VOXWARD_THEME);
    setLocale(DEFAULT_VOXWARD_LOCALE);
  };

  return (
    <VoxWardGuestPrefsContext.Provider
      value={{
        theme,
        locale,
        setGuestTheme: setTheme,
        setGuestLocale: setLocale,
        resetGuestPrefs,
      }}
    >
      {children}
    </VoxWardGuestPrefsContext.Provider>
  );
}

export function useVoxWardGuestPrefs(): VoxWardGuestPrefsValue {
  return useContext(VoxWardGuestPrefsContext);
}
