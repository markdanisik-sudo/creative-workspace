-- The project's phase follows its checklist: a phase is done when every item
-- in it is ticked (its tasks, and for production also every shot), and the
-- project moves to the first phase that isn't done yet.

create or replace function private.phase_complete(target uuid, phase_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with items as (
    select t.done from public.project_tasks t
    where t.project_id = target and t.phase = phase_name
    union all
    select s.done from public.shots s
    where s.project_id = target and phase_name = 'production'
  )
  select count(*) > 0 and coalesce(bool_and(done), false) from items;
$$;

create or replace function private.sync_project_phase(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  phase_name text;
  next_phase text := 'delivery';
begin
  foreach phase_name in array
    array['brief', 'preproduction', 'production', 'postproduction', 'delivery']
  loop
    if not private.phase_complete(target, phase_name) then
      next_phase := phase_name;
      exit;
    end if;
  end loop;

  update public.projects
  set phase = next_phase
  where id = target and phase is distinct from next_phase;
end;
$$;

create or replace function private.sync_phase_from_items()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.sync_project_phase(old.project_id);
    return old;
  end if;
  perform private.sync_project_phase(new.project_id);
  if tg_op = 'UPDATE' and old.project_id is distinct from new.project_id then
    perform private.sync_project_phase(old.project_id);
  end if;
  return new;
end;
$$;

create trigger project_tasks_sync_phase
  after insert or update of done, phase, project_id or delete on public.project_tasks
  for each row execute function private.sync_phase_from_items();

create trigger shots_sync_phase
  after insert or update of done, project_id or delete on public.shots
  for each row execute function private.sync_phase_from_items();

-- Existing projects without a checklist get the studio's standard steps.
insert into public.project_tasks (project_id, phase, title, position, created_by)
select p.id, steps.phase, steps.title, steps.position, p.owner_id
from public.projects p
cross join (values
  ('brief', 'Brief potvrzen', 1),
  ('preproduction', 'Moodboard schválen', 1),
  ('preproduction', 'Shot list hotový', 2),
  ('preproduction', 'Lokace potvrzené', 3),
  ('preproduction', 'Štáb a technika zajištěné', 4),
  ('production', 'Data zálohována', 1),
  ('postproduction', 'Hrubý střih', 1),
  ('postproduction', 'Color grading', 2),
  ('postproduction', 'Zvuk a hudba', 3),
  ('postproduction', 'Finální verze schválena', 4),
  ('delivery', 'Exporty předány klientovi', 1)
) as steps (phase, title, position)
where not exists (select 1 from public.project_tasks t where t.project_id = p.id);

select private.sync_project_phase(id) from public.projects;
