-- Personal workspaces: anyone can sign up, and every account is the studio of
-- its own projects. Nobody sees anyone else's projects unless invited.
--
-- Access model after this migration:
--   * a project's owner runs it (what "the studio" did before, per project);
--   * invited people (project_members) collaborate as clients, as before;
--   * billing details and the service catalog belong to each account;
--   * there is no workspace-wide studio any more: studio_members only marks
--     who ran the single shared studio before, for the move below.

-- ---------------------------------------------------------------------------
-- Existing data: projects clients started for the studio move to the studio
-- (the client stays on as a member), so the studio keeps them.
-- ---------------------------------------------------------------------------

with studio as (
  select user_id from public.studio_members order by created_at limit 1
),
moved as (
  update public.projects p
  set owner_id = (select user_id from studio)
  where exists (select 1 from studio)
    and not exists (select 1 from public.studio_members s where s.user_id = p.owner_id)
  returning p.id, p.owner_id
)
select count(*) from moved;

-- Clients were already members of the projects they started; the studio
-- owner is never a member of their own project.
delete from public.project_members m
using public.projects p
where p.id = m.project_id and m.user_id = p.owner_id;

-- ---------------------------------------------------------------------------
-- Who runs a project
-- ---------------------------------------------------------------------------

create or replace function private.accessible_project_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.projects p where p.owner_id = auth.uid()
  union
  select m.project_id from public.project_members m where m.user_id = auth.uid();
$$;

-- "Is the current user running this project?" (its owner).
create or replace function private.runs_project(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.projects p where p.id = target and p.owner_id = auth.uid());
$$;

grant execute on function private.runs_project(uuid) to authenticated;

-- For the app: the same question.
create or replace function public.runs_project(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.runs_project(target);
$$;

revoke execute on function public.runs_project(uuid) from public, anon;
grant execute on function public.runs_project(uuid) to authenticated;

-- Everyone runs their own workspace now.
create or replace function private.is_studio_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null;
$$;

create or replace function public.current_user_is_studio()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null;
$$;

-- Sign-up is open to everyone.
create or replace function public.studio_is_set_up()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select false;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  );
  return new;
end;
$$;

-- The owner runs the project; they are not one of its members.
drop trigger if exists projects_add_owner_as_member on public.projects;
drop function if exists private.add_owner_as_member();

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

drop policy "Members can read projects" on public.projects;
drop policy "The studio and invited clients create their own projects" on public.projects;
drop policy "The studio and project owners update projects" on public.projects;
drop policy "The studio deletes projects" on public.projects;

create policy "Owners and members read projects"
  on public.projects for select to authenticated
  using (
    owner_id = (select auth.uid())
    or id in (select private.member_project_ids())
  );

create policy "Everyone creates their own projects"
  on public.projects for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners update their projects"
  on public.projects for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owners delete their projects"
  on public.projects for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Boards
-- ---------------------------------------------------------------------------

drop policy "The studio and project owners create boards" on public.boards;
drop policy "The studio and project owners update boards" on public.boards;
drop policy "The studio and project owners delete boards" on public.boards;

create policy "Project owners create boards"
  on public.boards for insert to authenticated
  with check (project_id in (select private.owned_project_ids()));

create policy "Project owners update boards"
  on public.boards for update to authenticated
  using (project_id in (select private.owned_project_ids()))
  with check (project_id in (select private.owned_project_ids()));

create policy "Project owners delete boards"
  on public.boards for delete to authenticated
  using (project_id in (select private.owned_project_ids()));

-- ---------------------------------------------------------------------------
-- Members and invitations
-- ---------------------------------------------------------------------------

drop policy "The studio adds project members" on public.project_members;
drop policy "The studio removes project members" on public.project_members;

create policy "Project owners add members"
  on public.project_members for insert to authenticated
  with check (project_id in (select private.owned_project_ids()));

