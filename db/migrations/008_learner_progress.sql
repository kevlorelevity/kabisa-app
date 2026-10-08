-- 008: lesson scores + level/XP in Supabase (previously browser-only).
-- The app keeps localStorage as its working copy and syncs here
-- (src/lib/progressSync.ts). Learners read/write their own rows; admins read all.

create table if not exists public.lesson_score (
  account_id uuid not null default auth.uid() references public.account(id) on delete cascade,
  lesson_id text not null,
  -- The full LessonScoreRecord (best/last/attempts/failed per section + weak items).
  record jsonb not null,
  dialogue_best real,
  practice_best real,
  attempts int not null default 0,
  passed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (account_id, lesson_id)
);

create table if not exists public.learner_progress (
  account_id uuid primary key default auth.uid() references public.account(id) on delete cascade,
  level int not null default 1,
  level_name text,
  xp int not null default 0,
  lessons_passed int not null default 0,
  lessons_started int not null default 0,
  lessons_total int not null default 0,
  next_lesson_id text,
  course_complete boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.lesson_score enable row level security;
alter table public.learner_progress enable row level security;

create policy lesson_score_own on public.lesson_score
  for all to authenticated using (account_id = auth.uid()) with check (account_id = auth.uid());
create policy lesson_score_admin_read on public.lesson_score
  for select to authenticated using (is_admin());

create policy learner_progress_own on public.learner_progress
  for all to authenticated using (account_id = auth.uid()) with check (account_id = auth.uid());
create policy learner_progress_admin_read on public.learner_progress
  for select to authenticated using (is_admin());

-- One row per signed-up account, for "who's where" questions. security_invoker
-- so it obeys the RLS above (admins see everyone, learners only themselves).
create or replace view public.learner_overview with (security_invoker = true) as
select
  a.email,
  p.display_name,
  p.nationality,
  a.role,
  a.created_at as signed_up_at,
  lp.level,
  lp.level_name,
  lp.xp,
  lp.lessons_passed,
  lp.lessons_started,
  lp.lessons_total,
  lp.next_lesson_id,
  lp.course_complete,
  lp.updated_at as last_progress_at
from public.account a
left join public.profile p on p.account_id = a.id
left join public.learner_progress lp on lp.account_id = a.id;
