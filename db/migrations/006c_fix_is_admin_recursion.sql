-- ============================================================================
-- 006c: is_admin() looped forever ("stack depth limit exceeded") because it
-- reads public.account, whose own admin policy calls is_admin() again. Any
-- admin-only write (content suggestions) failed. Make it SECURITY DEFINER so
-- its lookup bypasses RLS — the standard Supabase pattern.
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.account a
    where a.id = auth.uid() and a.role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
