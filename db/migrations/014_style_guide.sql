-- 014: the editors' style guide builds itself.
--   admin_guidance.kind — where an observation came from: 'context' (✎ Context field), 'note' / 'sanifu'
--                         (💡 Note tab), 'rule' (older hand-written team rules)
--   style_guide         — the condensed guide Claude rewrites in the background from all active
--                         observations (api/style-guide.ts); every AI edit reads the latest one.
alter table public.admin_guidance add column if not exists kind text not null default 'rule';
create table if not exists public.style_guide (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.account(id) on delete set null,
  text text not null check (char_length(text) between 1 and 20000),
  entries int not null default 0
);
alter table public.style_guide enable row level security;
create policy style_guide_admin_all on public.style_guide for all using (public.is_admin()) with check (public.is_admin());
create index if not exists style_guide_created_idx on public.style_guide (created_at desc);
