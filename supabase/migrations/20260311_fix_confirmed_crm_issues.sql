-- Fix confirmed CRM issues:
-- 1) Re-enforce enquiry internal reference (job_number) trigger rule.
-- 2) Ensure quote->sales order conversion target columns exist in sales_order_items.

create or replace function crm.tg_set_enquiry_job_number()
returns trigger
language plpgsql
as $$
begin
  if new.job_number is null or btrim(new.job_number) = '' then
    new.job_number := 'ENQ-' || upper(substr(replace(new.id::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_enquiry_job_number on crm.enquiries;
create trigger trg_set_enquiry_job_number
before insert on crm.enquiries
for each row execute procedure crm.tg_set_enquiry_job_number();

alter table crm.sales_order_items
  add column if not exists supplier_cost numeric(14, 2) not null default 0,
  add column if not exists supplier_currency text not null default 'AED',
  add column if not exists exchange_rate numeric(14, 6) not null default 1,
  add column if not exists landed_aed_cost numeric(14, 2) not null default 0,
  add column if not exists margin_pct numeric(8, 3) not null default 0,
  add column if not exists discount_pct numeric(8, 3) not null default 0,
  add column if not exists discount numeric(14, 2) not null default 0;
