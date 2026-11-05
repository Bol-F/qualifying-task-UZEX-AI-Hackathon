import uz from "./uz.json";
import ru from "./ru.json";
export const messages: Record<string, { uz: string; ru: string }> =
  Object.fromEntries(
    Object.entries(uz).map(([key, text]) => [
      key,
      { uz: text, ru: ru[key as keyof typeof ru] ?? key },
    ]),
  );
