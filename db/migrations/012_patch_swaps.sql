-- 012: word swaps an AI edit made ("hadi" → "mpaka"), applied to every lesson when the patch loads.
alter table public.content_patch add column if not exists swaps jsonb;
