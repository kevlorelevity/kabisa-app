-- 013: context-aware follow-up after admin edits (api/ai-followup.ts, src/lib/aiFollowup.ts).
--   ai_job.scope 'followup'  — check every other place an edited wording appears, by meaning
--   ai_job.status 'review'   — the AI wasn't sure about some places; ai_job.questions holds them
--   ai_job.pending_swaps     — word swaps an ✨ AI edit made, waiting to be checked app-wide
alter table public.ai_job drop constraint if exists ai_job_scope_check;
alter table public.ai_job add constraint ai_job_scope_check check (scope in ('item', 'dialogue', 'practice', 'followup'));
alter table public.ai_job drop constraint if exists ai_job_status_check;
alter table public.ai_job add constraint ai_job_status_check check (status in ('working', 'live', 'failed', 'undone', 'review'));
alter table public.ai_job add column if not exists questions jsonb;
alter table public.ai_job add column if not exists pending_swaps jsonb;
create index if not exists content_patch_job_idx on public.content_patch (job_id);
