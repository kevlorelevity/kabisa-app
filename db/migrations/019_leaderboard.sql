-- 019: per-level leaderboard for learners.
-- Learners can't read each other's learner_progress rows (RLS), so this
-- SECURITY DEFINER function returns only what the leaderboard shows: first
-- name, country code and XP, for the top 10 of the caller's current level
-- plus the caller's own row. Admin accounts are left out of other people's
-- boards (they only appear on their own).

create or replace function public.level_leaderboard(p_level int default null)
returns table (lb_rank int, lb_level int, first_name text, nationality text, xp int, is_me boolean)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select coalesce(p_level, (select lp.level from learner_progress lp where lp.account_id = auth.uid()), 1) as level
  ),
  players as (
    select
      lp.account_id,
      lp.xp,
      lp.updated_at,
      coalesce(
        nullif(split_part(trim(p.display_name), ' ', 1), ''),
        nullif(split_part(trim(a.first_name), ' ', 1), ''),
        'Learner'
      ) as first_name,
      p.nationality
    from learner_progress lp
    join account a on a.id = lp.account_id
    left join profile p on p.account_id = lp.account_id
    where lp.level = (select level from me)
      and (a.role <> 'admin' or a.id = auth.uid())
  ),
  ranked as (
    select row_number() over (order by xp desc, updated_at asc, account_id)::int as lb_rank, players.*
    from players
  )
  select r.lb_rank, (select level from me), r.first_name, r.nationality, r.xp, r.account_id = auth.uid()
  from ranked r
  where auth.uid() is not null and (r.lb_rank <= 10 or r.account_id = auth.uid())
  order by r.lb_rank;
$$;

revoke all on function public.level_leaderboard(int) from public, anon;
grant execute on function public.level_leaderboard(int) to authenticated;
