create extension if not exists pg_trgm;

create table public.trades (
  id text primary key,
  external_id text,
  contract_number text not null,
  trade_date date not null,
  product_name text not null,
  normalized_product_name text not null,
  price numeric(24,6) not null check (price >= 0),
  quantity numeric(24,6) not null check (quantity >= 0),
  unit text not null,
  price_unit text,
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  contract_type text not null default 'Unknown',
  execution_status text not null default 'Unknown',
  data_source text not null,
  imported_at timestamptz not null default now()
);
comment on column public.trades.price_unit is 'Explicit denominator of the quoted price; null when unknown. Do not infer from quantity unit.';
comment on column public.trades.contract_number is 'Contract numbers are not assumed unique.';
create index trades_date_id_idx on public.trades (trade_date desc, id);
create index trades_product_search_idx on public.trades using gin (normalized_product_name gin_trgm_ops);
create index trades_contract_search_idx on public.trades using gin (contract_number gin_trgm_ops);
create index trades_external_search_idx on public.trades using gin (external_id gin_trgm_ops);
create index trades_currency_price_idx on public.trades (currency, price);
alter table public.trades enable row level security;
revoke all on public.trades from anon, authenticated;
grant select, insert, update on public.trades to service_role;
