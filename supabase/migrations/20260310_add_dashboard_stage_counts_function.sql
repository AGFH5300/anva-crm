create or replace function crm.crm_get_dashboard_stage_counts()
returns table (
  enquiries bigint,
  quotations bigint,
  sale_orders bigint,
  invoices bigint
)
language sql
stable
as $$
  select
    (select count(*) from crm.enquiries where status not in ('won', 'lost')) as enquiries,
    (select count(*) from crm.quotations where status in ('draft', 'sent')) as quotations,
    (select count(*) from crm.sales_orders where status in ('draft', 'confirmed', 'in-progress')) as sale_orders,
    (select count(*) from crm.invoices where status in ('draft', 'issued', 'overdue')) as invoices;
$$;
