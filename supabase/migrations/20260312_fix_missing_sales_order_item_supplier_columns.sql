-- Hotfix: some environments are missing supplier pricing columns on sales_order_items,
-- causing crm_convert_quotation_to_sales_order to fail at runtime.

alter table if exists crm.sales_order_items
  add column if not exists supplier_cost numeric(14, 2) not null default 0,
  add column if not exists supplier_currency text not null default 'AED',
  add column if not exists exchange_rate numeric(14, 6) not null default 1,
  add column if not exists landed_aed_cost numeric(14, 2) not null default 0,
  add column if not exists margin_pct numeric(8, 3) not null default 0,
  add column if not exists discount_pct numeric(8, 3) not null default 0,
  add column if not exists discount numeric(14, 2) not null default 0;
