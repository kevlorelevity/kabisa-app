-- ============================================================================
-- 006b: admin allow-list (RUN MANUALLY in the Supabase SQL editor)
--
-- * public.admin_email lists the emails that get role = 'admin' on sign-in.
--   Add a reviewer:  insert into public.admin_email (email) values ('name@kabisa.app');
-- * Learners can no longer change their own role (account_update_own allowed it).
-- (Claude's database connector refuses to apply privilege changes, so this one
--  is run by hand: Supabase dashboard → SQL Editor → paste → Run.)
-- ============================================================================

create table if not exists public.admin_email (
  email text primary key check (email = lower(email)),
  added_at timestamptz not null default now()
);
alter table public.admin_email enable row level security;
create policy admin_email_admin_all on public.admin_email
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.admin_email (email) values
  ('kevin@kabisa.app'),
  ('wanyonyi@kabisa.app')
on conflict do nothing;

-- Promote on sign-up / sign-in (runs as owner, bypassing RLS).
create or replace function public.apply_admin_allowlist()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (select 1 from public.admin_email ae where ae.email = lower(new.email)) then
    new.role := 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists account_admin_allowlist on public.account;
create trigger account_admin_allowlist
  before insert on public.account
  for each row execute function public.apply_admin_allowlist();

-- Learners can update their own account row, but never their role.
create or replace function public.protect_account_role()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') = 'authenticated'
     and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists account_protect_role on public.account;
create trigger account_protect_role
  before update on public.account
  for each row execute function public.protect_account_role();

-- Existing accounts that are on the list.
update public.account set role = 'admin'
where lower(email) in (select email from public.admin_email) and role <> 'admin';

