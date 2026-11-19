-- Run this complete file once in this project's Supabase SQL Editor.
-- Safe to re-run. It does not delete existing products, receipts or users.
begin;

create table if not exists public.computer_care_records (
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('product', 'receipt', 'profile')),
  record_id text not null check (length(record_id) between 1 and 200),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision integer not null default 1 check (revision > 0),
  primary key (owner_id, kind, record_id)
);

create unique index if not exists computer_care_unique_product_sku
  on public.computer_care_records (owner_id, lower(trim(payload->>'sku')))
  where kind = 'product' and nullif(trim(payload->>'sku'), '') is not null;

alter table public.computer_care_records enable row level security;
revoke all on public.computer_care_records from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.computer_care_records to authenticated;

drop policy if exists "Owner reads records" on public.computer_care_records;
create policy "Owner reads records" on public.computer_care_records
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "Owner adds records" on public.computer_care_records;
create policy "Owner adds records" on public.computer_care_records
  for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "Owner edits records" on public.computer_care_records;
create policy "Owner edits records" on public.computer_care_records
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "Owner removes records" on public.computer_care_records;
create policy "Owner removes records" on public.computer_care_records
  for delete to authenticated using (owner_id = (select auth.uid()));

commit;
