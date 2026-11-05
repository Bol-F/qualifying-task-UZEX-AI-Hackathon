# Phase 3 — hackathon handoff

This is the historical Phase 3 handoff. Current results and owner constraints are in [TEST_REPORT.md](../TEST_REPORT.md). The current release is **localhost + GitHub only**; do not execute the historical deployment steps below.

## Product surfaces

- **Overview**: original KPIs/charts/recent trades, dataset dates, and a dismissible guided walkthrough. Questions are generated from actual stored records. The synthetic fixture covers October; the guide does not pretend November transactions exist.
- **Market Explorer** (`/analytics`): up to three commodities, transaction count, valid value in one currency, reported quantity in one unit, top commodities, date/day/contract-type baselines, absolute/percentage differences and source drill-down. Missing measures remain unavailable; a genuine zero baseline has no percentage change.
- **AI Insights**: automatically calculated activity/share/concentration observations with metric, baseline, filters, coverage and reference IDs. An explicit action asks Gemini to select source-linked explanatory framing. It cannot author new numeric facts or recommendations.
- **Trade Pattern Explorer**: outer IQR value fences, count-change rules, available-date gaps, external-ID repeats and accounting checks. Methods, sample requirements and limitations are visible. Contract numbers are not assumed unique. Findings are observations or quality warnings, never accusations.
- **Assistant**: bilingual tool loop and evidence mode, previous available trading-day discovery, commodity comparisons, top-ten chart requests, compatible chart-type changes, exact chart-data CSV export and underlying source links.
- **Reports** (`/reports`): immutable data snapshot, executive summary, coverage, valid values by currency, quantities by unit, chart, commodity breakdown, optional baseline, calculated observations, Gemini-guided interpretation, source sample and limitations. Print / Save PDF uses the browser. Printing waits for chart readiness and preserves commodity names. Provider errors offer an explicitly calculated-report path.

The existing dashboard, trade filtering, pagination, export and details drawer remain in place. No runtime dependencies or services were added for Phase 3. New indexes cover product/date, contract type/date and import timestamp. Narrow context-bound sorts and previous-available-day count comparisons run as explicitly labeled deterministic data actions; these follow-ups do not require an unnecessary provider round trip.

## Configuration

| Variable                    | Use                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATA_MODE`                 | `demo` (default) or `live`. Live failures never switch to synthetic records.                                                                      |
| `GEMINI_API_KEY`            | Server-only Gemini credential; required for Gemini-backed interpretation.                                                                         |
| `GEMINI_MODEL`              | Configurable model; documented default `gemini-3.5-flash-lite`. Account access is checked with `models.get`.                                      |
| `AI_MODE`                   | `auto` (default) or `local` for an explicit, unpaid deterministic walkthrough. Local mode is labeled in the UI.                                   |
| `SUPABASE_URL`              | Required for live imported records.                                                                                                               |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; required for live reads/imports. Never prefix with `NEXT_PUBLIC_`.                                                                   |
| `AGENT_STATE_SECRET`        | At least 32 random characters. Required on Vercel for signed, one-hour conversational checkpoints. Keep stable between instances and deployments. |
| `APP_API_KEY`               | Optional private-workspace API gate. Supply it through an authenticated reverse proxy as `x-api-key`; do not embed it in browser code.            |

`GET /api/health` returns configuration status and booleans, never secret values. Invalid data mode, missing live credentials, or missing Vercel checkpoint secret make health degraded. Health is a liveness/configuration check, not proof of a successful database/provider query.

## Vercel deployment

1. Push this repository to the intended Git provider and import it into Vercel as a Next.js project. Use Node.js 24 and the repository root. `vercel.json` defines `npm ci`, the production build and sixty-second AI function limits.
2. Set server environment variables for the intended Preview/Production environment. For a synthetic judge demo, use `DATA_MODE=demo`; choose `AI_MODE=auto` with the Gemini credential or explicit `local` for an unpaid walkthrough. Set `AGENT_STATE_SECRET` in either case on Vercel. Do not commit `.env.local`.
3. For live mode, apply both SQL migrations to your Supabase project and import validated source data. RLS stays enabled and browser roles have no direct table grants. The assistant has no transaction mutation path.
4. Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`. Stop other Next.js development servers first to avoid shared generated-type-file reloads. The E2E runner starts its own demo/local server on port 3100, separate from development output and configured provider credentials.
5. Deploy the reviewed branch. Visit `/api/health`, verify the data-mode label and import time, then exercise the complete flow below. Only a successful deployment result with a real URL establishes that publication succeeded; this work does not claim public deployment.
6. Before publishing confidential imported records, provide workspace authentication at the application/proxy boundary. For a public, multi-instance event deployment, configure a shared Vercel Firewall/gateway rate rule for chat and reports, and ensure the trusted proxy replaces forwarded IP headers. The built-in fifteen-request/minute limiter is bounded but per instance.

