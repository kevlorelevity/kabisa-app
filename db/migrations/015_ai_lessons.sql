-- 015: new lessons written by the AI at an admin's request (api/ai-lesson.ts).
--   ai_lesson — a whole lesson (same JSON shape as content/lessons/*.json), added to a level for
--               everyone. created_at is when it went live: learners who had cleared that level
--               before then may skip it (src/lib/lessonScores.ts).
--   ai_job.scope 'lesson' — the background job that writes one.
create table if not exists public.ai_lesson (
  id text primary key,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.account(id) on delete set null,
  job_id uuid references public.ai_job(id) on delete set null,
  level int not null check (level between 1 and 10),
  value jsonb not null,
  active boolean not null default true
);
alter table public.ai_lesson enable row level security;
create policy ai_lesson_read_active on public.ai_lesson for select using (active or public.is_admin());
create policy ai_lesson_admin_insert on public.ai_lesson for insert with check (public.is_admin());
create policy ai_lesson_admin_update on public.ai_lesson for update using (public.is_admin()) with check (public.is_admin());
create index if not exists ai_lesson_job_idx on public.ai_lesson (job_id);

alter table public.ai_job drop constraint if exists ai_job_scope_check;
alter table public.ai_job add constraint ai_job_scope_check check (scope in ('item', 'dialogue', 'practice', 'followup', 'lesson'));
