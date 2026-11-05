# README2 registry integration — November 5, 2026

The application now supports the supplied CSV registry in local SQLite mode, with no external database or paid inference calls. All **393,353 available trades** imported successfully. File roles were identified by headers, preserving the originals and recording source hashes. The README text stored as `deals_2022.csv` was skipped. The input lacks **106,647 trades for 2024** and the **broker directory**; the UI and assistant explicitly disclose these gaps.

Independent Python `csv`/`decimal` calculations over the original files matched the SQLite snapshot exactly, including all unit-grouped quantities. SQLite `PRAGMA quick_check` returned `ok`.

| Check                                       | Verified result                                                                                                                                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source trade count                          | 393,353 (2022: 84,299; 2023: 93,985; 2025: 115,763; 2026: 99,306)                                                                                                                                                               |
| Cancelled records                           | 26,396, retained in registry counts and excluded from value/volume                                                                                                                                                              |
| Non-cancelled source amounts                | 152,777,205,033,904.85 UZS; 853,516,434.43 USD                                                                                                                                                                                  |
| Combined value at each trade date's FX rate | 163,014,603,800,210.5204 UZS                                                                                                                                                                                                    |
| References                                  | 6,616 contracts; 14,392 participants; 1,765 daily USD rates                                                                                                                                                                     |
| Unit tests                                  | 62 passed, including import rollback/dry-run, mismatched filenames, exact recurring-price accounting, cancellation, indexed filtering, decimal sort and indexed available dates                                                 |
| Existing demo browser regression suite      | 19 passed; registry tests run separately against local mode                                                                                                                                                                     |
| README2 browser suite                       | 4 passed: full dashboard/provenance and missing-year state, all five mobile workspaces and Russian labels, joined trade details and matching CSV export, analytics/report/bilingual assistant flow                              |
| Production build, lint, TypeScript          | Passed under Node.js 24.22.2 / Next.js 16.4.5                                                                                                                                                                                   |
| Browser method                              | Browser plugin not available; configured Playwright with installed Chrome, localhost production server; desktop 1536×1024 and mobile 390×844                                                                                    |
| Rendered evidence                           | Correct page title, meaningful content, no framework overlay, no runtime/console errors in the five mobile workspaces, no horizontal document overflow; screenshots stored outside the repository in the OS temporary directory |
| Client asset secret scan                    | 33 assets scanned, no matches; no provider credentials configured for this run                                                                                                                                                  |

The local registry's dashboard covers the complete imported snapshot. Detailed analytics, reports and undated assistant requests disclose a latest-month default, with 50,000 matched-row bounds. Explicit last-N-trading-day requests use indexed observed dates. The 100,000-row export bound remains explicit. Large-range trend charts are bounded; oversized requests require narrower selections. Gemini-backed planning/generation remains unverified for this integration; the tested assistant and reports use local deterministic tools. No deployment, cloud connection, Git commit or remote push was performed.

The preceding fixture-based audit is retained below as historical evidence; its 184-record totals describe `DATA_MODE=demo`.

# Earlier fixture release audit — November 5, 2026

Scope: existing UZEX Insight AI application. Baseline preserved in Git commit `70e3834`. No user transaction data was removed, no production database was modified, and no paid resource was created.

Final owner direction: **localhost only; GitHub source synchronization is allowed; do not connect Vercel or Supabase.** Existing optional adapters are retained. The connected repository is `Bol-F/qualifying-task-UZEX-AI-Hackathon`; GitHub synchronization is separate from hosting.

## Environment and method

Windows, Node.js 24, Next.js 16.4.5, strict TypeScript, installed Google Chrome controlled by Playwright. The Browser plugin was unavailable. A headed Chrome audit inspected all five pages at **1440, 1280, 768 and 390 pixels**. Additional automated tests click real controls and compare API results with deterministic fixture calculations. Playwright now builds and serves a separate **production** artifact at port 3100 with `DATA_MODE=demo` and `AI_MODE=local`; no inference request is required or made by the automated suite.

## Verification status

Final command totals and release screenshots are recorded after the last verification run below. A passing model-access check is kept separate from generation verification.