create policy "Project owners remove members"
  on public.project_members for delete to authenticated
  using (project_id in (select private.owned_project_ids()));

drop policy "The studio manages invitations" on public.project_invitations;

create policy "Project owners manage invitations"
  on public.project_invitations for all to authenticated
  using (project_id in (select private.owned_project_ids()))
  with check (
    project_id in (select private.owned_project_ids())
    and invited_by = (select auth.uid())
  );

-- Names of people you share a project with: its owner and its members.
drop policy "Users can read profiles of people they work with" on public.profiles;

create policy "Users can read profiles of people they work with"
  on public.profiles for select to authenticated
  using (
    id in (
      select p.owner_id from public.projects p
      where p.id in (select private.accessible_project_ids())
    )
    or id in (
      select m.user_id from public.project_members m
      where m.project_id in (select private.accessible_project_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- Project content the owner manages
-- ---------------------------------------------------------------------------

drop policy "The studio adds budget lines" on public.budget_items;
drop policy "The studio edits budget lines" on public.budget_items;
drop policy "The studio removes budget lines" on public.budget_items;

create policy "Project owners add budget lines"
  on public.budget_items for insert to authenticated
  with check (
    project_id in (select private.owned_project_ids())
    and (select private.second_factor_ok())
  );

create policy "Project owners edit budget lines"
  on public.budget_items for update to authenticated
  using (project_id in (select private.owned_project_ids()) and (select private.second_factor_ok()))
  with check (project_id in (select private.owned_project_ids()) and (select private.second_factor_ok()));

create policy "Project owners remove budget lines"
  on public.budget_items for delete to authenticated
  using (project_id in (select private.owned_project_ids()) and (select private.second_factor_ok()));

drop policy "The studio deletes invoices" on public.invoices;
drop policy "The studio marks invoices paid" on public.invoices;

create policy "Project owners delete invoices"
  on public.invoices for delete to authenticated
  using (project_id in (select private.owned_project_ids()) and (select private.second_factor_ok()));

create policy "Project owners mark invoices paid"
  on public.invoices for update to authenticated
  using (project_id in (select private.owned_project_ids()) and (select private.second_factor_ok()))
  with check (project_id in (select private.owned_project_ids()) and (select private.second_factor_ok()));

drop policy "The studio manages dates" on public.project_events;

create policy "Project owners manage dates"
  on public.project_events for all to authenticated
  using (project_id in (select private.owned_project_ids()))
  with check (project_id in (select private.owned_project_ids()));

drop policy "The studio adds links" on public.project_links;
drop policy "The studio removes links" on public.project_links;

create policy "Project owners add links"
  on public.project_links for insert to authenticated
  with check (project_id in (select private.owned_project_ids()));

create policy "Project owners remove links"
  on public.project_links for delete to authenticated
  using (project_id in (select private.owned_project_ids()));

drop policy "Requesters can withdraw open requests" on public.project_requests;
drop policy "The studio decides on requests" on public.project_requests;

create policy "Requesters can withdraw open requests"
  on public.project_requests for delete to authenticated
  using (
    (requested_by = (select auth.uid()) and status = 'requested')
    or project_id in (select private.owned_project_ids())
  );

create policy "Project owners decide on requests"
  on public.project_requests for update to authenticated
  using (project_id in (select private.owned_project_ids()))
  with check (project_id in (select private.owned_project_ids()));

-- ---------------------------------------------------------------------------
-- Shared content: its author, or the project's owner, may remove it
-- ---------------------------------------------------------------------------

drop policy "Authors and the studio can delete comments" on public.comments;
create policy "Authors and project owners can delete comments"
  on public.comments for delete to authenticated
  using (
    author_id = (select auth.uid())
    or project_id in (select private.owned_project_ids())
  );

drop policy "Uploaders and the studio can delete files" on public.files;
create policy "Uploaders and project owners can delete files"
  on public.files for delete to authenticated
  using (
    project_id in (select private.accessible_project_ids())
    and (owner_id = (select auth.uid()) or project_id in (select private.owned_project_ids()))
  );

drop policy "Authors and the studio can delete plan items" on public.plan_items;
create policy "Authors and project owners can delete plan items"
  on public.plan_items for delete to authenticated
  using (
    project_id in (select private.accessible_project_ids())
    and (created_by = (select auth.uid()) or project_id in (select private.owned_project_ids()))
  );

drop policy "Uploaders and the studio can remove images" on public.project_images;
create policy "Uploaders and project owners can remove images"
  on public.project_images for delete to authenticated
  using (
    project_id in (select private.accessible_project_ids())
    and (uploaded_by = (select auth.uid()) or project_id in (select private.owned_project_ids()))
  );

drop policy "Authors and the studio can delete locations" on public.project_locations;
create policy "Authors and project owners can delete locations"
  on public.project_locations for delete to authenticated
  using (
    project_id in (select private.accessible_project_ids())
    and (created_by = (select auth.uid()) or project_id in (select private.owned_project_ids()))
  );

drop policy "Authors and the studio can delete tasks" on public.project_tasks;
create policy "Authors and project owners can delete tasks"
  on public.project_tasks for delete to authenticated
  using (
    project_id in (select private.accessible_project_ids())
    and (created_by = (select auth.uid()) or project_id in (select private.owned_project_ids()))
  );

drop policy "Uploaders and the studio can delete assets" on storage.objects;
create policy "Uploaders and project owners can delete assets"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'assets'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (storage.foldername(name))[2] in (select id::text from private.owned_project_ids() id)
    )
  );

-- Resolving a discussion note: its author or the project's owner.
create or replace function public.set_comment_resolved(comment_id uuid, resolved boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.comments;
begin
  select * into found from public.comments where id = comment_id;
  if found.id is null
    or found.project_id not in (select private.accessible_project_ids())
    or not (found.author_id = auth.uid() or private.runs_project(found.project_id))
  then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.comments
  set resolved_at = case when resolved then now() end,
      resolved_by = case when resolved then auth.uid() end
  where id = comment_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Service catalog: each account has its own
-- ---------------------------------------------------------------------------

alter table public.services
  add column owner_id uuid references auth.users (id) on delete cascade;

update public.services
set owner_id = (select user_id from public.studio_members order by created_at limit 1);

delete from public.services where owner_id is null;

alter table public.services
  alter column owner_id set not null,
  alter column owner_id set default auth.uid();

create index services_owner_idx on public.services (owner_id);

drop policy "Signed-in users can read the service catalog" on public.services;
drop policy "The studio manages the service catalog" on public.services;

-- Your own catalog, and the catalogs of the people whose projects you're in
-- (to ask for add-ons).
create policy "Owners and their clients read the service catalog"
  on public.services for select to authenticated
  using (
    owner_id = (select auth.uid())
    or owner_id in (
      select p.owner_id from public.projects p
      where p.id in (select private.member_project_ids())
    )
  );

create policy "Owners manage their service catalog"
  on public.services for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Billing details (invoice supplier): each account has its own
-- ---------------------------------------------------------------------------

alter table public.studio_billing
  add column owner_id uuid references auth.users (id) on delete cascade;

update public.studio_billing
set owner_id = (select user_id from public.studio_members order by created_at limit 1);

delete from public.studio_billing where owner_id is null;

alter table public.studio_billing drop constraint studio_billing_pkey;
alter table public.studio_billing drop constraint studio_billing_id_check;
alter table public.studio_billing drop column id;
alter table public.studio_billing
  alter column owner_id set not null,
  alter column owner_id set default auth.uid(),
  add primary key (owner_id);

drop policy "The studio and its clients read the studio's billing details" on public.studio_billing;
drop policy "The studio edits its billing details" on public.studio_billing;

-- Your own, and those of the people whose projects you're in (shown on
-- invoices).
create policy "Owners and their clients read billing details"
  on public.studio_billing for select to authenticated
  using (
    owner_id = (select auth.uid())
    or owner_id in (
      select p.owner_id from public.projects p
      where p.id in (select private.member_project_ids())
    )
  );

create policy "Owners add their billing details"
  on public.studio_billing for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select private.second_factor_ok()));

