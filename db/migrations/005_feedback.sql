-- 005: in-app feedback. Rows are written by the learner (RLS: own rows only);
-- api/feedback.ts also emails each one to the feedback inbox.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  account_id uuid not null default auth.uid() references public.account(id) on delete cascade,
  email text,
  display_name text,
  page text,
  context text,
  message text not null check (char_length(message) between 1 and 4000),
  user_agent text
);

alter table public.feedback enable row level security;

create policy feedback_insert_own on public.feedback
  for insert to authenticated with check (account_id = auth.uid());
create policy feedback_select_own on public.feedback
  for select to authenticated using (account_id = auth.uid());
create policy feedback_admin_all on public.feedback
  for all using (is_admin()) with check (is_admin());

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);
