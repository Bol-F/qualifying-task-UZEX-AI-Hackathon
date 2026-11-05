import { locales, type UiLanguage } from "./preferences";

const uzbekMonths = [
  "yan",
  "fev",
  "mar",
  "apr",
  "may",
  "iyn",
  "iyl",
  "avg",
  "sen",
  "okt",
  "noy",
  "dek",
];

export function formatUiDate(
  language: UiLanguage,
  date: string,
  withTime = false,
) {
  const value = new Date(date.length === 10 ? date + "T12:00:00Z" : date);
  if (Number.isNaN(value.getTime())) return date;
  // Some browser ICU builds render Uzbek short months as "M10". Use explicit
  // Uzbek month names while still resolving the date/time in Asia/Tashkent.
  if (language === "uz") {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tashkent",
      day: "numeric",
      month: "numeric",
      year: "numeric",
      ...(withTime
        ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const }
        : {}),
    }).formatToParts(value);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? "";
    return `${part("day")}-${uzbekMonths[Number(part("month")) - 1]} ${part("year")}${withTime ? `, ${part("hour")}:${part("minute")}` : ""}`;
  }
  return new Intl.DateTimeFormat(locales[language], {
    timeZone: "Asia/Tashkent",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(value);
}
