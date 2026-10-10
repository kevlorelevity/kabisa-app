-- 016: after an AI rewrite of a conversation, its key vocabulary (flashcards) and practice are
-- reviewed to match (api/ai-sync.ts, src/lib/aiSync.ts).
--   content_patch.scope 'vocabulary' — replaces a lesson's key vocabulary
--   ai_job.scope 'sync'              — the background review job
alter table public.content_patch drop constraint if exists content_patch_scope_check;
alter table public.content_patch add constraint content_patch_scope_check
  check (scope in ('item', 'dialogue', 'practice', 'fields', 'word', 'vocabulary'));
alter table public.ai_job drop constraint if exists ai_job_scope_check;
alter table public.ai_job add constraint ai_job_scope_check
  check (scope in ('item', 'dialogue', 'practice', 'followup', 'lesson', 'sync'));
