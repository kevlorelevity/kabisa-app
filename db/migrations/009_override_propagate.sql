-- 009: an admin's Swahili wording fix also applies across every lesson
-- (src/lib/contentOverrides.ts). Rows made before this existed stay local.
alter table public.content_override add column if not exists propagate boolean not null default true;
update public.content_override set propagate = false where created_at < now();
