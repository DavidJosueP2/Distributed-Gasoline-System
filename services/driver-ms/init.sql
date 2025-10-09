-- =========================================================
-- DATABASE: fleet_driver
-- PostgreSQL
-- =========================================================

create extension if not exists pgcrypto;

-- =========================
-- DRIVERS
-- =========================

-- Conductores del sistema (referencia externa: user_id de auth.users)
create table drivers (
  driver_id     bigserial primary key,
  user_id       bigint not null unique,  -- ID externo (sin FK cross-DB)
  full_name     varchar(160) not null,
  phone_number  varchar(30),
  email         varchar(160),
  availability  varchar(30) not null default 'AVAILABLE'
                check (availability in ('AVAILABLE','ON_ROUTE','INACTIVE','BLOCKED')),
  rating        numeric(3,2) default 5.00 check (rating between 0 and 5),
  version       bigint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_drivers_availability on drivers(availability);

-- =========================
-- VEHICLES
-- =========================

-- Vehículos registrados a nombre de los conductores
create table vehicles (
  vehicle_id    bigserial primary key,
  driver_id     bigint not null references drivers(driver_id) on delete cascade,
  plate_number  varchar(20) not null unique,
  model         varchar(80),
  brand         varchar(80),
  year          smallint check (year >= 1990),
  capacity      smallint,               -- número de pasajeros o carga en toneladas
  status        varchar(20) not null default 'ACTIVE'
                check (status in ('ACTIVE','INACTIVE','MAINTENANCE')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_vehicles_driver on vehicles(driver_id);
create index idx_vehicles_status on vehicles(status);

-- =========================
-- DRIVER DOCUMENTS
-- =========================

-- Documentos administrativos del conductor (ej. licencia, SOAT, revisión, etc.)
create table driver_documents (
  document_id   bigserial primary key,
  driver_id     bigint not null references drivers(driver_id) on delete cascade,
  type          varchar(50) not null,   -- ej: LICENSE, SOAT, INSURANCE, ID_CARD
  number        varchar(80),
  issued_at     date,
  expires_at    date,
  file_url      text,
  status        varchar(20) not null default 'VALID'
                check (status in ('VALID','EXPIRED','SUSPENDED')),
  version       bigint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_driver_documents_driver on driver_documents(driver_id);
create index idx_driver_documents_status on driver_documents(status);

-- =========================
-- DRIVER LOCATION (Opcional si el servicio gestiona ubicación)
-- =========================

create table driver_locations (
  driver_id     bigint primary key references drivers(driver_id) on delete cascade,
  latitude      numeric(10,6),
  longitude     numeric(10,6),
  last_update   timestamptz not null default now()
);

create index idx_driver_locations_geo on driver_locations(latitude, longitude);

-- =========================
-- TRIGGERS / ACTUALIZACIONES
-- =========================

-- Mantener updated_at actualizado
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_update_drivers
before update on drivers
for each row execute function set_updated_at();

create trigger trg_update_vehicles
before update on vehicles
for each row execute function set_updated_at();

create trigger trg_update_driver_documents
before update on driver_documents
for each row execute function set_updated_at();

-- =========================
-- SEED INICIAL (Opcional)
-- =========================

insert into drivers(user_id, full_name, phone_number, email, availability)
values 
  (1, 'Juan Pérez', '+593999999999', 'juan.perez@example.com', 'AVAILABLE')
on conflict do nothing;

insert into vehicles(driver_id, plate_number, model, brand, year, capacity)
select driver_id, 'ABC-1234', 'Hilux', 'Toyota', 2022, 1
from drivers where user_id = 1
on conflict do nothing;

insert into driver_documents(driver_id, type, number, issued_at, expires_at, status)
select driver_id, 'LICENSE', 'DLN123456', current_date - interval '1 year', current_date + interval '4 years', 'VALID'
from drivers where user_id = 1
on conflict do nothing;

-- =========================================================
-- VISTAS / CONSULTAS DE APOYO
-- =========================================================

create or replace view v_active_drivers as
select d.driver_id, d.full_name, d.phone_number, d.email,
       v.plate_number, v.model, v.brand, v.year, v.status as vehicle_status
from drivers d
left join vehicles v on v.driver_id = d.driver_id
where d.availability = 'AVAILABLE'
  and v.status = 'ACTIVE';
