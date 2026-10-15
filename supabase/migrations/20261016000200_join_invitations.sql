-- "Join a project": a signed-in person sees the open invitations sent to
-- their email address and picks which project to join.

create or replace function public.my_invitations()
returns table (id uuid, project_name text, invited_by_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, p.name, coalesce(pr.display_name, 'm.studio'), i.created_at
  from public.project_invitations i
  join public.projects p on p.id = i.project_id
  left join public.profiles pr on pr.id = i.invited_by
  where i.email = (select lower(u.email) from auth.users u where u.id = auth.uid())
    and i.accepted_at is null
    and i.expires_at >= now()
    and not exists (
      select 1 from public.project_members m
      where m.project_id = i.project_id and m.user_id = auth.uid()
    )
  order by i.created_at desc;
$$;

revoke execute on function public.my_invitations() from public, anon;
grant execute on function public.my_invitations() to authenticated;

-- Same checks as accept_invitation, but by id: only the invited address can use it.
create or replace function public.accept_invitation_by_id(invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.project_invitations;
  account_email text;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;

  select * into invitation
  from public.project_invitations
  where id = invitation_id
  for update;

  select lower(u.email) into account_email from auth.users u where u.id = auth.uid();

  -- An invitation for someone else looks the same as a missing one.
  if invitation.id is null or invitation.email <> account_email then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;

  if invitation.accepted_at is null then
    if invitation.expires_at < now() then
      raise exception 'invitation_expired' using errcode = '22023';
    end if;
    update public.project_invitations
    set accepted_at = now(), accepted_by = auth.uid()
    where id = invitation.id;
  elsif invitation.accepted_by is distinct from auth.uid() then
    raise exception 'invitation_already_used' using errcode = '42501';
  end if;

  insert into public.project_members (project_id, user_id, role, added_by)
  values (invitation.project_id, auth.uid(), 'client', invitation.invited_by)
  on conflict do nothing;

  return invitation.project_id;
end;
$$;

revoke execute on function public.accept_invitation_by_id(uuid) from public, anon;
grant execute on function public.accept_invitation_by_id(uuid) to authenticated;
