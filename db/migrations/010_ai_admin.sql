-- 010: AI-assisted admin edits.
--   ai_job         — an admin's instruction ("add a Sanifu footnote", "more questions about family"),
--                    processed in the background by api/ai-edit.ts (Claude API).
--   content_patch  — the result: a replacement for one turn / practice item, or a lesson's whole
--                    dialogue / practice, applied on top of the bundled lesson JSON for everyone.
--   admin_guidance — "why" notes from admins: a growing house style guide fed into every AI edit.

create table if not exists public.ai_job (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.account(id) on delete set null,
  lesson_id text not null,
  scope text not null check (scope in ('item', 'dialogue', 'practice')),
  item_id text,
  target_label text,
  instruction text not null check (char_length(instruction) between 1 and 4000),
  status text not null default 'working' check (status in ('working', 'live', 'failed', 'undone')),
  summary text,
  error text,
  patch_id uuid
);

create table if not exists public.content_patch (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.account(id) on delete set null,
  job_id uuid references public.ai_job(id) on delete set null,
  lesson_id text not null,
  scope text not null check (scope in ('item', 'dialogue', 'practice')),
  item_id text,
  value jsonb not null,
  active boolean not null default true
);

create table if not exists public.admin_guidance (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.account(id) on delete set null,
  text text not null check (char_length(text) between 1 and 4000),
  lesson_id text,
  item_id text,
  target_label text,
  active boolean not null default true
);

alter table public.ai_job enable row level security;
alter table public.content_patch enable row level security;
alter table public.admin_guidance enable row level security;

create policy ai_job_admin_all on public.ai_job for all using (public.is_admin()) with check (public.is_admin());
create policy admin_guidance_admin_all on public.admin_guidance for all using (public.is_admin()) with check (public.is_admin());
create policy content_patch_read_active on public.content_patch for select using (active or public.is_admin());
create policy content_patch_admin_insert on public.content_patch for insert with check (public.is_admin());
create policy content_patch_admin_update on public.content_patch for update using (public.is_admin()) with check (public.is_admin());

create index if not exists ai_job_created_idx on public.ai_job (created_at desc);
create index if not exists content_patch_lesson_idx on public.content_patch (lesson_id, created_at);
