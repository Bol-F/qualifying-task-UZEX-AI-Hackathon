import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export const number = (v: number | string, compact = false) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    notation: compact ? "compact" : "standard",
  }).format(v as number);
