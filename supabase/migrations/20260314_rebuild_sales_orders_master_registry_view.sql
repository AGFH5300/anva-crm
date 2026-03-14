create or replace view crm.v_sales_orders_master_registry as
select
  so.id,
  so.document_number,
  so.quotation_document_number,
  so.issue_date,
  so.client_id,
  c.name as client_name,
  so.client_po_number,
  so.status,
  so.total,
  so.created_at
from crm.sales_orders so
left join crm.clients c
  on so.client_id = c.id
order by so.created_at desc;
