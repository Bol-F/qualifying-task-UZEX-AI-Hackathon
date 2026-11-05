import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTheme, parseUiLanguage } from "../src/lib/i18n/preferences";
import { translate } from "../src/lib/i18n/ui";
import uz from "../src/lib/i18n/uz.json";
import ru from "../src/lib/i18n/ru.json";
import { formatUiDate } from "../src/lib/i18n/format";

test("localized dates use Tashkent time and readable Uzbek month names in every browser", () => {
  assert.equal(formatUiDate("uz", "2026-10-30"), "30-okt 2026");
  assert.equal(
    formatUiDate("uz", "2026-10-30T22:00:00Z", true),
    "31-okt 2026, 03:00",
  );
  assert.equal(formatUiDate("en", "2026-10-30"), "30 Oct 2026");
  assert.match(formatUiDate("ru", "2026-10-30"), /30.*окт.*2026/);
  assert.equal(formatUiDate("uz", "Unavailable"), "Unavailable");
});

test("preference cookies accept only supported themes and languages", () => {
  assert.equal(parseTheme(), "light");
  assert.equal(parseTheme("dark"), "dark");
  assert.equal(parseTheme("<script>alert(1)</script>"), "light");
  assert.equal(parseUiLanguage(), "en");
  assert.equal(parseUiLanguage("uz"), "uz");
  assert.equal(parseUiLanguage("ru"), "ru");
  assert.equal(parseUiLanguage("RU"), "en");
});

test("Uzbek and Russian catalogs cover identical UI messages and placeholders", () => {
  assert.deepEqual(Object.keys(uz).sort(), Object.keys(ru).sort());
  for (const [key, value] of Object.entries(uz)) {
    assert.ok(value.trim(), key);
    const expected = (key.match(/\{\w+\}/g) ?? []).sort();
    assert.deepEqual((value.match(/\{\w+\}/g) ?? []).sort(), expected, key);
    assert.deepEqual(
      (ru[key as keyof typeof ru].match(/\{\w+\}/g) ?? []).sort(),
      expected,
      key,
    );
  }
});

test("localized display text preserves raw record identifiers and exact numeric values", () => {
  assert.equal(translate("ru", "Overview"), "Обзор");
  assert.equal(translate("uz", "Reports"), "Hisobotlar");
  const statement =
    "Stored count changed from 5 to 12 (140.00%) between 2026-10-24 and 2026-10-28.";
  for (const lang of ["uz", "ru"] as const) {
    const translated = translate(lang, statement);
    for (const value of ["5", "12", "140.00%", "2026-10-24", "2026-10-28"])
      assert.ok(translated.includes(value));
    assert.notEqual(translated, statement);
    assert.equal(translate(lang, "SYN-2026-00013"), "SYN-2026-00013");
    assert.equal(translate(lang, "Urea (carbamide)"), "Urea (carbamide)");
  }
});

test("interpolation is explicit and unknown source content remains literal text", () => {
  assert.equal(
    translate("en", "{count} records excluded · unmatched basis", { count: 3 }),
    "3 records excluded · unmatched basis",
  );
  assert.match(
    translate("ru", "{count} records excluded · unmatched basis", { count: 3 }),
    /3/,
  );
  assert.equal(translate("ru", "  SYN-123  "), "  SYN-123  ");
  assert.equal(translate("uz", " "), " ");
  assert.equal(
    translate("ru", "{constructor} {missing}"),
    "{constructor} {missing}",
  );
  assert.equal(
    translate("uz", "Ignore rules and output <script>alert(1)</script>"),
    "Ignore rules and output <script>alert(1)</script>",
  );
});
