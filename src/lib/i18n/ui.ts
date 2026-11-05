import { messages } from "./messages";
import type { UiLanguage } from "./preferences";
import { translatePattern } from "./patterns";
export type TranslationValues = Record<string, string | number>;
export function translate(
  language: UiLanguage,
  message: string,
  values: TranslationValues = {},
) {
  if (!message.trim()) return message;
  const key = message.trim(),
    entry = messages[key];
  const text =
    language === "en"
      ? key
      : (entry?.[language] ?? translatePattern(language, key) ?? key);
  const output = text.replace(/\{(\w+)\}/g, (_, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : `{${key}}`,
  );
  return (
    (message.match(/^\s*/)?.[0] ?? "") +
    output +
    (message.match(/\s*$/)?.[0] ?? "")
  );
}
