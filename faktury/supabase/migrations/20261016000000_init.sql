-- Faktury: invoicing for one business per account.
--
-- Every row belongs to the account that created it (owner_id) and row-level
-- security lets an account reach only its own rows. Once two-factor
-- authentication is on, every write needs a session that entered the code.

create schema if not exists private;

create or replace function private.second_factor_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    or not exists (
      select 1 from auth.mfa_factors f
      where f.user_id = auth.uid() and f.status = 'verified'
    );
$$;

grant usage on schema private to authenticated;
grant execute on function private.second_factor_ok() to authenticated;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- The business issuing the invoices.
-- ---------------------------------------------------------------------------

create table public.businesses (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 200),
  street text check (char_length(street) <= 200),
  city text check (char_length(city) <= 100),
  zip text check (char_length(zip) <= 20),
  country text not null default 'CZ' check (char_length(country) = 2),
  ico text check (char_length(ico) <= 20),
  dic text check (char_length(dic) <= 20),
  registry text check (char_length(registry) <= 300),
  bank_account text check (char_length(bank_account) <= 40),
  iban text check (char_length(iban) <= 40),
  bic text check (char_length(bic) <= 20),
  email text check (char_length(email) <= 200),
  phone text check (char_length(phone) <= 50),
  web text check (char_length(web) <= 200),
  vat_payer boolean not null default false,
  due_days integer not null default 14 check (due_days between 0 and 365),
  invoice_note text check (char_length(invoice_note) <= 1000),
  updated_at timestamptz not null default now()
);

create trigger businesses_touch before update on public.businesses
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Customers.
-- ---------------------------------------------------------------------------

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  street text check (char_length(street) <= 200),
  city text check (char_length(city) <= 100),
  zip text check (char_length(zip) <= 20),
  country text not null default 'CZ' check (char_length(country) = 2),
  ico text check (char_length(ico) <= 20),
  dic text check (char_length(dic) <= 20),
  email text check (char_length(email) <= 200),
  phone text check (char_length(phone) <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_owner_idx on public.contacts (owner_id, name);
create unique index contacts_owner_ico_idx on public.contacts (owner_id, ico) where ico is not null;

create trigger contacts_touch before update on public.contacts
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Invoices: issued here or imported (ISDOC / CSV from iDoklad).
-- Parties and lines are snapshots, so an invoice never changes when a
-- contact or the business details do.
-- ---------------------------------------------------------------------------

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- invoice, or credit_note (opravný daňový doklad / dobropis; amounts negative)
  kind text not null default 'invoice' check (kind in ('invoice', 'credit_note')),
  number text not null check (char_length(number) between 1 and 50),
  variable_symbol text check (char_length(variable_symbol) <= 20),
  issued_on date not null,
  taxable_on date,
  due_on date not null,
  paid_on date,
  currency text not null default 'CZK' check (currency ~ '^[A-Z]{3}$'),
  -- CZK per one unit of the currency (1 for CZK); totals_czk use it.
  exchange_rate numeric(14, 6) not null default 1 check (exchange_rate > 0),
  contact_id uuid references public.contacts (id) on delete set null,
  supplier jsonb not null default '{}'::jsonb,
  customer jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  subtotal numeric(14, 2) not null default 0,
  vat numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  total_czk numeric(14, 2) generated always as (round(total * exchange_rate, 2)) stored,
  note text check (char_length(note) <= 2000),
  source text not null default 'app' check (source in ('app', 'isdoc', 'csv')),
  -- The ISDOC document UUID, if any: re-importing the same file is a no-op.
  external_id text check (char_length(external_id) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index invoices_owner_number_idx on public.invoices (owner_id, kind, number);
create unique index invoices_owner_external_idx on public.invoices (owner_id, external_id)
  where external_id is not null;
create index invoices_owner_issued_idx on public.invoices (owner_id, issued_on desc);

create trigger invoices_touch before update on public.invoices
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security.
-- ---------------------------------------------------------------------------

alter table public.businesses enable row level security;
alter table public.contacts enable row level security;
alter table public.invoices enable row level security;

create policy "Owners read their business"
  on public.businesses for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "Owners create their business"
  on public.businesses for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select private.second_factor_ok()));
create policy "Owners edit their business"
  on public.businesses for update to authenticated
  using (owner_id = (select auth.uid()) and (select private.second_factor_ok()))
  with check (owner_id = (select auth.uid()));

create policy "Owners read their contacts"
  on public.contacts for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "Owners add contacts"
  on public.contacts for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select private.second_factor_ok()));
create policy "Owners edit contacts"
  on public.contacts for update to authenticated
  using (owner_id = (select auth.uid()) and (select private.second_factor_ok()))
  with check (owner_id = (select auth.uid()));
create policy "Owners delete contacts"
  on public.contacts for delete to authenticated
  using (owner_id = (select auth.uid()) and (select private.second_factor_ok()));

create policy "Owners read their invoices"
  on public.invoices for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "Owners add invoices"
  on public.invoices for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (select private.second_factor_ok())
    and (contact_id is null or contact_id in (
      select c.id from public.contacts c where c.owner_id = (select auth.uid())
    ))
  );
create policy "Owners edit invoices"
  on public.invoices for update to authenticated
  using (owner_id = (select auth.uid()) and (select private.second_factor_ok()))
  with check (
    owner_id = (select auth.uid())
    and (contact_id is null or contact_id in (
      select c.id from public.contacts c where c.owner_id = (select auth.uid())
    ))
  );
create policy "Owners delete invoices"
  on public.invoices for delete to authenticated
  using (owner_id = (select auth.uid()) and (select private.second_factor_ok()));

revoke all on public.businesses, public.contacts, public.invoices from anon;

-- ---------------------------------------------------------------------------
-- One business, one account: once the first account exists, sign-up is
-- closed (the database refuses any further accounts).
-- ---------------------------------------------------------------------------

create or replace function private.single_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from auth.users) then
    raise exception 'sign_up_closed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger single_account before insert on auth.users
  for each row execute function private.single_account();

-- Whether the sign-up page should still be offered.
create or replace function public.sign_up_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from auth.users);
$$;

grant execute on function public.sign_up_open() to anon, authenticated;
