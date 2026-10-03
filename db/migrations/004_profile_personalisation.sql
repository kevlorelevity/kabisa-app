-- 004: learner personalisation captured at sign-up.
-- The lessons cast the learner as the first-person speaker; these fields
-- replace the default "John from Uganda" with the learner's own name and country.
alter table public.profile
  add column if not exists display_name text,
  add column if not exists nationality text,          -- ISO 3166-1 alpha-2, e.g. 'DE'
  add column if not exists onboarded_at timestamptz;

comment on column public.profile.display_name is 'First name the learner wants to be called in lessons.';
comment on column public.profile.nationality is 'ISO 3166-1 alpha-2 country code chosen at sign-up.';
comment on column public.profile.onboarded_at is 'Set when the learner completes the welcome form.';
