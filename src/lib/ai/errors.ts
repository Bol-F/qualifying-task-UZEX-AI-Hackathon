export type ErrorCode =
  | "CONFIGURATION"
  | "QUOTA"
  | "MODEL_UNAVAILABLE"
  | "TIMEOUT"
  | "INVALID_TOOL"
  | "TOOL_LIMIT"
  | "DATA_LIMIT"
  | "DATA_UNAVAILABLE"
  | "SESSION_BUSY"
  | "SESSION_EXPIRED"
  | "INVALID_REQUEST"
  | "SERVICE_UNAVAILABLE";
export class AgentError extends Error {
  constructor(
    public code: ErrorCode,
    public status = 503,
  ) {
    super(code);
  }
}
const messages: Record<ErrorCode, { ru: string; uz: string }> = {
  DATA_UNAVAILABLE: {
    ru: "Стоимость недоступна: нет записей с проверенной валютой и совместимой базой цены. Измените фильтры или выберите количество сделок.",
    uz: "Qiymat mavjud emas: valyuta va narx bazasi mos yozuvlar yo‘q. Filtrlarni o‘zgartiring yoki bitimlar sonini tanlang.",
  },
  CONFIGURATION: {
    ru: "Gemini не настроен или выбранная модель недоступна этому аккаунту.",
    uz: "Gemini sozlanmagan yoki tanlangan model bu hisob uchun mavjud emas.",
  },
  QUOTA: {
    ru: "Лимит Gemini исчерпан. Попробуйте позже или проверьте квоту проекта.",
    uz: "Gemini limiti tugadi. Keyinroq urinib ko‘ring yoki loyiha kvotasini tekshiring.",
  },
  MODEL_UNAVAILABLE: {
    ru: "Gemini временно недоступен. Повторите запрос.",
    uz: "Gemini vaqtincha mavjud emas. Qayta urinib ko‘ring.",
  },
  TIMEOUT: {
    ru: "Запрос занял слишком много времени. Сузьте период и повторите.",
    uz: "So‘rov vaqti tugadi. Davrni qisqartirib, qayta urinib ko‘ring.",
  },
  INVALID_TOOL: {
    ru: "Не удалось безопасно обработать ответ модели. Повторите вопрос.",
    uz: "Model javobini xavfsiz qayta ishlash imkoni bo‘lmadi. Savolni takrorlang.",
  },
  TOOL_LIMIT: {
    ru: "Достигнут предел шагов анализа. Уточните один вопрос.",
    uz: "Tahlil qadamlari chegarasiga yetildi. Bitta aniq savol bering.",
  },
  DATA_LIMIT: {
    ru: "Слишком много записей для анализа. Укажите более узкий период.",
    uz: "Tahlil uchun yozuvlar juda ko‘p. Qisqaroq davrni belgilang.",
  },
  SESSION_BUSY: {
    ru: "В этом разговоре уже выполняется запрос.",
    uz: "Bu suhbatda so‘rov allaqachon bajarilmoqda.",
  },
  SESSION_EXPIRED: {
    ru: "Контекст разговора истёк. Укажите товар и период заново.",
    uz: "Suhbat konteksti muddati tugadi. Mahsulot va davrni qayta ko‘rsating.",
  },
  INVALID_REQUEST: {
    ru: "Проверьте даты, фильтры и длину сообщения.",
    uz: "Sanalar, filtrlar va xabar uzunligini tekshiring.",
  },
  SERVICE_UNAVAILABLE: {
    ru: "Источник данных временно недоступен. Повторите позже.",
    uz: "Ma’lumot manbasi vaqtincha mavjud emas. Keyinroq takrorlang.",
  },
};
export function friendlyError(error: unknown, language: "uz" | "ru") {
  const name = (error as { name?: string })?.name;
  const e =
    error instanceof AgentError
      ? error
      : name === "AbortError" || name === "TimeoutError"
        ? new AgentError("TIMEOUT", 504)
        : new AgentError("SERVICE_UNAVAILABLE");
  return { code: e.code, error: messages[e.code][language], status: e.status };
}
export function logEvent(
  event: string,
  fields: {
    requestId?: string;
    tool?: string;
    code?: string;
    attempt?: number;
    durationMs?: number;
  } = {},
) {
  console.info(JSON.stringify({ event, ...fields }));
}
