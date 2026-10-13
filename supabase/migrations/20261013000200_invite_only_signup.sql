-- Lets the sign-up page know whether the studio already exists. After the
-- first (studio) account, new accounts come only through invitations.
create or replace function public.studio_is_set_up()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.studio_members);
$$;

grant execute on function public.studio_is_set_up() to anon, authenticated;
