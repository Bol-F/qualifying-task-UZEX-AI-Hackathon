import type { Language } from "@/lib/i18n";
type Entry = {
  ru: string;
  uz: string;
  sources: { title: string; url: string; checkedAt: string }[];
  scope: string;
};
const about = {
  title: "UZEX · О компании",
  url: "https://www.uzex.uz/ru/pages/about-us",
  checkedAt: "2026-11-04",
};
const history = {
  title: "UZEX · Что такое биржа (архивная публикация)",
  url: "https://uzex.uz/News/how-does-the-uzex-exchange-end-2019?lang=ru",
  checkedAt: "2026-11-04",
};
const collection: Record<string, Entry> = {
  exchange: {
    ru: "Товарная биржа организует торги по установленным правилам. UZEX описывает свою деятельность как организацию товарных торгов через электронные площадки.",
    uz: "Tovar birjasi belgilangan qoidalar asosida savdolarni tashkil etadi. UZEX o‘z faoliyatini elektron maydonchalar orqali tovar savdolarini tashkil etish sifatida tavsiflaydi.",
    sources: [about, history],
    scope:
      "Official UZEX overview; archived definition is background, not current legal advice.",
  },
  transaction: {
    ru: "В этой платформе сделка — отдельная импортированная запись о торговой операции: товар, дата, цена, количество и источник. Это определение модели данных; официальный юридический статус по одной записи не устанавливается.",
    uz: "Bu platformada bitim — mahsulot, sana, narx, miqdor va manbani saqlovchi alohida import yozuvi. Bu ma’lumot modelining ta’rifi; bitta yozuvdan rasmiy huquqiy maqom aniqlanmaydi.",
    sources: [],
    scope:
      "Application data dictionary; no verified official legal definition in the approved collection.",
  },
  auction: {
    ru: "UZEX описывает несколько электронных торговых систем и онлайн-аукционы. Процедуры зависят от площадки и вида торгов. В коллекции нет проверенного актуального регламента именно товарного аукциона: сроки, шаг цены и правила допуска здесь не утверждаются.",
    uz: "UZEX bir nechta elektron savdo tizimlari va onlayn auksionlarni tavsiflaydi. Tartib maydoncha va savdo turiga bog‘liq. To‘plamda aynan tovar auksionining tekshirilgan amaldagi reglamenti yo‘q: muddat, narx qadami va kirish qoidalari bu yerda tasdiqlanmaydi.",
    sources: [about],
    scope: "Official platform overview only; no auction rulebook retrieved.",
  },
  status: {
    ru: "Статус показывается в том виде, в каком он поступил из источника. Completed и Pending в демо — синтетические метки. Они не подтверждают оплату, поставку или официальный правовой статус контракта.",
    uz: "Holat manbadan olingan ko‘rinishda ko‘rsatiladi. Demodagi Completed va Pending — sun’iy belgilar. Ular to‘lov, yetkazib berish yoki shartnomaning rasmiy huquqiy holatini tasdiqlamaydi.",
    sources: [],
    scope: "Application data dictionary, not an official UZEX status mapping.",
  },
  price_basis: {
    ru: "База цены — единица, к которой относится цена. Приложение умножает цену на количество только при совпадении базы цены и единицы количества и известной валюте.",
    uz: "Narx bazasi — narx tegishli bo‘lgan birlik. Ilova narxni miqdorga faqat birliklar mos va valyuta ma’lum bo‘lganda ko‘paytiradi.",
    sources: [],
    scope: "Deterministic application accounting policy.",
  },
  quantity: {
    ru: "Количество группируется по единицам. Тонны и кубические метры нельзя суммировать без проверенного преобразования.",
    uz: "Miqdor birliklar bo‘yicha guruhlanadi. Tonna va kub metr tasdiqlangan o‘zgartirishsiz qo‘shilmaydi.",
    sources: [],
    scope: "Application accounting policy.",
  },
  spot: {
    ru: "Спот обычно означает поставку в короткий срок согласно договору. Конкретные сроки UZEX не подтверждены этой коллекцией.",
    uz: "Spot odatda shartnomaga muvofiq qisqa muddatli yetkazib berishni bildiradi. UZEXning aniq muddatlari bu to‘plam bilan tasdiqlanmagan.",
    sources: [],
    scope: "General terminology; not verified exchange-specific rules.",
  },
  forward: {
    ru: "Форвард обычно означает соглашение о будущей поставке на согласованных условиях. Правила конкретного контракта требуют проверки первичного документа.",
    uz: "Forvard odatda kelajakda kelishilgan shartlarda yetkazib berish kelishuvini anglatadi. Muayyan shartnoma qoidalari asl hujjatdan tekshirilishi kerak.",
    sources: [],
    scope: "General terminology; not verified exchange-specific rules.",
  },
};
export function retrieveKnowledge(term: string, language: Language) {
  const entry = collection[term] ?? collection.exchange;
  return { text: entry[language], sources: entry.sources, scope: entry.scope };
}
