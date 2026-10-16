-- Budget, invoices and delivery links.

-- ---------------------------------------------------------------------------
-- The studio's billing details (one row), shown on invoices and QR payments
-- ---------------------------------------------------------------------------

create table public.studio_billing (
  id boolean primary key default true check (id),
  name text not null default '' check (char_length(name) <= 200),
  address text check (char_length(address) <= 500),
  ico text check (char_length(ico) <= 20),
  dic text check (char_length(dic) <= 20),
  iban text check (char_length(iban) <= 40),
  bank_account text check (char_length(bank_account) <= 40),
  email text check (char_length(email) <= 200),
  phone text check (char_length(phone) <= 50),
  vat_payer boolean not null default false,
  vat_rate numeric(5, 2) not null default 21 check (vat_rate between 0 and 100),
  due_days integer not null default 14 check (due_days between 0 and 365),
  invoice_note text check (char_length(invoice_note) <= 1000),
  invoice_year integer,
  invoice_seq integer not null default 0,
  updated_at timestamptz not null default now()
);

create trigger studio_billing_set_updated_at
  before update on public.studio_billing
  for each row execute function private.set_updated_at();

insert into public.studio_billing (id) values (true);

alter table public.studio_billing enable row level security;

-- Clients see the supplier on their invoice.
create policy "Signed-in users can read the studio's billing details"
  on public.studio_billing for select to authenticated
  using (true);

create policy "The studio edits its billing details"
  on public.studio_billing for update to authenticated
  using ((select private.is_studio_member()))
  with check ((select private.is_studio_member()));

-- ---------------------------------------------------------------------------
-- Per-project budget: the client's billing details and their approval
-- ---------------------------------------------------------------------------

create table public.project_budgets (
  project_id uuid primary key references public.projects (id) on delete cascade,
  currency text not null default 'CZK' check (currency ~ '^[A-Z]{3}$'),
  -- { name, address, ico, dic, email }
  client_billing jsonb not null default '{}'::jsonb
    check (octet_length(client_billing::text) <= 5000),
  approved_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger project_budgets_set_updated_at
  before update on public.project_budgets
  for each row execute function private.set_updated_at();

alter table public.project_budgets enable row level security;

create policy "Members can read the budget"
  on public.project_budgets for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "Members can start the budget"
  on public.project_budgets for insert to authenticated
  with check (project_id in (select private.accessible_project_ids()));

create policy "Members can fill in billing details and approve"
  on public.project_budgets for update to authenticated
  using (project_id in (select private.accessible_project_ids()))
  with check (project_id in (select private.accessible_project_ids()));

-- ---------------------------------------------------------------------------
-- Budget lines (the quote), set by the studio
-- ---------------------------------------------------------------------------

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit text check (char_length(unit) <= 20),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index budget_items_project_idx on public.budget_items (project_id, position);

create trigger budget_items_set_updated_at
  before update on public.budget_items
  for each row execute function private.set_updated_at();

alter table public.budget_items enable row level security;

create policy "Members can read budget lines"
  on public.budget_items for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "The studio adds budget lines"
  on public.budget_items for insert to authenticated
  with check (
    (select private.is_studio_member())
    and project_id in (select private.accessible_project_ids())
  );

create policy "The studio edits budget lines"
  on public.budget_items for update to authenticated
  using ((select private.is_studio_member()))
  with check ((select private.is_studio_member()));

create policy "The studio removes budget lines"
  on public.budget_items for delete to authenticated
  using ((select private.is_studio_member()));

-- ---------------------------------------------------------------------------
-- Invoices: snapshots, created only through create_invoice()
-- ---------------------------------------------------------------------------

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  number text not null unique,
  variable_symbol text not null,
  issued_on date not null default current_date,
  due_on date not null,
  currency text not null,
  supplier jsonb not null,
  customer jsonb not null,
  -- [{ title, quantity, unit, unit_price }]
  items jsonb not null,
  subtotal numeric(12, 2) not null,
  vat_rate numeric(5, 2) not null,
  vat numeric(12, 2) not null,
  total numeric(12, 2) not null,
  paid_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index invoices_project_idx on public.invoices (project_id, created_at desc);

alter table public.invoices enable row level security;

create policy "Members can read invoices"
  on public.invoices for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "The studio marks invoices paid"
  on public.invoices for update to authenticated
  using ((select private.is_studio_member()))
  with check ((select private.is_studio_member()));

create policy "The studio deletes invoices"
  on public.invoices for delete to authenticated
  using ((select private.is_studio_member()));

/**
 * Issues an invoice for the project's current budget: the studio's lines plus
 * approved add-ons with a price. Anyone on the project may call it (the client
 * downloads their invoice); an unchanged unpaid invoice is reused rather than
 * numbered again.
 */
create or replace function public.create_invoice(target uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  billing public.studio_billing;
  budget public.project_budgets;
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

  select * into billing from public.studio_billing where id for update;
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
  update public.studio_billing set invoice_year = year, invoice_seq = sequence where id;
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

revoke execute on function public.create_invoice(uuid) from public, anon;
grant execute on function public.create_invoice(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Links: where the finished work can be downloaded (e.g. Frame.io)
-- ---------------------------------------------------------------------------

create table public.project_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null default 'delivery' check (kind in ('delivery')),
  label text check (char_length(label) <= 200),
  url text not null check (url ~* '^https?://' and char_length(url) <= 2000),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index project_links_project_idx on public.project_links (project_id, created_at);

alter table public.project_links enable row level security;

create policy "Members can see links"
  on public.project_links for select to authenticated
  using (project_id in (select private.accessible_project_ids()));

create policy "The studio adds links"
  on public.project_links for insert to authenticated
  with check (
    (select private.is_studio_member())
    and project_id in (select private.accessible_project_ids())
  );

create policy "The studio removes links"
  on public.project_links for delete to authenticated
  using ((select private.is_studio_member()));
