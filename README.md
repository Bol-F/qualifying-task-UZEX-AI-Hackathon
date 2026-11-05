# UZEX Insight AI

A Next.js financial analytics application with an evidence-grounded Uzbek / Russian assistant. The application starts without credentials in **DEMO DATA MODE**. Its 184 deterministic, synthetic records are stored in `src/lib/db/demo.ts`; none represent official UZEX transactions. No official live feed is claimed.

The supplied **README2 CSV registry** is now supported locally through indexed SQLite (`DATA_MODE=local`), without a cloud database or API key. It currently contains **393,353 synthetic trades**, 6,616 contracts, 14,392 participants and 1,765 daily USD rates. The files supplied in this workspace do **not** include the 106,647 trades for 2024 or the broker directory advertised by README2. The application explicitly displays these gaps.

Explore stored transactions, compare commodities and trading periods, ask bilingual questions with inspectable evidence, investigate transparent statistical patterns, and print an analytics briefing. The first-visit guide supplies questions adapted to actual available records.

The interface opens in a white, emerald and blue **light theme**. Use the top navbar to switch **light / dark mode** and **English / O‘zbekcha / Русский** across all five workspaces. Both preferences survive navigation and reload. Original transaction names, identifiers, quantities and prices stay unchanged. The assistant answers data questions in Uzbek or Russian, following the latest question's language.

Navigation uses plain labels and a labeled bottom bar on mobile. Reports start with dates and commodities; optional comparison and contract filters expand when needed. Returning to the assistant restores the last open conversation. No additional services or credentials are needed for these interface preferences.

Submission package: [architecture](ARCHITECTURE.md), [three-minute demo and working feature checklist](DEMO_GUIDE.md), [release audit and test results](TEST_REPORT.md). Screenshots under `docs/screenshots` show the real application and retain synthetic-data labels.

## Run

Requires Node.js 24 and npm. Google Chrome is required for browser tests.

```powershell
npm ci
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

Open http://localhost:3000. Routes: `/dashboard`, `/assistant`, `/trades`, `/analytics`, `/reports`. `npm run build` and `npm start` run the production build. Checks: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:e2e`. Playwright builds and launches an isolated **production** server on port 3100 with demo data and local tools; it does not call paid APIs. Stop other Next.js development servers before E2E tests or a build: Next.js shares generated type files even when output directories differ. See [deployment instructions](docs/phase-3.md) and the [current release report](TEST_REPORT.md).

## README2 registry on localhost

Run `npm run import:registry -- .` to import the CSV files in the project directory. An optional alternative directory may be supplied. Use `--dry-run` to validate without replacing the existing database. Set `DATA_MODE=local`, `AI_MODE=local` and `LOCAL_DATA_PATH=data/registry.sqlite` in `.env.local`, then start the application. The current workspace is already configured this way. Use Node.js 24 as required by `package.json`; Node 22 installed elsewhere on the machine does not change this requirement.

The importer detects each file's role from its **column headers**, because the provided filenames are mismatched. It preserves the originals and records their SHA-256 hashes and row counts. The dataset notice on every data workspace expands to show this provenance; `/api/dataset` returns the same information.

| Supplied filename  | Actual contents                             |
| ------------------ | ------------------------------------------- |
| `participants.csv` | 84,299 trades from 2022                     |
| `deals_2026.csv`   | 93,985 trades from 2023                     |
| `deals_2023.csv`   | 115,763 trades from 2025                    |
| `usd_rates.csv`    | 99,306 trades from 2026                     |
| `brokers.csv`      | 6,616 contract cards                        |
| `deals_2025.csv`   | 14,392 participants                         |
| `deals_2024.csv`   | 1,765 USD exchange rates                    |
| `deals_2022.csv`   | README text, skipped as a non-registry file |

Quantity equals **number of lots × lot size**. Contract currency comes from the joined contract card. Exact source transaction amounts drive all totals, including reports and AI tools; the displayed unit price is rounded to six decimal places and is not multiplied back to reconstruct source totals. USD amounts are converted using the rate on the transaction date. Original currencies and measurement units remain separate; the dashboard additionally labels the combined value converted to UZS. Cancelled transactions remain searchable and count as registry records, but are excluded from trade value and traded quantity. Pending and partial transactions are not represented as settled cash flows.

