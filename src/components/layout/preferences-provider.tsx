"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Toaster } from "sonner";
import {
  preferenceCookies,
  type Theme,
  type UiLanguage,
} from "@/lib/i18n/preferences";
import { translate, type TranslationValues } from "@/lib/i18n/ui";
import { formatUiDate } from "@/lib/i18n/format";
type Preferences = {
  theme: Theme;
  language: UiLanguage;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: UiLanguage) => void;
  t: (message: string, values?: TranslationValues) => string;
  formatDate: (date: string, withTime?: boolean) => string;
};
const PreferencesContext = createContext<Preferences | null>(null);
function persist(name: string, value: string) {
  document.cookie = `${name}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
export function PreferencesProvider({
  children,
  initialTheme,
  initialLanguage,
}: {
  children: React.ReactNode;
  initialTheme: Theme;
  initialLanguage: UiLanguage;
}) {
  const [theme, updateTheme] = useState(initialTheme),
    [language, updateLanguage] = useState(initialLanguage);
  const setTheme = useCallback((next: Theme) => {
    document.documentElement.dataset.theme = next;
    document.documentElement.classList.toggle("dark", next === "dark");
    persist(preferenceCookies.theme, next);
    updateTheme(next);
  }, []);
  const setLanguage = useCallback((next: UiLanguage) => {
    document.documentElement.lang = next;
    persist(preferenceCookies.language, next);
    updateLanguage(next);
  }, []);
  const t = useCallback(
    (message: string, values?: TranslationValues) =>
      translate(language, message, values),
    [language],
  );
  const formatDate = useCallback(
    (date: string, withTime = false) => formatUiDate(language, date, withTime),
    [language],
  );
  const value = useMemo(
    () => ({ theme, language, setTheme, setLanguage, t, formatDate }),
    [theme, language, setTheme, setLanguage, t, formatDate],
  );
  return (
    <PreferencesContext.Provider value={value}>
      {children}
      <Toaster theme={theme} position="bottom-right" richColors />
    </PreferencesContext.Provider>
  );
}
export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("Preferences provider is missing");
  return value;
}
