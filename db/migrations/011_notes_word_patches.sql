-- 011: learner notes + word-level edits.
--   content_patch.scope 'fields' — merge fields (note, sanifu…) into one turn / practice item / flashcard
--   content_patch.scope 'word'   — change one glossed word (gloss, sanifu, note), optionally everywhere it appears
alter table public.content_patch drop constraint if exists content_patch_scope_check;
alter table public.content_patch add constraint content_patch_scope_check
  check (scope in ('item', 'dialogue', 'practice', 'fields', 'word'));
