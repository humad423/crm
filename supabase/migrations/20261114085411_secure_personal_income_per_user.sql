-- Applied to project "crm" on 2026-11-14.
-- Before this migration the income tables had a policy "using (true)" for every role,
-- so anyone holding the public anon key could read, change or delete all income data.

-- 1. Assign ownerless income rows to the only existing account (fails safely if there is more than one user)
do $$
declare owner uuid;
begin
  if (select count(*) from auth.users) <> 1 then
    raise exception 'Expected exactly one user to backfill income ownership';
  end if;
  select id into owner from auth.users limit 1;
  update public.personal_income_sources set user_id = owner where user_id is null;
  update public.personal_income_entries set user_id = owner where user_id is null;
end $$;

-- 2. Ownership is mandatory and tied to the auth user
alter table public.personal_income_sources alter column user_id set not null, alter column user_id set default auth.uid();
alter table public.personal_income_entries alter column user_id set not null, alter column user_id set default auth.uid();
alter table public.personal_income_sources add constraint personal_income_sources_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.personal_income_entries add constraint personal_income_entries_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

-- 3. Keys scoped per user (two users may both have a source called "src_job")
alter table public.personal_income_entries drop constraint personal_income_entries_source_id_fkey;
alter table public.personal_income_sources drop constraint personal_income_sources_pkey;
alter table public.personal_income_sources add constraint personal_income_sources_pkey primary key (user_id, id);
alter table public.personal_income_entries drop constraint personal_income_entries_pkey;
alter table public.personal_income_entries add constraint personal_income_entries_pkey primary key (user_id, id);
alter table public.personal_income_entries add constraint personal_income_entries_source_fkey
  foreign key (user_id, source_id) references public.personal_income_sources(user_id, id) on delete cascade;
create index if not exists personal_income_entries_user_source_idx on public.personal_income_entries (user_id, source_id);

-- 4. Replace the "everyone can do everything" policies with owner-only access
drop policy if exists "Allow full access on personal_income_sources" on public.personal_income_sources;
drop policy if exists "Allow full access on personal_income_entries" on public.personal_income_entries;
create policy "Owners manage their income sources" on public.personal_income_sources
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Owners manage their income entries" on public.personal_income_entries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 5. Anonymous visitors get no table access at all
revoke all on public.personal_income_sources, public.personal_income_entries from anon;
