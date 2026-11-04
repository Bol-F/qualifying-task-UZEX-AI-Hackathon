const aliases = [
  [
    "urea",
    /urea|carbam|karbam|karbom|карбам|карбом/iu,
    "urea carbamide karbamid карбамид",
  ],
  ["cement", /cement|sement|цемент/iu, "cement sement цемент"],
  ["wheat", /wheat|bug.doy|пшениц/iu, "wheat bugdoy пшеница"],
  ["cotton", /cotton|paxta|хлоп/iu, "cotton paxta хлопок"],
  ["diesel", /diesel|dizel|дизел/iu, "diesel dizel дизель"],
  ["copper", /copper|\bmis\b|медь|медн/iu, "copper mis медь"],
  [
    "polyethylene",
    /polyethylene|polietilen|полиэтилен/iu,
    "polyethylene polietilen полиэтилен",
  ],
  [
    "gas",
    /natural gas|tabiiy gaz|природный газ/iu,
    "natural gas tabiiy gaz природный газ",
  ],
] as const;
export function normalizeProduct(name: string) {
  const text = name.normalize("NFKC").toLowerCase().trim();
  return [
    text,
    ...aliases
      .filter(([, pattern]) => pattern.test(text))
      .map(([, , terms]) => terms),
  ].join(" ");
}
