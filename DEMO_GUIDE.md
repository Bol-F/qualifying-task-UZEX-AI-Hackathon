# Three-minute UZEX Insight AI demonstration

## Preflight

Use Node.js 24 and installed Google Chrome. From the repository root:

```powershell
npm ci
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run check:secrets
npm start
```

Open http://localhost:3000/dashboard. `/api/health` should report `status: ok`. `npm run check:gemini` checks configured model access without generating tokens; it is not proof of successful generation. A fresh live generation check can consume billable tokens and needs an approved account/budget.

Set `AI_MODE=auto` for the configured Gemini agent. `AI_MODE=local` provides a repeatable unpaid walkthrough with an explicit local-engine label. Never describe the latter as a live Gemini demonstration. Do not copy over an existing `.env.local`; it may already contain private credentials.

The supplied fixture has **184 synthetic records, October 1–30, 2026**. Its latest carbamide date is **October 28**; the previous available carbamide date is **October 24**. No November records are supplied. Keep the visible **DEMO DATA MODE** notice in screenshots and presentations. For imported data, use the guide's generated dates/products and confirm counts first.

## Script

**0:00–0:30 — Establish purpose and trust.**

“UZEX Insight AI turns exchange records into searchable analytics, bilingual answers and reports. Every number can be traced to source records. This demonstration uses a labeled synthetic dataset, not official UZEX transactions.”

Show 184 records and 8 commodities, coverage and import time. Point out that quantity totals are separate for tonnes and cubic metres. Select “Latest 7 available trading days”: the fixture shows **42** records, October 24–30. Restore all dates before continuing.

**0:30–1:10 — Russian question, Uzbek follow-up.**

Use the generated judge question or ask:

> Покажи сделки по карбамиду за 28 октября 2026 года.

Expect **3** records, **351 t**, with actual applied dates and synthetic provenance. Expand Supporting records and open one transaction drawer. Then ask:

> Endi eng katta 5 tasini ko'rsat.

Explain: “The commodity and date are preserved. Only three records exist, so the application returns three rather than inventing five.” The largest selection is explicitly sorted by comparable reported quantity. For a language-only replay, use:

> Endi natijani o'zbek tilida tushuntir.

**1:10–1:50 — Chart and comparison with evidence.**

> Построй график и сравни количество сделок с предыдущим доступным торговым днём.

Expect October 28: **3**, October 24: **3**. Explain why the comparison uses an observed source date rather than assuming the preceding calendar day traded. Switch compatible chart types; open underlying values; download CSV. Validated follow-ups are labeled as deterministic data actions and avoid unnecessary provider requests.

**1:50–2:20 — Analytics and transparent statistical rules.**

Open Market Explorer. Compare carbamide and cement, or Spot and Forward contracts. Show an insight's metric, baseline and source link. Open Pattern Explorer and its method disclosure: “These are statistical observations and data-quality warnings, not findings of fraud.”

**2:20–3:00 — Export a source-backed report.**

Open Reports; choose October 24–30 and optionally carbamide. Generate the report. Point out dataset coverage, calculated figures, clearly labeled AI framing and source references. Click **Print / Save PDF**. If provider generation fails, explicitly choose **Generate calculated report** and show that limitation label.

## Honest unavailable-data example

> Покажи сделки по карбамиду за 4 ноября 2026 года.

or

> 4-noyabr kuni karbamid bo'yicha nechta bitim tuzilgan?

The correct result is no matching stored records and an out-of-coverage warning. It does **not** prove zero trades occurred on UZEX. Do not substitute October data while retaining a November label.

## Recovery and presentation notes

- Allow for provider latency; do not promise instant model responses. Tool activity and deterministic follow-ups make progress visible.
- A provider failure after successful retrieval retains verified evidence with a warning. A failed data read does not create substitute figures.
- If a checkpoint expires after a restart, use **New conversation** or clear the active conversation and repeat the generated first question.
- For terminology with official citations ask “Что такое биржа?”. The transaction/status entries disclose their application-dictionary scope rather than asserting an unverified legal definition.
- Browser PDF export is implemented. No public deployment or authentic UZEX data connection is implied by the local demo.

## Working feature checklist

- [x] Coverage-aware dashboard, date and commodity filters
- [x] Trade search, stable pagination, sorting, exact source IDs, drawer and filtered CSV
- [x] Seven validated read-only AI tools; Uzbek/Russian evidence responses
- [x] Context-preserving follow-ups and compatible chart controls/export
- [x] Multi-commodity and contract/period comparisons
- [x] Calculated insights and transparent pattern checks
- [x] Repeatable report generation and browser print/PDF export
- [x] Desktop, laptop, tablet and mobile layouts
- [x] Automated unit and production-browser regression tests
- [ ] Fresh billable generation verification under the Phase 4 no-charge constraint
- External database and public hosting are outside the current localhost-only scope; no Supabase or Vercel connection is active.

See `TEST_REPORT.md` for actual verification results and limitations.
