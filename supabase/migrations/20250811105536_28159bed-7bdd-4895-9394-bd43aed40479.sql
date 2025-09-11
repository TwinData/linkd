-- LinKD initial schema: roles, clients, transactions, promotions with secure RLS
-- Safe UUID generator
create extension if not exists "pgcrypto";

-- 1) Enums
create type public.app_role as enum ('superadmin','admin','user');
create type public.promo_discount_type as enum ('percentage','fixed');
create type public.transaction_status as enum ('pending','verified','paid','rejected');

-- 2) Utility: updated_at trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 3) Roles table and helpers
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- RLS for user_roles
create policy "Users can view their roles or admins all"
  on public.user_roles
  for select
  to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'superadmin'));

create policy "Admins manage roles"
  on public.user_roles
  for all
  to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'superadmin'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'superadmin'));

-- 4) Clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  image_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;

-- Clients policies
create policy "Owners can read their clients"
  on public.clients for select to authenticated
  using (owner_id = auth.uid());

create policy "Owners can insert their clients"
  on public.clients for insert to authenticated
  with check (owner_id = auth.uid());

create policy "Owners can update their clients"
  on public.clients for update to authenticated
  using (owner_id = auth.uid());

create policy "Owners can delete their clients"
  on public.clients for delete to authenticated
  using (owner_id = auth.uid());

create policy "Admins can read all clients"
  on public.clients for select to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'superadmin'));

create policy "Admins can insert clients"
  on public.clients for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'superadmin'));

create policy "Admins can update all clients"
  on public.clients for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'superadmin'));

create policy "Admins can delete all clients"
  on public.clients for delete to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'superadmin'));

create trigger update_clients_updated_at
  before update on public.clients
  for each row execute function public.update_updated_at_column();

-- 5) Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  amount_kd numeric(12,3) not null check (amount_kd > 0),
  rate_kes_per_kd numeric(12,3) not null check (rate_kes_per_kd > 0),
  amount_kes numeric(14,2) not null,
  screenshot_url text,
  status public.transaction_status not null default 'pending',
  reference text unique,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create or replace function public.compute_amount_kes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.amount_kes := round(new.amount_kd * new.rate_kes_per_kd, 2);
  return new;
end;
$$;

create trigger compute_transactions_amount
  before insert or update of amount_kd, rate_kes_per_kd on public.transactions
  for each row execute function public.compute_amount_kes();

create trigger update_transactions_updated_at
  before update on public.transactions
  for each row execute function public.update_updated_at_column();

-- Transactions policies
create policy "Owners can read their transactions"
  on public.transactions for select to authenticated
  using (owner_id = auth.uid());

create policy "Owners can insert transactions"
  on public.transactions for insert to authenticated
  with check (owner_id = auth.uid());

create policy "Owners can update their transactions"
  on public.transactions for update to authenticated
  using (owner_id = auth.uid());

create policy "Owners can delete their transactions"
  on public.transactions for delete to authenticated
  using (owner_id = auth.uid());

create policy "Admins can read all transactions"
  on public.transactions for select to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'superadmin'));

create policy "Admins can insert transactions"
  on public.transactions for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'superadmin'));

create policy "Admins can update all transactions"
  on public.transactions for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'superadmin'));

create policy "Admins can delete all transactions"
  on public.transactions for delete to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'superadmin'));

-- 6) Promotions
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  discount_type public.promo_discount_type not null,
  value numeric(10,2) not null check (value > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.promotions enable row level security;

create or replace function public.validate_promotion_period()
returns trigger
language plpgsql
as $$
begin
  if new.starts_at is not null and new.ends_at is not null and new.ends_at <= new.starts_at then
    raise exception 'ends_at must be after starts_at';
  end if;
  return new;
end;
$$;

create trigger validate_promotion_period_trg
  before insert or update on public.promotions
  for each row execute function public.validate_promotion_period();

create trigger update_promotions_updated_at
  before update on public.promotions
  for each row execute function public.update_updated_at_column();

-- Promotions policies
create policy "Everyone authenticated can read promotions"
  on public.promotions for select to authenticated using (true);

create policy "Only admins can create promotions"
  on public.promotions for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'superadmin'));

create policy "Only admins can update promotions"
  on public.promotions for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'superadmin'));

create policy "Only admins can delete promotions"
  on public.promotions for delete to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'superadmin'));

-- 7) Try to auto-assign superadmin if the user already exists
DO $$
DECLARE
  _uid uuid;
BEGIN
  select id into _uid from auth.users where email = 'superadmin@twindataminds.com' limit 1;
  if _uid is not null then
    insert into public.user_roles (user_id, role)
    values (_uid, 'superadmin')
    on conflict (user_id, role) do nothing;
  end if;
END $$;