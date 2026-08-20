-- ============================================================================
-- Migration 003 — auth account provisioning
--
-- Ticket A2 (IMPLEMENTATION_PLAN_V1.md §5). Creates the public.account and
-- public.profile rows automatically when a new Supabase Auth user signs in
-- for the first time (Google OAuth in V1).
--
-- security definer means this function runs with the privileges of its
-- owner (postgres), bypassing RLS — which is required here since
-- 002_rls.sql intentionally has no insert policy for account/profile from
-- the client side. See the comment above the account policies in
-- 002_rls.sql.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.account (id, google_sub, email, first_name, last_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'sub',
    new.email,
    coalesce(new.raw_user_meta_data ->> 'given_name', ''),
    coalesce(new.raw_user_meta_data ->> 'family_name', '')
  )
  on conflict (id) do nothing;

  insert into public.profile (account_id, proficiency)
  values (new.id, 'beginner')
  on conflict (account_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
