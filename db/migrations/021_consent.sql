-- 021: terms consent + email-updates opt-in, and self-service account deletion.
--
-- Every learner must accept the Terms (Ol Doinyo Technologies Ltd) to use Kabisa: new learners
-- at sign-up, existing learners on their next visit. The email opt-in (learning summary, nudges,
-- key app updates) is pre-ticked; the learner can untick it, here or later on their profile.
-- A learner who doesn't accept can delete their account themselves (delete_my_account()).

alter table public.profile
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists email_updates boolean,
  add column if not exists email_updates_at timestamptz;

comment on column public.profile.terms_accepted_at is 'When the learner accepted the Terms (null = not yet; app is blocked until set).';
comment on column public.profile.terms_version is 'Version of the Terms accepted, e.g. 2026-10-16.';
comment on column public.profile.email_updates is 'Opted in to email learning summaries, nudges and key app updates (null = never asked).';
comment on column public.profile.email_updates_at is 'When email_updates was last set.';

-- Deletes the calling learner: public.account (cascades to profile, progress, scores, feedback,
-- suggestions, srs cards) and the auth user. Admin-authored content keeps its rows (created_by
-- is set null by the existing FKs).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from public.edit_log where actor_id = uid;
  delete from public.account where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
