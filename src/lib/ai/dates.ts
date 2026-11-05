import { dateSchema } from "@/lib/validations/trades";
import { AgentError } from "./errors";
export const tashkentToday = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
export function shiftDate(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const months: Record<string, number> = {
  январ: 1,
  феврал: 2,
  март: 3,
  апрел: 4,
  мая: 5,
  май: 5,
  июн: 6,
  июл: 7,
  август: 8,
  сентябр: 9,
  октябр: 10,
  ноябр: 11,
  декабр: 12,
  yanvar: 1,
  fevral: 2,
  mart: 3,
  aprel: 4,
  may: 5,
  iyun: 6,
  iyul: 7,
  avgust: 8,
  sentabr: 9,
  oktabr: 10,
  noyabr: 11,
  dekabr: 12,
};
export function interpretDates(text: string, today = tashkentToday()) {
  const lower = text.toLowerCase();
  const iso = lower.match(/\d{4}-\d{2}-\d{2}/g);
  if (iso) {
    if (iso.some((v) => !dateSchema.safeParse(v).success))
      throw new AgentError("INVALID_REQUEST", 400);
    return iso;
  }
  if (/bugun|бугун|сегодня|today/.test(lower)) return [today];
  if (/kecha|кеча|вчера|yesterday/.test(lower)) return [shiftDate(today, -1)];
  const found = lower.match(/(\d{1,2})[\s-]+([a-zа-яё]+)(?:\s+(20\d{2}))?/u);
  if (!found) return [];
  const month = Object.entries(months).find(([k]) =>
    found[2].startsWith(k),
  )?.[1];
  if (!month) return [];
  const date = `${found[3] ?? today.slice(0, 4)}-${String(month).padStart(2, "0")}-${found[1].padStart(2, "0")}`;
  return dateSchema.safeParse(date).success ? [date] : [];
}
