create table if not exists crm.job_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp before update on crm.job_types
for each row execute procedure crm.tg_set_timestamp();

insert into crm.job_types (name, code, sort_order)
values
  ('Marine Spares', 'MARINE_SPARES', 10),
  ('Hydraulic', 'HYDRAULIC', 20),
  ('Electrical', 'ELECTRICAL', 30),
  ('Navigation', 'NAVIGATION', 40),
  ('Automation', 'AUTOMATION', 50),
  ('Service / Repair', 'SERVICE_REPAIR', 60),
  ('Drydock Supply', 'DRYDOCK_SUPPLY', 70),
  ('Projects', 'PROJECTS', 80)
on conflict (name) do nothing;

alter table crm.enquiries
  add column if not exists job_type_id uuid references crm.job_types (id),
  add column if not exists sales_pic_user_id uuid references auth.users (id);

create index if not exists idx_enquiries_job_type on crm.enquiries (job_type_id);
create index if not exists idx_enquiries_sales_pic_user on crm.enquiries (sales_pic_user_id);

alter table crm.job_types enable row level security;

create policy "Allow authenticated read job types" on crm.job_types
for select using (auth.uid() is not null);

create policy "Allow authenticated modify job types" on crm.job_types
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create or replace function crm.list_active_sales_users()
returns table (
  id uuid,
  display_name text,
  email text
)
language sql
security definer
set search_path = crm, auth, public
as $$
  select
    u.id,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(split_part(u.email, '@', 1)), ''),
      u.email
    ) as display_name,
    u.email
  from auth.users u
  where u.deleted_at is null
  order by display_name;
$$;

grant execute on function crm.list_active_sales_users() to authenticated;
