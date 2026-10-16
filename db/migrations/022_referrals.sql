-- 022: invite a friend. Every learner gets a personal invite link (kabisa.app/?ref=<code>).
-- When someone who isn't a learner yet signs up through it, the inviter earns 100 gonga points.
-- The friend's email is never stored: the invite goes out from the learner's own email app.

alter table public.profile add column if not exists referral_code text unique;

create table if not exists public.referral (
  referred_id uuid primary key references public.account(id) on delete cascade,
  referrer_id uuid not null references public.account(id) on delete cascade,
  code text not null,
  points int not null default 100,
  created_at timestamptz not null default now()
);
create index if not exists referral_referrer_idx on public.referral (referrer_id);

alter table public.referral enable row level security;
drop policy if exists referral_select_own on public.referral;
create policy referral_select_own on public.referral for select using (referrer_id = auth.uid() or referred_id = auth.uid());
drop policy if exists referral_admin_all on public.referral;
create policy referral_admin_all on public.referral for all using (public.is_admin()) with check (public.is_admin());

-- The caller's invite code (created on first use).
create or replace function public.my_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c text;
begin
  if uid is null then return null; end if;
  select referral_code into c from profile where account_id = uid;
  while c is null loop
    begin
      c := substr(md5(random()::text || clock_timestamp()::text || uid::text), 1, 8);
      update profile set referral_code = c where account_id = uid;
      if not found then return null; end if;
    exception when unique_violation then
      c := null;
    end;
  end loop;
  return c;
end;
$$;

-- First name of whoever owns an invite code (shown on the landing page: "Amani invited you").
create or replace function public.referrer_first_name(p_code text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(split_part(trim(p.display_name), ' ', 1), ''), nullif(split_part(trim(a.first_name), ' ', 1), ''), 'A friend')
  from profile p join account a on a.id = p.account_id
  where p.referral_code = lower(trim(p_code))
  limit 1;
$$;

-- Called once by a new learner after sign-up. Only accounts created in the last day count
-- (people who were already learners can't be "referred"), never yourself, and only once.
create or replace function public.claim_referral(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inviter uuid;
  joined timestamptz;
begin
  if uid is null then return false; end if;
  select account_id into inviter from profile where referral_code = lower(trim(p_code));
  if inviter is null or inviter = uid then return false; end if;
  if exists (select 1 from referral where referred_id = uid) then return false; end if;
  select created_at into joined from account where id = uid;
  if joined is null or joined < now() - interval '1 day' then return false; end if;
  insert into referral (referred_id, referrer_id, code) values (uid, inviter, lower(trim(p_code)));
  return true;
end;
$$;

-- The caller's invite stats: friends who joined and the gonga points earned.
create or replace function public.my_referral_stats()
returns table (friends int, points int)
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int, coalesce(sum(points), 0)::int from referral where referrer_id = auth.uid();
$$;

revoke all on function public.my_referral_code() from public, anon;
revoke all on function public.claim_referral(text) from public, anon;
revoke all on function public.my_referral_stats() from public, anon;
revoke all on function public.referrer_first_name(text) from public;
grant execute on function public.my_referral_code() to authenticated;
grant execute on function public.claim_referral(text) to authenticated;
grant execute on function public.my_referral_stats() to authenticated;
grant execute on function public.referrer_first_name(text) to anon, authenticated;
