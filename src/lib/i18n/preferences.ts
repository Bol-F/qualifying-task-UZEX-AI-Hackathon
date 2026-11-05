export type UiLanguage = "en" | "uz" | "ru";
export type Theme = "light" | "dark";
export const preferenceCookies = {
  theme: "uzex-theme",
  language: "uzex-language",
} as const;
export const parseTheme = (value?: string): Theme =>
  value === "dark" ? "dark" : "light";
export const parseUiLanguage = (value?: string): UiLanguage =>
  value === "uz" || value === "ru" ? value : "en";
export const locales: Record<UiLanguage, string> = {
  en: "en-GB",
  uz: "uz-UZ",
  ru: "ru-RU",
};
