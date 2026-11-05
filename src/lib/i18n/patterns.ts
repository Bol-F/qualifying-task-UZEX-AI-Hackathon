import type { UiLanguage } from "./preferences";
// Only canonical application-authored sentences are localized. Captured source values
// are inserted as text; original records, IDs, prices and dates are never rewritten.
const patterns: { match: RegExp; uz: string; ru: string }[] = [
  {
    match:
      /^Default analysis period: ([\d-]+) → ([\d-]+)\. Choose dates to analyze another period\.$/,
    uz: "Standart tahlil davri: {1} → {2}. Boshqa davr uchun sanalarni tanlang.",
    ru: "Период анализа по умолчанию: {1} → {2}. Для другого периода выберите даты.",
  },
  {
    match:
      /^Missing source years: ([\d, ]+)\. Missing observations are not zero activity\.$/,
    uz: "Manba yillari yo‘q: {1}. Ma’lumot yo‘qligi nol faollik emas.",
    ru: "Нет исходных данных за годы: {1}. Пропуск данных не означает нулевую активность.",
  },
  {
    match:
      /^(\d+) cancelled records are counted in registry activity and excluded from value and quantity\.$/,
    uz: "{1} ta bekor qilingan yozuv reyestr sonida saqlangan, qiymat va hajmdan chiqarilgan.",
    ru: "{1} аннулированных записей учтены в реестре и исключены из стоимости и объёма.",
  },
  {
    match:
      /^Sum of exact source amounts \(otherwise price × quantity\) in (.*); matching units, cancelled records excluded\.$/,
    uz: "Manbadagi aniq summalar (aks holda narx × miqdor) yig‘indisi {1}; birliklar mos, bekor qilinganlar chiqarilgan.",
    ru: "Сумма точных исходных сумм (иначе цена × объём) в {1}; единицы совпадают, аннулированные записи исключены.",
  },
  { match: /^Currency: (.*)$/, uz: "Valyuta: {1}", ru: "Валюта: {1}" },
  {
    match: /^Price basis: (.*)$/,
    uz: "Narx birligi: {1}",
    ru: "Единица цены: {1}",
  },
  {
    match: /^Quantity unit: (.*)$/,
    uz: "Miqdor birligi: {1}",
    ru: "Единица объёма: {1}",
  },
  { match: /^Contract: (.*)$/, uz: "Shartnoma: {1}", ru: "Договор: {1}" },
  { match: /^Record: (.*)$/, uz: "Yozuv: {1}", ru: "Запись: {1}" },
  {
    match: /^(\d+)–(\d+) of (\d+)$/,
    uz: "{3} tadan {1}–{2}",
    ru: "{1}–{2} из {3}",
  },
  {
    match: /^(\d+) records excluded · unmatched basis$/,
    uz: "{1} ta yozuv chiqarildi · narx birligi mos emas",
    ru: "Исключено {1} записей · несовместимая единица цены",
  },
  {
    match: /^(\d+) records are not eligible for the selected metric\.$/,
    uz: "{1} ta yozuv tanlangan ko‘rsatkichga mos emas.",
    ru: "Для выбранного показателя не подходят {1} записей.",
  },
  {
    match:
      /^Sum of price × quantity in (.*); only known, matching price and quantity units\.$/,
    uz: "Narx × miqdor yig‘indisi ({1}); faqat narx va miqdor birliklari ma’lum va mos bo‘lsa.",
    ru: "Сумма цена × объём в {1}; только при известных и совпадающих единицах.",
  },
  {
    match: /^Reported quantity in (.*) only\. No cross-unit conversion\.$/,
    uz: "Faqat {1} birligidagi miqdor. Birliklar orasida almashtirish yo‘q.",
    ru: "Заявленный объём только в {1}. Единицы не конвертируются.",
  },
  {
    match:
      /^Stored transaction count increased by (\d+) on ([\d-]+) compared with the previous available trading date, ([\d-]+)\.$/,
    uz: "{2} sanasida bitimlar soni oldingi mavjud savdo kuni ({3})ga nisbatan {1} taga oshdi.",
    ru: "На {2} число записей выросло на {1} по сравнению с предыдущей доступной торговой датой {3}.",
  },
  {
    match:
      /^Stored transaction count decreased by (\d+) on ([\d-]+) compared with the previous available trading date, ([\d-]+)\.$/,
    uz: "{2} sanasida bitimlar soni oldingi mavjud savdo kuni ({3})ga nisbatan {1} taga kamaydi.",
    ru: "На {2} число записей снизилось на {1} по сравнению с предыдущей доступной торговой датой {3}.",
  },
  {
    match:
      /^Stored transaction count was unchanged by (\d+) on ([\d-]+) compared with the previous available trading date, ([\d-]+)\.$/,
    uz: "{2} sanasida bitimlar soni oldingi mavjud savdo kuni ({3})ga nisbatan o‘zgarmadi. Farq: {1}.",
    ru: "На {2} число записей не изменилось относительно предыдущей доступной торговой даты {3}. Разница: {1}.",
  },
  {
    match:
      /^(.*) is among the most active commodities: (\d+) records \(([\d.]+)% of this selection\)\.$/,
    uz: "{1} eng faol mahsulotlardan biri: {2} ta yozuv (tanlovning {3}%).",
    ru: "{1} — среди самых активных товаров: {2} записей ({3}% выборки).",
  },
  {
    match:
      /^The (\d+) leading commodity categories account for ([\d.]+)% of stored records\.$/,
    uz: "Eng faol {1} ta mahsulot toifasi yozuvlarning {2}% ini tashkil etadi.",
    ru: "На {1} ведущие товарные категории приходится {2}% записей.",
  },
  {
    match:
      /^Value exceeds Q3 \+ 3 × IQR \((.*)\) within this comparable currency\/unit group\.$/,
    uz: "Qiymat ushbu mos valyuta/birlik guruhida Q3 + 3 × IQR ({1}) chegarasidan yuqori.",
    ru: "Стоимость превышает Q3 + 3 × IQR ({1}) в группе с сопоставимой валютой и единицей.",
  },
  {
    match:
      /^Stored count changed from (\d+) to (\d+) \(([-\d.]+)%\) between ([\d-]+) and ([\d-]+)\.$/,
    uz: "{4} va {5} oralig‘ida yozuvlar soni {1} tadan {2} taga o‘zgardi ({3}%).",
    ru: "Между {4} и {5} число записей изменилось с {1} до {2} ({3}%).",
  },
  {
    match:
      /^No selected records are available between ([\d-]+) and ([\d-]+)\. This may reflect non-trading days or incomplete source coverage\.$/,
    uz: "{1} va {2} orasida tanlangan yozuvlar yo‘q. Buning sababi dam olish kunlari yoki to‘liq bo‘lmagan qamrov bo‘lishi mumkin.",
    ru: "Между {1} и {2} нет выбранных записей. Причиной могут быть неторговые дни или неполный охват.",
  },
  {
    match:
      /^(\d+) records share external identifier (.*) within the same source\. Contract numbers are intentionally not tested for uniqueness\.$/,
    uz: "Bir manbada {1} ta yozuvning tashqi raqami bir xil: {2}. Shartnoma raqamlarining noyobligi tekshirilmaydi.",
    ru: "В одном источнике {1} записей имеют внешний идентификатор {2}. Уникальность номеров договоров не проверяется.",
  },
  {
    match:
      /^(\d+) records have an unknown currency, mismatched or unknown price basis, or zero price\/quantity\. These conditions are not evidence of wrongdoing\.$/,
    uz: "{1} ta yozuvda valyuta noma’lum, narx birligi mos emas yoki narx/miqdor nol. Bu qoidabuzarlik dalili emas.",
    ru: "У {1} записей неизвестная валюта, несовместимая единица цены или нулевая цена/объём. Это не доказательство нарушений.",
  },
  {
    match:
      /^Excluded from valid-value calculation: (\d+) records with unknown currency or incompatible price basis\.$/,
    uz: "Qiymat hisobidan chiqarildi: valyutasi noma’lum yoki narx birligi mos kelmagan {1} ta yozuv.",
    ru: "Из расчёта стоимости исключено {1} записей с неизвестной валютой или несовместимой единицей цены.",
  },
];
export function translatePattern(language: UiLanguage, message: string) {
  if (language === "en") return undefined;
  for (const pattern of patterns) {
    const match = message.match(pattern.match);
    if (match)
      return pattern[language].replace(
        /\{(\d+)\}/g,
        (_, index: string) => match[Number(index)] ?? "",
      );
  }
  return undefined;
}
