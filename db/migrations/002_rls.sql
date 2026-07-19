-- ============================================================================
-- Migration 002 — Row-Level Security
--
-- V1 policy summary
--   - Corpus tables (module, vocab_entry, module_vocab, exchange_line,
--     exercise, grammar_lesson) are READABLE by anyone (anon + authenticated).
--   - User-state tables (account, profile, module_progress, srs_card,
--     lesson_progress) are READ + WRITE only by the owning account.
--   - edit_log is READABLE only by admins; writes happen through service-role
--     RPCs called from the admin tools, not via direct row inserts.
--   - Admin writes on corpus tables go through service-role-authenticated
--     RPCs (added later in M2). For V1, only the seed script (service role)
--     mutates corpus rows.
--
-- We rely on Supabase's built-in auth.uid() which returns the JWT subject
-- (the account.id). The account row is created on first sign-in by an
-- auth-trigger added separately in M1 (A2).
-- ============================================================================

-- Helper: is the current authed user an admin?
create or replace function public.is_admin() returns boolean
  language sql stable
  as $$
    select exists (
      select 1 from public.account a
      where a.id = auth.uid() and a.role = 'admin'
    );
  $$;

-- ----------------------------------------------------------------------------
-- Corpus tables — public read, no client writes
-- ----------------------------------------------------------------------------

alter table module          enable row level security;
alter table vocab_entry     enable row level security;
alter table module_vocab    enable row level security;
alter table exchange_line   enable row level security;
alter table exercise        enable row level security;
alter table grammar_lesson  enable row level security;

create policy module_read           on module          for select using (true);
create policy vocab_entry_read      on vocab_entry     for select using (true);
create policy module_vocab_read     on module_vocab    for select using (true);
create policy exchange_line_read    on exchange_line   for select using (true);
create policy exercise_read         on exercise        for select using (true);
create policy grammar_lesson_read   on grammar_lesson  for select using (true);

-- Admin writes on corpus tables (via service role typically, but also OK
-- via an authed admin user). No anon writes ever.
create policy module_admin_write          on module          for all using (public.is_admin()) with check (public.is_admin());
create policy vocab_entry_admin_write     on vocab_entry     for all using (public.is_admin()) with check (public.is_admin());
create policy module_vocab_admin_write    on module_vocab    for all using (public.is_admin()) with check (public.is_admin());
create policy exchange_line_admin_write   on exchange_line   for all using (public.is_admin()) with check (public.is_admin());
create policy exercise_admin_write        on exercise        for all using (public.is_admin()) with check (public.is_admin());
create policy grammar_lesson_admin_write  on grammar_lesson  for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Account + Profile — owner read/update; signup insert via auth trigger
-- ----------------------------------------------------------------------------

alter table account enable row level security;
alter table profile enable row level security;

create policy account_select_own  on account  for select using (id          = auth.uid());
create policy account_update_own  on account  for update using (id          = auth.uid()) with check (id = auth.uid());
create policy account_admin_all   on account  for all    using (public.is_admin()) with check (public.is_admin());

create policy profile_select_own  on profile  for select using (account_id  = auth.uid());
create policy profile_update_own  on profile  for update using (account_id  = auth.uid()) with check (account_id = auth.uid());
create policy profile_insert_own  on profile  for insert with check (account_id = auth.uid());
create policy profile_admin_all   on profile  for all    using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Progress tables — owner only
-- ----------------------------------------------------------------------------

alter table module_progress enable row level security;
alter table srs_card        enable row level security;
alter table lesson_progress enable row level security;

create policy module_progress_owner  on module_progress for all using (account_id = auth.uid()) with check (account_id = auth.uid());
create policy srs_card_owner         on srs_card        for all using (account_id = auth.uid()) with check (account_id = auth.uid());
create policy lesson_progress_owner  on lesson_progress for all using (account_id = auth.uid()) with check (account_id = auth.uid());

-- Admin override for support / debugging.
create policy module_progress_admin  on module_progress for select using (public.is_admin());
create policy srs_card_admin         on srs_card        for select using (public.is_admin());
create policy lesson_progress_admin  on lesson_progress for select using (public.is_admin());

-- ----------------------------------------------------------------------------
-- Edit log — admin read only; writes via service role
-- ----------------------------------------------------------------------------

alter table edit_log enable row level security;

create policy edit_log_admin_read on edit_log for select using (public.is_admin());
-- No client write policy — edit_log is appended via service-role RPCs only.