The runtime reads data afresh and returns `no-store`; it does not hide imports behind a stale cross-request analytics cache. One request reuses its coverage promise, and grouped analytics avoid repeated scans for each commodity. The workspace/agent cap reads at 5,000 records and fail explicitly above the limit. A chart supports up to 366 available dates in Market Explorer and 90 points in assistant responses. Larger datasets need SQL aggregate RPCs or narrower dates.

## Three-minute judge script

**0:00–0:30** — Open Overview. State clearly whether the source is synthetic or imported. Inspect stored transaction count, currencies, separate quantity units and latest record/import dates. The included fixture has 184 synthetic records and no November coverage.

**0:30–1:15** — Use the guided Russian question. For the included fixture:

> Покажи сделки по карбамиду за 28 октября 2026 года.

This adapts the requested November example to actual available carbamide records. Open one supporting record, then ask:

> Endi eng katta 5 tasini ko'rsat.

Explain that the result keeps the commodity/date constraints and returns up to five available records, not invented extras.

**1:15–2:00** — Ask:

> Построй график и сравни количество сделок с предыдущим доступным торговым днём.

Inspect the actual selected dates, the chart and its underlying table. For this fixture the prior available carbamide date is October 24, not the immediately preceding calendar day. Switch the chart type and download its CSV. If demonstrating live Gemini, allow for provider latency rather than promising instant answers.

**2:00–2:30** — Open Market Explorer. Compare two commodities, briefly show AI Insights and one Pattern Explorer reason/method. Explain that pattern flags are statistical observations, not fraud findings.

**2:30–3:00** — Open Reports, choose October 24–30 (optionally carbamide), generate the briefing and inspect a source reference. Click Print / Save PDF. If Gemini is unavailable, explicitly use the calculated-report option and point to the visible limitation label.

For imported data, use the dates/products shown by the generated guide rather than copying fixture-specific dates. An uncovered November request should show unavailability, not zero market activity.

## Verification and remaining limits

Final verification on 2026-11-04: lint passed; strict typecheck passed; **39 unit tests passed**; **9 Playwright browser tests passed**; production build passed. The production dependency audit reported zero vulnerabilities. A scan of all 31 production static assets found no configured secret values. Screenshots of the mobile explorer, pattern workspace, bilingual journey and print report are saved under `docs/screenshots`.

Unit tests cover financial compatibility, missing-vs-zero comparisons, deterministic percentages, insight evidence, pattern thresholds, bounded report framing, checkpoint tampering/ownership, previous available dates, chart CSV safety and body limits. Browser tests cover the original flows plus advanced filtering/drill-down, the bilingual judge script, chart export, empty data, mobile layouts, missing Gemini configuration and print styling.

Live checks confirmed the configured account's model access, a Russian Gemini-selected `search_trades` call returning the actual fixture count, a Gemini-selected comparison against the actual previous available date, and a Gemini-guided three-section report plan. Provider latency and transient errors were observed. If optional post-query explanation fails after a tool succeeded, verified results are retained with a visible warning; failed data retrieval is never replaced with invented results. Automated tests use mocks/local tools and require no paid request.

The final live orchestration check completed all three judge questions: Gemini selected the initial Russian carbamide search (3 stored synthetic records on October 28); the Uzbek largest-five follow-up retained those three available records; the chart compared 3 records on October 28 with 3 on October 24. The latter two actions used the explicitly labeled validated follow-up path. The initial provider request took about twenty seconds; the local follow-ups took milliseconds.

Supabase migrations are prepared but were not applied to an external database here. A public deployment is not confirmed. Signed checkpoints support cold-instance resume with a stable secret, while per-instance rate limits and concurrency locks still need a shared gateway/store for strict global enforcement. Checkpoints are signed metadata, not encrypted storage or a source-authenticity certificate. Retained checkpoints can restore their owner's state until expiry even after a local clear; clearing is not global token revocation.

The approved report explanation vocabulary is intentionally constrained: Gemini chooses evidence-backed framing while deterministic code inserts numbers and known limitations. This is not unrestricted financial commentary. Browser print-to-PDF is the supported export path; a server-generated PDF service was intentionally not introduced.