The importer validates references, dates, units, lot sizes, currency, rates and unique deal numbers before replacing the database. It builds a separate staging database and only replaces the preceding database on success. Failed imports and dry runs leave it intact. Close/restart the application when replacing its database. The generated SQLite file (about 900 MiB for this enriched dataset) is ignored by Git and excluded from deployment tracing. A fresh checkout must import its CSV files again.

The dashboard summarizes all available local records. Detailed analytics, reports and assistant requests without a period select the **latest available 30 calendar days**, show the actual dates and disclose this default. Select a product and dates for larger comparisons. Local detailed reads are capped at 50,000 matching rows; exports at 100,000. Oversized requests return a narrowing instruction, never a truncated aggregate. The commodity selector has a search field to handle hundreds of product descriptions. Missing-year chart gaps are left disconnected.

To repeat the local registry browser checks against an already running localhost server:

```powershell
$env:PLAYWRIGHT_BASE_URL='http://localhost:3000'
$env:UZEX_REGISTRY_E2E='1'
npx playwright test registry.e2e.ts
```

The regular browser suite still verifies the small deterministic demo independently. Local assistant mode uses deterministic query tools and does not call Gemini. Configure Gemini separately if provider-backed natural-language planning is required.

## Live imported records

1. Create a Supabase project. Apply the SQL in `supabase/migrations` using Supabase migrations or SQL editor.
2. Set `DATA_MODE=live`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. These are server-only. Restart the server.
3. Prepare CSV or JSON with `contract_number`, `trade_date` (YYYY-MM-DD), `product_name`, `price`, `quantity`, and `unit`. Optional fields: `external_id`, `currency`, `price_unit`, `contract_type`, `execution_status`. See `public/sample-trades.csv` for **synthetic** input. Never infer missing currency or price basis.
4. Validate with `npm run import:trades -- ./records.csv "Your source label" --dry-run`, then remove `--dry-run` to import. All rows validate before writes. Batches commit separately; failed imports can safely rerun. Source plus canonical input content determines record identity. Exact duplicates within a source deduplicate; contract numbers do not.

Live query failures surface as errors. They never fall back to synthetic records. Database RLS denies browser access; only the server service role reads/imports. No public insert policy exists. This application is designed for a shared analytics workspace. Do not load confidential records into an unauthenticated public deployment. `APP_API_KEY` optionally protects data and chat API routes; clients must supply `x-api-key` (e.g. through an authenticated reverse proxy). It is an integration gate, not a user login system.

## Gemini

Set `GEMINI_API_KEY` server-side and optionally `GEMINI_MODEL`. Default: **`gemini-3.5-flash-lite`**, documented as stable in [Google model documentation](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite), checked 2026-11-04. The official `@google/genai` SDK is pinned in the lockfile. Gemini 2.5 Flash is deprecated; it is deliberately not the default.

The centralized client verifies the configured model through `models.get` for the configured account (cached for ten minutes), then runs real Gemini function calling. The agent can use seven read-only tools, receive their results, and make another tool call before selecting the evidence and chart to present. Function-call response IDs and opaque thought signatures are preserved. Zod validates arguments, evidence, charts, and responses. Numerical narratives and visualizations are composed by deterministic code from stored results, never unconstrained model-authored numbers.

Chat has a 45-second overall budget, twenty-second SDK HTTP timeouts and at most three attempts with bounded exponential backoff for transient errors. The provider rejected the former eight-second deadline; the live-verified configuration satisfies its minimum. Reports have a thirty-second budget. Quota, configuration, timeout and data errors have safe bilingual messages. Missing credentials or explicit `AI_MODE=local` enable clearly labeled local tools. Configured Gemini failures do not silently switch modes; reports offer a separate calculated-report recovery action.

Conversation state is scoped to an HttpOnly browser-session cookie and conversation UUID, with bounded in-process memory and expiring HMAC-signed checkpoints. Set a stable `AGENT_STATE_SECRET` of at least 32 random characters on Vercel so follow-ups can resume on a new instance. Checkpoints contain active constraints and result IDs, not provider secrets. Browser transcripts remain untrusted context. A local development secret is generated in process when none is configured; local checkpoints then do not survive restarts. Clearing removes local/server conversation entries; an independently retained signed checkpoint expires within one hour.

