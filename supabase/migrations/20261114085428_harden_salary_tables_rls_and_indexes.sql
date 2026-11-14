-- Applied to project "crm" on 2026-11-14.
-- Owner-only policies evaluated once per query ((select auth.uid())), no anon access,
-- per-user indexes, and repaired payments.year/month (they were saved from the month on screen).

-- user_settings
drop policy if exists "Users can view their own settings" on public.user_settings;
drop policy if exists "Users can insert their own settings" on public.user_settings;
drop policy if exists "Users can update their own settings" on public.user_settings;
create policy "Owners manage their settings" on public.user_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- exceptions
drop policy if exists "Users can view their own exceptions" on public.exceptions;
drop policy if exists "Users can insert their own exceptions" on public.exceptions;
drop policy if exists "Users can update their own exceptions" on public.exceptions;
drop policy if exists "Users can delete their own exceptions" on public.exceptions;
create policy "Owners manage their exceptions" on public.exceptions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- monthly_salaries
drop policy if exists "Users can perform all actions on their own monthly salaries" on public.monthly_salaries;
create policy "Owners manage their monthly salaries" on public.monthly_salaries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- payments
drop policy if exists "Users can perform all actions on their own payments" on public.payments;
create policy "Owners manage their payments" on public.payments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- schedule_periods
drop policy if exists "Users manage own schedule_periods" on public.schedule_periods;
create policy "Owners manage their schedule periods" on public.schedule_periods
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Anonymous visitors never need table access (the app requires login)
revoke all on public.user_settings, public.exceptions, public.monthly_salaries, public.payments, public.schedule_periods from anon;

-- New rows default to the logged-in user
alter table public.exceptions alter column user_id set default auth.uid();
alter table public.monthly_salaries alter column user_id set default auth.uid();
alter table public.payments alter column user_id set default auth.uid();
alter table public.schedule_periods alter column user_id set default auth.uid();

-- Indexes for the per-user lookups used by every query and policy
create index if not exists exceptions_user_date_idx on public.exceptions (user_id, date);
create index if not exists payments_user_date_idx on public.payments (user_id, date);
create index if not exists schedule_periods_user_from_idx on public.schedule_periods (user_id, effective_from);

-- Fix payments whose year/month did not match their own date
update public.payments
set year = extract(year from date)::int,
    month = extract(month from date)::int - 1
where year <> extract(year from date)::int or month <> extract(month from date)::int - 1;
