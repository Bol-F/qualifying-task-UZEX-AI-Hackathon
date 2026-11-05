# UZEX Insight AI

A Next.js financial analytics application with an evidence-grounded Uzbek / Russian assistant. The application starts without credentials in **DEMO DATA MODE**. Its 184 deterministic, synthetic records are stored in `src/lib/db/demo.ts`; none represent official UZEX transactions. No official live feed is claimed.

Explore stored transactions, compare commodities and trading periods, ask bilingual questions with inspectable evidence, investigate transparent statistical patterns, and print an analytics briefing. The first-visit guide supplies questions adapted to actual available records.

Submission package: [architecture](ARCHITECTURE.md), [three-minute demo and working feature checklist](DEMO_GUIDE.md), [release audit and test results](TEST_REPORT.md). Screenshots under `docs/screenshots` show the real application and retain synthetic-data labels.

## Run

Requires Node.js 24 and npm. Google Chrome is required for browser tests.

```powershell
npm ci
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

Open http://localhost:3000. Routes: `/dashboard`, `/assistant`, `/trades`, `/analytics`, `/reports`. `npm run build` and `npm start` run the production build. Checks: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:e2e`. Playwright builds and launches an isolated **production** server on port 3100 with demo data and local tools; it does not call paid APIs. Stop other Next.js development servers before E2E tests or a build: Next.js shares generated type files even when output directories differ. See [deployment instructions](docs/phase-3.md) and the [current release report](TEST_REPORT.md).

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
- `src/lib/analytics`: decimal arithmetic; values grouped by currency, quantities grouped by unit. Value is included only when currency is known and `price_unit === unit`. Exclusions are counted. No FX conversion or cross-unit addition. Forward and pending records remain in activity totals; these are transaction records, not settled cash flows.
- `src/lib/ai`: centralized Gemini client, bounded agent loop, validated tool registry, deterministic executor, conversation memory, evidence contracts, approved knowledge collection, safe errors and retry policy.
- `src/components`: shared shell, data states, charts, accessible shadcn primitives, transaction drawer.
- CSV export uses the same filters as the table and escapes formula prefixes and quotes.

Interactive analytics/export are capped at 100,000 records; narrow the date range for larger datasets. Live pages fetch records in stable 1,000-row batches to avoid Supabase's default row cap. For high scale, move aggregates into indexed SQL RPCs and stream exports. Public chat uses a 15-request/minute per-IP in-memory limiter with bounded buckets: deploy a shared gateway limiter for multiple instances and configure a trusted proxy to replace forwarded IP headers. A database index supports dates and normalized product text.

Agent tools are capped more tightly: 5,000 matched records per read, six calls over four rounds, ten displayed records, twenty reference IDs and ninety chart points. A large request fails with an instruction to narrow the period; it never presents a silently truncated aggregate. Comparisons may read two bounded datasets. Chat streams tool progress as NDJSON, then emits one fully validated answer. It deliberately does not stream unverified model prose.

## Verification and deployment

No credentials are bundled and no external database has been provisioned. Live Gemini model access, Russian database-grounded tool calling and structured report framing were checked using the configured account. Supabase integration still requires credentials and applied migrations. No public deployment has been performed or confirmed. See [deployment instructions and the three-minute demo](docs/phase-3.md).

The design reference is `docs/design-concept.png`. The implementation preserves its dark shell, mint activity chart, compact metrics, commodity donut, and transaction/insight layout. Reference numbers and dates are deliberately replaced by fixture-derived values. Additional charts and responsive layouts implement the requested functionality.
