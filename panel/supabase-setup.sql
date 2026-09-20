-- Copia todo este archivo y pégalo en el SQL Editor de Supabase, luego Run.
-- Crea las tablas del panel de reservas de Capua 6 y las protege: sin una
-- sesión iniciada (login), la base de datos no devuelve ni una fila.

create table reservas (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_phone text not null,
  modality text not null check (modality in ('espicha','hibrida','exclusiva','medida')),
  attendees integer not null check (attendees > 0 and attendees <= 50),
  start_date date not null,
  start_time time not null,
  end_date date not null,
  end_time time not null,
  is_holiday_eve boolean not null default false,
  total_price numeric,
  deposit_requested numeric,
  notes text default '',
  status text not null default 'consulta' check (status in ('consulta','pendiente','confirmada','cancelada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table pagos (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references reservas(id) on delete cascade,
  amount numeric not null check (amount > 0),
  date date not null,
  method text not null check (method in ('efectivo','transferencia')),
  note text default ''
);

create table bloqueos (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  reason text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table reservas enable row level security;
alter table pagos enable row level security;
alter table bloqueos enable row level security;

create policy "staff acceso total reservas" on reservas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff acceso total pagos" on pagos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff acceso total bloqueos" on bloqueos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
