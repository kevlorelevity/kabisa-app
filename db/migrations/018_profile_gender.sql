-- 018: learner gender, so the other speakers address women as mama / dada / sista
-- instead of boss / bwana. Asked at sign-up; existing learners are asked once on their next visit.
alter table public.profile
  add column if not exists gender text check (gender in ('female', 'male', 'unspecified'));

comment on column public.profile.gender is 'female | male | unspecified — how the other speakers in a conversation address the learner.';
