-- Read paths added by the comparison explorer and freshness indicator.
create index if not exists trades_product_date_idx on public.trades (product_name,trade_date desc,id);
create index if not exists trades_contract_type_date_idx on public.trades (contract_type,trade_date desc);
create index if not exists trades_imported_at_idx on public.trades (imported_at desc);