| Quality gate                                         | Evidence / current status                                                                                                                                                                 |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application identity, meaningful content, navigation | Headed Chrome, all five routes, all four widths; no blank page or framework overlay                                                                                                       |
| Responsive rendering                                 | No document overflow in the twenty page/viewport combinations; tables scroll within their containers                                                                                      |
| Dashboard consistency                                | Count equals API table total, sum of daily counts, and sum of commodity counts in five representative selections                                                                          |
| Trade Explorer                                       | Commodity/contract search, dates, currency/basis, decimal sorting, pagination, exact record ID, details, reset and CSV checked                                                            |
| Bilingual data tools                                 | Unit mocks plus real backend/local-tool browser conversations; dates, Uzbek replay and previous available date preserved                                                                  |
| Gemini account access                                | `npm run check:gemini` returned `models/gemini-3.5-flash-lite`, available; metadata request only                                                                                          |
| Fresh paid Gemini generation                         | **UNVERIFIED in Phase 4**: no separate spending approval received. Phase 3 documented prior live tool calling and report framing; this audit does not relabel old evidence as a fresh run |
| Numeric/chart accuracy                               | Direct fixture/API checks; exact decimal tests, null-vs-zero tests, source links and CSV row equality                                                                                     |
| Report generation/print                              | Calculated report, inherited contract filter, repeated generation, provider-error recovery and print-ready state tested                                                                   |
| Official knowledge references                        | UZEX overview/archive pages reopened; transaction/status entries explicitly disclose application-dictionary scope                                                                         |
| External Supabase connection                         | **UNVERIFIED**: no UZEX database credentials/project. Connected inactive unrelated project was not changed                                                                                |
| Public deployment / HTTPS                            | **OUT OF SCOPE** by the owner’s final localhost-only instruction. No Vercel deployment was created; local production HTTP is tested                                                       |

## Representative numerical evidence

All figures below describe the synthetic fixture only.

| Selection             |           Stored rows | Valid value (UZS) | Reported quantity  |
| --------------------- | --------------------: | ----------------: | ------------------ |
| All fixture records   |                   184 |   382,044,714,000 | 2,588 m³; 16,340 t |
| Carbamide, October 28 |                     3 |       983,177,000 | 351 t              |
| Carbamide, October 24 |                     3 |     1,556,801,000 | 555 t              |
| October 24–30         |                    42 |    84,305,811,000 | 468 m³; 3,937 t    |
| Carbamide, November 4 | 0 matched stored rows |       Unavailable | Unavailable        |

For every selection, dashboard count, table total, daily-count sum and commodity-count sum agreed. The last line is an unavailable source selection, not a statement that the real exchange had zero activity. Financial values require an explicit compatible price basis. There is no currency or unit conversion.

## Findings fixed

1. **Hard-coded dashboard periods.** Replaced October-specific shortcuts with available-record dates and custom filters; added commodity selection, coverage/import labels and explicit empty observations.
2. **Missing currency/unit values plotted as zero.** Dashboard chart data now retains nulls and distinguishes genuine observed zero; full dates remain in tooltips.
3. **Precision loss in filtering/sorting.** Decimal strings are retained through API range validation and comparisons, including values beyond IEEE-754 precision.
4. **Search semantics differed between demo and live.** PostgREST values are quoted, LIKE metacharacters escaped, and unsupported wildcard searches rejected. Hostile punctuation cannot become query structure or silently expose the full dataset.
5. **Source links broadened constraints.** Currency-only drill-downs, exact IDs, multi-commodity and contract constraints are retained and visible.
6. **Caller cancellation discarded.** Supabase transport now combines caller abort with its own source deadline and disables stale fetch caching.
7. **Invalid data-mode typo selected demo.** Invalid configuration now fails closed; health returns a degraded state without exposing secrets.
8. **Repeated report generation disabled printing.** Successful report snapshots remount their chart; failed generation retains the preceding printable report. Contract comparisons carry through from Market Explorer.
9. **Repeated comparison source IDs.** Overlapping periods deduplicate source references and show samples from both sides.
10. **Knowledge/follow-up routing.** Transaction terminology is distinguished from exchange terminology; language-only replays preserve validated constraints; the two available days are discovered from actual dates. Invalid explicit dates cannot broaden a local query.
11. **Browser polish.** Added favicon, skip link, navigation labels/current state, correct pending-status drawer styling, export progress, visible hidden constraints, safe Markdown images/links and a new-conversation error action.
12. **Development-server test interference.** Replaced HMR-based browser testing with an isolated production build/runtime.

## Security review

No public transaction write route or arbitrary SQL/JavaScript execution exists. Tool names and arguments are allowlisted and validated. Origin checks, bounded request bytes, bounded record/tool/history/chart counts, session ownership, HMAC checkpoints and safe error handling are covered by tests. Secrets remain server-side; repository/staged-file and built-client scans check configured secret literals without printing them. CSV escaping handles formula prefixes, including leading whitespace. Imported instructions never become executable functions or unverified numeric model prose.

RLS and browser-role revocation were reviewed in the migration files. Their behavior against an external database remains unverified. Public demo data is intentionally readable; confidential imports need authentication or an authenticated proxy. The existing API key gate is not a user-login product. Per-instance rate limits/locks and expiring checkpoint replay behavior remain documented prototype limitations.

The full dependency audit reports **8 moderate development-tool advisories** downstream of the lint toolchain’s minimatch dependency, with **0 high or critical findings**. The production-only audit reports **0 vulnerabilities**. An automatic suggested fix would downgrade the Next.js lint configuration; that incompatible framework change was not applied. No affected glob-pattern API is exposed through the application.

## Performance review