create policy "Owners edit their billing details"
  on public.studio_billing for update to authenticated
  using (owner_id = (select auth.uid()) and (select private.second_factor_ok()))
  with check (owner_id = (select auth.uid()) and (select private.second_factor_ok()));

-- Invoices: issued by the project's owner, from their billing details and
-- their own numbering.
create or replace function public.create_invoice(target uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  billing public.studio_billing;
  budget public.project_budgets;
  supplier uuid;
  line_items jsonb;
  amount numeric(12, 2);
  rate numeric(5, 2);
  tax numeric(12, 2);
  existing uuid;
  year integer := extract(year from current_date)::integer;
  sequence integer;
  invoice_number text;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  if target not in (select private.accessible_project_ids()) then
    raise exception 'project_not_found' using errcode = 'P0002';
  end if;

  select p.owner_id into supplier from public.projects p where p.id = target;

  select * into budget from public.project_budgets where project_id = target;
  if budget.project_id is null or coalesce(trim(budget.client_billing ->> 'name'), '') = '' then
    raise exception 'customer_missing' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(item order by sort_key), '[]'::jsonb), coalesce(sum((item ->> 'quantity')::numeric * (item ->> 'unit_price')::numeric), 0)
  into line_items, amount
  from (
    select jsonb_build_object('title', b.title, 'quantity', b.quantity, 'unit', b.unit, 'unit_price', b.unit_price) as item,
           (0, b.position, b.created_at)::text as sort_key
    from public.budget_items b where b.project_id = target
    union all
    select jsonb_build_object('title', r.title, 'quantity', r.quantity, 'unit', r.unit, 'unit_price', r.unit_price),
           (1, extract(epoch from r.created_at), r.created_at)::text
    from public.project_requests r
    where r.project_id = target and r.status in ('approved', 'done') and r.unit_price is not null
  ) lines;

  if jsonb_array_length(line_items) = 0 then
    raise exception 'empty_budget' using errcode = '22023';
  end if;

  select * into billing from public.studio_billing where owner_id = supplier for update;
  if coalesce(trim(billing.name), '') = '' then
    raise exception 'supplier_missing' using errcode = '22023';
  end if;

  rate := case when billing.vat_payer then billing.vat_rate else 0 end;
  tax := round(amount * rate / 100, 2);

  select i.id into existing
  from public.invoices i
  where i.project_id = target and i.paid_at is null
    and i.items = line_items and i.total = amount + tax
    and i.customer = budget.client_billing
  order by i.created_at desc
  limit 1;
  if existing is not null then
    return existing;
  end if;

  sequence := case when billing.invoice_year = year then billing.invoice_seq + 1 else 1 end;
  update public.studio_billing set invoice_year = year, invoice_seq = sequence where owner_id = supplier;
  invoice_number := year::text || lpad(sequence::text, 3, '0');

  insert into public.invoices (
    project_id, number, variable_symbol, due_on, currency, supplier, customer,
    items, subtotal, vat_rate, vat, total
  ) values (
    target, invoice_number, invoice_number, current_date + billing.due_days, budget.currency,
    jsonb_build_object(
      'name', billing.name, 'address', billing.address, 'ico', billing.ico,
      'dic', billing.dic, 'iban', billing.iban, 'bank_account', billing.bank_account,
      'email', billing.email, 'phone', billing.phone, 'vat_payer', billing.vat_payer,
      'note', billing.invoice_note
    ),
    budget.client_billing, line_items, amount, rate, tax, amount + tax
  )
  returning id into new_id;

  return new_id;
end;
$$;
