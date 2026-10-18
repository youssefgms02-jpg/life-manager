-- Run this once in Supabase > SQL Editor
create table if not exists public.lm_records (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  k text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at bigint not null,
  deleted boolean not null default false,
  srv_at timestamptz not null default clock_timestamp(),
  primary key (user_id, k)
);
create index if not exists lm_records_srv on public.lm_records (user_id, srv_at);
alter table public.lm_records enable row level security;
drop policy if exists "own rows" on public.lm_records;
create policy "own rows" on public.lm_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create or replace function public.lm_touch() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then return null; end if; -- keep the newer edit
  new.srv_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists lm_touch on public.lm_records;
create trigger lm_touch before insert or update on public.lm_records for each row execute function public.lm_touch();