The baseline production browser pass made one analytics and one recent-trades request on Dashboard, and one data request on each other data page; no repeated same-URL fetch loop was observed. Its dashboard readiness was approximately 1.1–2.0 seconds on this machine, including a network-idle wait. These are local smoke measurements, not Core Web Vitals or external-database benchmarks.

Changes avoid repeated workspace measure calculation, preserve aborts to stop discarded database work, guard stale client fetch completion, and avoid inference for validated language-only follow-ups. Charts remain dynamically loaded in assistant/market/report workspaces; tables remain paginated. No freshness-obscuring cross-request analytics cache was introduced. Post-release browser measurements are recorded with the final results; no unsupported latency improvement is claimed.

## Reproducible commands

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run check:secrets
npm audit --omit=dev --audit-level=high
npm run check:gemini
npm start
```

`check:gemini` accesses model metadata only. Automated tests mock Gemini or use labeled local tools. Billable inference is excluded unless separately authorized. The browser suite needs installed Google Chrome. Node.js 24 is pinned through `engines`.

## Previous audit results (before interface refresh)

- Clean `npm ci`: passed (645 packages).
- Lint: passed. Strict typecheck: passed.
- Unit tests: **51 passed**, zero failures/skips.
- Production browser tests: **15 passed**, zero failures/skips, 37.8 seconds including test-server build/start.
- Final normal production build: passed; all five pages and API routes emitted successfully.
- Headed Chrome review: **20 page/viewport combinations passed**, no overflow, missing control names, application errors or console warnings.
- Actual chart-point click navigated to the matching commodity/date source trades; table source drill-down also passed.
- Final dashboard readiness: 1013–1125 ms on this machine, including the network-idle wait. Initial dashboard JavaScript transfer: 488,416 bytes, about 3.2% above the baseline after exact-decimal validation. This is a local observation, not a controlled speedup claim.
- Production secret scan: **32 static assets scanned**, configured Gemini/checkpoint secret literals absent.
- Production audit: **0 vulnerabilities**; full audit: 8 moderate development findings, 0 high/critical.
- Gemini metadata: configured account can access `models/gemini-3.5-flash-lite`. Fresh billable generation remains unverified under the no-charge constraint.
- A stable random checkpoint secret was configured in the ignored local environment file without displaying it.
- Real application screenshots: `docs/screenshots/release-*.png`; measurement evidence: `docs/qa-matrix.json`.

The local demo and source package pass their release gates. External database verification, fresh paid inference and public hosting are not represented as verified. Vercel/Supabase connection is outside the owner’s requested local-only scope.

## Light/dark and multilingual interface refresh — November 5

The interface now defaults to white surfaces with emerald, blue and violet accents. A global navbar switches light/dark themes and English/Uzbek/Russian across all workspaces. Preferences are validated and server-rendered from cookies. Mobile navigation has visible labels, dashboard date controls remain full-width, and optional report comparison controls are collapsed initially. Original source fields, numeric values and query arguments remain unchanged.

The first browser pass found that reloading retained chat history but discarded the selected conversation. The hook now restores the last selected saved conversation; new/clear actions reset the selection. The persistence regression test passes. A separate new test initially used an isolated API request context without browser preference cookies; it was corrected to test server HTML with the browser's actual context.

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: **56 passed**, zero failures/skips; new cases cover allowlisted preferences, catalog/placeholder parity, exact source values, safe interpolation, unknown content and Tashkent date formatting. An ICU/browser fallback avoids unhelpful Uzbek month labels such as `M10`.
- `npm run test:e2e`: **19 passed**, zero failures/skips in **43.5 seconds**, including the isolated production build/server. Existing dashboard, trade filtering/export, assistant, chart/source and report tests still pass.
- Added Chrome checks for server-rendered preferences, keyboard theme toggle, reload/navigation persistence, interface translation, retained filters/chart metric, Russian-to-Uzbek assistant context, saved conversation restoration, and layout at **1440/1280/768/390px** in both themes.

The Browser plugin is unavailable; installed Google Chrome is controlled with Playwright. Gemini is mocked or explicitly disabled in the automated suite. This UI change does not establish a fresh paid Gemini-generation result or an external database/deployment result.

Final normal production build and strict typecheck passed. The refreshed build is running at **http://localhost:3000**, bound to loopback, with `DATA_MODE=demo` and the existing `AI_MODE=auto` configuration. Health returns `ok`; the external database is unconfigured. The client-secret scan checked **33 static assets** and found zero configured-secret literals.

The final Chrome visual pass checked **40 page/viewport/theme combinations**: five routes × four widths × two themes. All had meaningful headings, no framework overlay, no document overflow, no application errors and no console warnings. Changing interface language issued **zero additional data requests**. No chat/report generation POST was made during the visual pass. Matrix evidence: `docs/qa-ui-refresh.json`; screenshots: `docs/screenshots/ui-*.png`. The source record names remain unchanged even when interface labels are localized.
