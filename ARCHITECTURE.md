# UZEX Insight AI architecture

This is the existing Next.js App Router application, hardened for the November 2026 demonstration. It is a shared analytics workspace, not a brokerage, order-entry system, official UZEX feed, or full exchange register.

Current operating scope: **localhost**. The supplied README2 registry is active through `DATA_MODE=local`: 393,353 synthetic records in a local SQLite database. `DATA_MODE=demo` retains the 184-row fixture. Existing Supabase/Vercel adapters are dormant; no external database/hosting connection is established.

## Request and data flow

`Browser → read-only Next.js routes → validated query builders → local SQLite registry, synthetic fixture, or optional Supabase trades`

`Assistant → bounded agent → official @google/genai function calls → seven allowlisted tools → deterministic calculations → validated evidence/chart contract → browser`

The shell joins Dashboard, Trade Explorer, Assistant, Market Explorer and Reports. React components own interaction state; reusable hooks handle cancellation and errors. Recharts renders numeric projections of exact decimal aggregates. Exact values and source records remain available beside charts.

## Interface preferences

`PreferencesProvider` owns the theme and interface language, shared by the navbar and every workspace. `themes.css` defines semantic colors for light/dark surfaces, text, controls, notices and charts. The initial light theme uses white surfaces with emerald, blue and violet accents. Mobile navigation has persistent visible labels.

The root layout reads allowlisted `uzex-theme` and `uzex-language` cookies using the async Next.js cookies API. This intentionally makes the page shell dynamic so the server emits the correct HTML language/theme before hydration, avoiding a theme flash. Preference cookies contain no credentials or analytics records. Controls update the UI immediately and persist for one year; no database or cloud integration is involved.

Uzbek and Russian UI catalogs, interpolation, canonical analytics-sentence patterns and field labels live in `src/lib/i18n`. Localization changes presentation only: source names, identifiers, exact numbers, query arguments and exported CSV values remain unchanged. Unknown imported content is rendered as literal text. The assistant's latest-question language detection stays independent of the interface preference; English is an interface option, while the agent's supported languages remain Uzbek/Russian.

Browser chat history remains bounded and validated. `uzex-active-chat-v2` remembers the selected conversation so a reload restores its saved transcript. New/clear conversation actions reset that selection.

## Boundaries

