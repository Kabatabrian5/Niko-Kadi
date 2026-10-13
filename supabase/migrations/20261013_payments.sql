create table public.app_config (
  key text primary key,
  value text not null
);
insert into public.app_config values
  ('kes_per_point','1'), ('min_deposit','10'), ('min_withdraw','100');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  kind text not null check (kind in ('deposit','withdrawal')),
  phone text not null,
  amount_kes integer not null check (amount_kes > 0),
  points integer not null,
  status text not null default 'pending'
    check (status in ('pending','success','failed','cancelled')),
  checkout_request_id text unique,
  conversation_id text unique,
  mpesa_receipt text unique,
  result_desc text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id),
  delta integer not null,
  reason text not null,
  payment_id uuid references public.payments(id),
  created_at timestamptz not null default now(),
  unique (payment_id, reason)
);

create view public.points_balance with (security_invoker = true) as
  select user_id, coalesce(sum(delta),0)::int as points
  from public.points_ledger
  group by user_id;

alter table public.app_config enable row level security;
alter table public.payments enable row level security;
alter table public.points_ledger enable row level security;

create policy "own payments" on public.payments
  for select to authenticated using (auth.uid() = user_id);
create policy "own ledger" on public.points_ledger
  for select to authenticated using (auth.uid() = user_id);