## Architecture and accounting

- `src/app`: pages and Node.js API endpoints. `/api/health` exposes configuration booleans only.
- `src/lib/db`: server-only Supabase access, indexed filters, stable pagination, deterministic demo fixture.
- `src/lib/analytics`: decimal arithmetic; exact source amounts when available, otherwise price × quantity. Values stay grouped by currency and quantities by unit; cancelled records are excluded from both. Value requires known currency and `price_unit === unit`. The README2 dashboard additionally labels UZS conversion using trade-date source rates. No cross-unit addition. Forward and pending records remain in activity totals; these are transaction records, not settled cash flows.
- `src/lib/ai`: centralized Gemini client, bounded agent loop, validated tool registry, deterministic executor, conversation memory, evidence contracts, approved knowledge collection, safe errors and retry policy.
- `src/components`: shared shell, data states, charts, accessible shadcn primitives, transaction drawer.
- CSV export uses the same filters as the table and escapes formula prefixes and quotes.

Interactive analytics/export are capped at 100,000 records; narrow the date range for larger datasets. Live pages fetch records in stable 1,000-row batches to avoid Supabase's default row cap. For high scale, move aggregates into indexed SQL RPCs and stream exports. Public chat uses a 15-request/minute per-IP in-memory limiter with bounded buckets: deploy a shared gateway limiter for multiple instances and configure a trusted proxy to replace forwarded IP headers. A database index supports dates and normalized product text.

Agent tools are capped more tightly: 5,000 matched records per read, six calls over four rounds, ten displayed records, twenty reference IDs and ninety chart points. A large request fails with an instruction to narrow the period; it never presents a silently truncated aggregate. Comparisons may read two bounded datasets. Chat streams tool progress as NDJSON, then emits one fully validated answer. It deliberately does not stream unverified model prose.

## Verification and local release

Run on **localhost**. The current README2 integration uses the supplied synthetic CSV registry; the original small demo remains available through `DATA_MODE=demo`. No Vercel deployment or Supabase connection is active. No credentials are bundled. Earlier phases recorded Gemini checks; local-mode tests use unpaid tools. See the [test report](TEST_REPORT.md) and [three-minute demo](DEMO_GUIDE.md) for historical verification.

The design reference is `docs/design-concept.png`. The implementation preserves its dark shell, mint activity chart, compact metrics, commodity donut, and transaction/insight layout. Reference numbers and dates are deliberately replaced by fixture-derived values. Additional charts and responsive layouts implement the requested functionality.

## Environment and GitHub

| Variable                                    | Purpose                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------ |
| `DATA_MODE`                                 | `demo`, `local` (README2 SQLite registry), or `live`; invalid values fail closed     |
| `LOCAL_DATA_PATH`                           | Server-only SQLite path; defaults to `data/registry.sqlite`                          |
| `AI_MODE`                                   | `auto` uses configured Gemini; `local` runs explicitly labeled unpaid tools          |
| `GEMINI_API_KEY`                            | Server-only inference credential                                                     |
| `GEMINI_MODEL`                              | Account-supported model, checked at runtime                                          |
| `AGENT_STATE_SECRET`                        | Stable random secret, at least 32 characters; required on Vercel                     |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Server-only live data configuration                                                  |
| `APP_API_KEY`                               | Optional API gate supplied by an authenticated proxy; never place it in browser code |

Never use `NEXT_PUBLIC_` for these secrets. `.env.local` and `.vercel` are ignored. `npm run check:secrets` scans production static assets for configured secret literals; `npm run check:gemini` checks account/model metadata without generating tokens.

Use `DATA_MODE=local` for the supplied README2 registry or `DATA_MODE=demo` for the original fixture. Supabase and hosting configuration are retained as optional architecture from prior phases and are not connected. The GitHub remote is:

```powershell
git remote -v
# origin: https://github.com/Bol-F/qualifying-task-UZEX-AI-Hackathon.git
npm run build
npm start
```

Open http://localhost:3000. GitHub synchronization does not publish a hosted website. Do not commit `.env.local`, browser session state, or provider secrets. Historical deployment notes in `docs/phase-3.md` are reference material, not instructions to deploy this local release.
