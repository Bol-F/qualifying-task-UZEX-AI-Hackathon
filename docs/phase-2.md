# Phase 2: evidence-backed Gemini agent

This is the Phase 2 architecture record. [Phase 3](phase-3.md) supersedes its request timing, checkpoint persistence and verification status.

## Runtime

`POST /api/chat` accepts a bounded user message, optional conversation UUID, UI language, and a regeneration flag. Legacy `messages` requests still work. New clients request `application/x-ndjson` for live tool activity followed by a validated answer. JSON remains available. `DELETE /api/chat?id=<uuid>` clears one conversation; omitting the ID clears the browser owner's conversations. These operations only modify conversational memory.

The server authenticates the existing optional application access key, checks browser origin, applies rate limiting and a streamed 50,000-byte body limit, and assigns an HttpOnly SameSite cookie. Conversation UUIDs are scoped by cookie owner. A per-conversation lock prevents concurrent context writes. State commits only after successful analysis. Regeneration restores the context and bounded history from before the last turn, avoiding repeated relative-date shifts.

The official `@google/genai` client is constructed only in a `server-only` module. `GEMINI_API_KEY` never enters browser code, responses, or logs. `GEMINI_MODEL` defaults to documented stable `gemini-3.5-flash-lite`; [Google's model page](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite) was checked on 2026-11-04. Runtime `models.get` verifies account access; there is no assumed account entitlement or automatic model substitution. The implementation follows [Google's function-calling documentation](https://ai.google.dev/gemini-api/docs/function-calling) and the [official SDK](https://googleapis.github.io/js-genai/release_docs/). Model content parts, function-call IDs and thought signatures are passed back unchanged within the loop.

## Tools

| Tool                      | Deterministic behavior                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `search_trades`           | Product/ID text search, exact contract number, dates, currency, unit, quantity/price bounds, status, bounded sorting and records. |
| `get_trade_details`       | Exact internal ID lookup with stored source metadata; contract numbers are not assumed unique.                                    |
| `get_market_overview`     | Counts, values per currency, quantities per unit and dataset coverage.                                                            |
| `get_top_commodities`     | Explicit count/value/quantity ranking. Financial/quantity ranking requires compatible currency/unit.                              |
| `compare_trading_periods` | Two inclusive date ranges, deterministic totals and signed difference.                                                            |
| `get_transaction_trends`  | Daily aggregates, optionally last N available trading dates, bounded to ninety chart points.                                      |
| `explain_exchange_term`   | Deterministic approved bilingual retrieval with source links and scope limitations.                                               |

Tool schemas reject unknown properties. Results enter the model as function responses, so the agent can choose another query using actual record IDs, dates and coverage. The model's final JSON selects an evidence ID and optional chart type. It cannot author new chart points or executable code. Numeric narrative, metrics, source tables and charts all originate from deterministic calculations. This intentionally prioritizes traceability over unrestricted market commentary.

All financial arithmetic uses decimal.js with sufficient precision for PostgreSQL numeric products. Unknown currencies and incompatible price bases are excluded with warnings; unavailable financial aggregates are not fabricated as zero. Quantities are never summed across incompatible units. Pending and forward records count as activity, not settled cash flows.

## Evidence and interface

Answers carry narrative text, localized metrics, matched records, applied filters, dataset date coverage, source import observations, sampled reference IDs and a SHA-256 fingerprint covering query arguments and calculation records. The fingerprint identifies a result snapshot; it is not a proof of source authenticity. Full record tables are bounded samples, and the UI shows how many records matched. Chart underlying aggregates can be inspected without converting the exact decimal strings into approximate display values.

Recharts renders validated line, bar, area and donut specifications. Tool activity streams before the final answer; no raw call JSON or unverified token stream appears in the product. The workspace includes copy, regeneration, suggested follow-ups, timestamps, local history, clear conversation, expandable sources, and visible synthetic/imported mode.

## Language and dates

Gemini sees bounded history, active filters and last tool arguments. Dates are interpreted against Asia/Tashkent; date-only questions without a year use the current year. The local fallback handles the documented Russian/Uzbek examples, Uzbek Cyrillic follow-ups, common carbamide spelling variants, and mixed product/date queries. Language selection follows the latest question, with explicit language requests taking precedence. Local parsing is intentionally limited; arbitrary linguistic interpretation requires Gemini.

## Approved knowledge

The collection uses verified [UZEX company information](https://www.uzex.uz/ru/pages/about-us) and a clearly marked [archived UZEX explanation](https://uzex.uz/News/how-does-the-uzex-exchange-end-2019?lang=ru). Application definitions such as synthetic status labels and price-basis accounting are labeled as application policy. It does not invent official contract-status mappings, auction deadlines, fees, or legal definitions. Source text is paraphrased and versioned by review date; it is not fetched dynamically during an agent request. No vector database is required.

## Safety limits

- Thirty-second request deadline; eight-second SDK HTTP timeout; three attempts with 250/500 ms backoff for transient status codes and quota errors.
- Four model rounds; six tools; one repair opportunity for malformed arguments; 5,000 records per read; ten shown records; twenty sampled reference IDs; ninety chart points.
- Up to twelve history messages and 12,000 characters, two hundred in-process conversations, one-hour idle expiry, per-conversation locking.
- Fifty-thousand-byte request body and fifteen public AI requests per minute per IP. Imported fields and external snippets are always untrusted; they confer no instructions or capabilities.
- Read-only allowlisted Supabase builders with cancellation; no SQL tool, arbitrary function execution, provider browsing, or transaction mutation path exists.

## Verification and limits

Final verification: lint and strict typecheck pass, 26 automated unit tests pass, five Playwright flows pass, and the optimized production build passes. The production dependency audit reports zero vulnerabilities. The full development-tool audit flags a minimatch advisory in the lint dependency tree; it does not affect the shipped runtime, and incompatible forced dependency downgrades were not applied.

Automated unit tests mock Gemini's content and function calls, including a multi-step search → exact record lookup, signature preservation, Russian → Uzbek context → chart → source → missing-data acceptance flow, malformed arguments, quota failures, relative dates, session isolation, regeneration and injection attempts. Browser tests exercise real routes and the local tool executor without requiring paid API calls, alongside the Phase 1 dashboard and explorer regressions.

Browser plugin was unavailable; verification uses Playwright with installed Chrome at desktop 1536 × 1024 and mobile 390 × 844. The tested flow is `/assistant` → Russian query → Uzbek Cyrillic follow-up → chart → inspect sources → regenerate → reload saved history → missing data → cited knowledge → clear conversation. Browser screenshots are visually inspected for chart rendering, typography, source-table overflow, navigation, and consistency with the existing design.

Live Gemini and Supabase calls remain unverified without credentials. In-process conversation state and rate limiting require a single server instance for this prototype; distributed production hosting needs shared storage and a trusted rate-limiting proxy. Display history survives reload, while trusted context does not survive a server restart. The assistant is not an authentication system or an official UZEX data feed.

TypeScript is pinned to 6.0.3 because the installed Next.js ESLint stack does not support the TypeScript 7 compiler API. Existing effect-based resource loading and localStorage hydration retain their established patterns; the `set-state-in-effect` advisory is disabled, while the remaining Next.js and TypeScript lint rules run.
