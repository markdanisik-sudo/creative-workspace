-- Personal projects: a project is either for a client (quote, invoices,
-- add-ons) or the owner's own; a personal project's budget is the list of
-- what the shoot needs, rentals included, priced from a rental catalog.

alter table public.projects
  add column kind text not null default 'client' check (kind in ('client', 'personal'));

-- ---------------------------------------------------------------------------
-- What a shoot needs: gear to rent, and other costs (travel, catering…)
-- ---------------------------------------------------------------------------

create table public.production_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null default 'cost' check (kind in ('rental', 'cost')),
  name text not null check (char_length(name) between 1 and 200),
  supplier text check (char_length(supplier) <= 100),
  category text check (char_length(category) <= 100),
  quantity numeric(10, 2) not null default 1 check (quantity > 0 and quantity <= 9999),
  -- Rental days; 1 for one-off costs.
  days numeric(6, 2) not null default 1 check (days > 0 and days <= 365),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0 and unit_price <= 99999999),
  done boolean not null default false,
  position double precision not null default 0,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index production_items_project_idx on public.production_items (project_id, kind, position);

create trigger production_items_set_updated_at
  before update on public.production_items
  for each row execute function private.set_updated_at();

alter table public.production_items enable row level security;

create policy "Members read the production list"
  on public.production_items for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "Members add to the production list"
  on public.production_items for insert to authenticated
  with check (project_id in (select private.accessible_project_ids()));

create policy "Members update the production list"
  on public.production_items for update to authenticated
  using (project_id in (select private.accessible_project_ids()))
  with check (project_id in (select private.accessible_project_ids()));

create policy "Authors and project owners remove from the production list"
  on public.production_items for delete to authenticated
  using (
    project_id in (select private.accessible_project_ids())
    and (created_by = (select auth.uid()) or project_id in (select private.owned_project_ids()))
  );

-- ---------------------------------------------------------------------------
-- Rental catalog: each account keeps its own price list (e.g. Biofilms)
-- ---------------------------------------------------------------------------

create table public.rental_catalog (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  supplier text not null default 'Biofilms' check (char_length(supplier) between 1 and 100),
  category text check (char_length(category) <= 100),
  name text not null check (char_length(name) between 1 and 200),
  price_per_day numeric(12, 2) not null check (price_per_day >= 0 and price_per_day <= 99999999),
  created_at timestamptz not null default now()
);

create index rental_catalog_owner_idx on public.rental_catalog (owner_id, supplier, category, name);

alter table public.rental_catalog enable row level security;

create policy "Owners manage their rental catalog"
  on public.rental_catalog for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
