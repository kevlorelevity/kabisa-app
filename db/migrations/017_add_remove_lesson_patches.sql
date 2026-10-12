-- 017: admins add / delete practice lines and set a dialogue's speaker names & voices.
--   content_patch.scope 'add'    — appends an item (value = the practice item / flashcard)
--   content_patch.scope 'remove' — deletes the item with item_id
--   content_patch.scope 'lesson' — lesson settings: { rename: { from, to }, voices: { name: 'female' | 'male' } }
alter table public.content_patch drop constraint if exists content_patch_scope_check;
alter table public.content_patch add constraint content_patch_scope_check
  check (scope in ('item', 'dialogue', 'practice', 'fields', 'word', 'vocabulary', 'add', 'remove', 'lesson'));