| Layer                      | Responsibility                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/api`              | Origin checks for conversational/report mutations, authorization gate, request validation, byte limits, deadlines, rate limiting, safe responses |
| `src/lib/db`               | Server-only credential access, stable pagination, quoted PostgREST values, compatible filtering, explicit demo/live selection                    |
| `src/lib/analytics`        | Decimal arithmetic, coverage, comparisons, observations, statistical rules, source links                                                         |
| `src/lib/ai`               | SDK client, model-access check, retry policy, tool loop, evidence schemas, signed checkpoints, approved knowledge                                |
| `src/components`           | Shared financial UI; charts, accessible controls, source drawers, report printing                                                                |
| `scripts/import-trades.ts` | CLI-only validated ingestion; no public transaction write route                                                                                  |

## Storage and provenance

The README2 adapter in `src/lib/registry` reads an indexed, read-only SQLite database through Node.js 24's built-in `node:sqlite`. Its importer streams CSV files, identifies schemas from column headers, joins contract/participant/rate references, validates rows and writes a temporary database. A successful import atomically replaces the destination. Failed imports and dry runs preserve the previous database; restarting the application switches existing read connections to the newly imported snapshot.

SQLite stores enriched source records as JSON plus indexed dates, IDs, products, contract fields and fixed-width decimal sort keys. Exact decimal strings never pass through binary floating-point sorting. The source manifest records file hashes, actual row counts, coverage and missing years/directories. The supplied files contain no 2024 trades or broker-name directory; neither is fabricated. `/api/dataset` and expandable source notices expose this incompleteness. Raw CSV files are preserved.

The complete dashboard summary is calculated during import using a streaming Decimal accumulator and persisted with the snapshot. Filtered summaries use the same accumulator with a bounded process-local cache. This supports all 393,353 records without returning them to the browser. SQLite data files are ignored by Git and excluded from deployment tracing; local mode requires provisioning the file on the host.

The `trades` table stores text source identifiers, contract number, date, product and normalized name, PostgreSQL `numeric(24,6)` price/quantity, quoted price basis, unit, optional currency, contract type/status, source label and import time. Contract numbers are deliberately not unique. Numeric columns are selected as text to preserve financial precision.

Indexes support date/ID pagination, commodity and identifier search, currency/price, product/date, contract type/date and import freshness. RLS is enabled; `anon` and `authenticated` have no table grants. A server-only service-role credential supports controlled reads and CLI imports. No database resources were provisioned or migrated by this audit.

Imports validate all rows before writes, normalize bilingual aliases, hash source plus canonical input for identity, deduplicate identical source rows, and upsert in bounded batches. A later batch failure can leave earlier batches committed; rerunning is idempotent. Source labels document provenance but are not independent authenticity verification.

## Accounting invariants

- Count means stored transaction records, not the total activity of the exchange.
- Transaction value uses the exact source amount when supplied, otherwise `price × quantity`, only when currency is known and `price_unit === unit`.
- README2 quantity is `lot count × lot size`. Displayed derived unit prices are rounded; financial totals use the exact original amount. Cancelled records count as registry activity but do not contribute to value or volume.
- Values stay separate by currency and quantities by unit. README2 additionally supplies an explicitly labeled UZS total using each trade date's source USD rate. No FX or cross-unit conversion is inferred for other imports.
- Price filters require currency and quoted price basis. Decimal strings retain precision through filtering and sorting.
- Missing observations remain unavailable; a real zero value remains zero. Percentage changes require an observed, nonzero baseline.
- Latest import time is the maximum stored import timestamp. Refresh time is separately labeled.
- Pending/forward transactions contribute to activity; they are not represented as settled cash flows.

## AI execution and evidence

The SDK runs only on the server with `GEMINI_API_KEY` and `GEMINI_MODEL`. The configured model is checked using `models.get`, then cached for ten minutes. Google function response IDs and thought signatures are preserved. The agent permits at most six calls across four rounds. SDK requests have a twenty-second timeout; chat has a forty-five-second total deadline. Transient failures use up to three attempts with bounded backoff.

Tools: `search_trades`, `get_trade_details`, `get_market_overview`, `get_top_commodities`, `compare_trading_periods`, `get_transaction_trends`, `explain_exchange_term`. Zod validates every argument. No tool accepts SQL, JavaScript, arbitrary function names, external URLs, or transaction mutations.

Model-authored numeric prose is not rendered. Deterministic code constructs counts, metrics, tables and source references. Gemini selects tools, evidence and safe visualization types. Reports constrain AI to evidence IDs and approved explanatory framing; they do not generate unrestricted investment commentary. Imported fields, history and source documents are untrusted.

Narrow sorts, language-only replays and previous-available-day count comparisons reuse validated context without inference calls and display a deterministic-engine label. `AI_MODE=local` is an explicit, limited bilingual query planner, not a claim of Gemini generation. Provider failures do not silently change the configured AI mode.

## Conversation state

An HttpOnly, same-site browser cookie scopes a conversation UUID. Bounded process memory retains active filters, messages and referenced IDs. A stable `AGENT_STATE_SECRET` signs one-hour checkpoints so another instance can restore constraints from untrusted browser transcripts. Tokens are signed, not encrypted. Clearing local history does not revoke independently retained checkpoints before expiry. Local development uses a process secret when none is configured.

## Performance and operational limits

Supabase reads run in stable 1,000-row pages. SQLite table pages use indexed queries; its dashboard summary covers the full dataset, exports cap at 100,000 matching rows, and detailed agent/workspace reads cap at 50,000. Other modes retain their 100,000 dashboard/export and 5,000 tool/workspace limits. Oversized selections fail explicitly. Local detailed analysis without dates selects and discloses the latest available month. Indexed distinct-date queries discover previous available days and the last requested trading days without reading the entire registry. Source samples, six tool calls, ninety assistant chart points and 366 workspace dates bound UI and inference payloads.

Analytics reuse a coverage promise per request and a selected measure within the workspace. Independent reads run concurrently; freshness-sensitive routes and database fetches use `no-store`. Database cancellation combines the caller's signal with a fifteen-second source timeout.

The AI/report limiter permits fifteen requests per minute per forwarded IP with bounded process-local buckets. Vercel overwrites client IP forwarding headers; a custom deployment must supply a trusted proxy. Strict global enforcement and locks across instances need a shared gateway/store. Confidential imported data requires workspace authentication or a trusted proxy supplying the optional `APP_API_KEY`; that key is not a browser login implementation.

## Release verification

The Playwright runner builds an isolated production artifact in `.next-e2e`, then serves port 3100 with `DATA_MODE=demo` and `AI_MODE=local`. It cannot accidentally exercise the configured Gemini key. The normal production build uses `.next`. Tests require installed Google Chrome. Live generation is an independently authorized provider check, not a requirement for deterministic tests.

Official references reviewed during the audit: [Next.js data security](https://nextjs.org/docs/app/guides/data-security), [Google function calling](https://ai.google.dev/gemini-api/docs/function-calling), [Supabase OR filters](https://supabase.com/docs/reference/javascript/or), [PostgREST quoted values](https://docs.postgrest.org/en/stable/references/api/url_grammar.html#reserved-characters), [Vercel forwarding headers](https://vercel.com/docs/headers/request-headers). Approved UZEX source URLs are stored in `src/lib/ai/knowledge.ts`; legal definitions and current auction rules outside that collection remain unavailable.
