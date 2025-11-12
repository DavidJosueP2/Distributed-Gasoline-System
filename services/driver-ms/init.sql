-- =========================================================
-- DATABASE: drivers
-- PostgreSQL
-- =========================================================
-- Este script crea las tablas según las entidades TypeORM del servicio driver-ms

create extension if not exists pgcrypto;

-- =========================
-- DRIVERS
-- =========================
-- Tabla: drivers
-- Entidad: Driver (src/drivers/entities/driver.entity.ts)

create table if not exists drivers (
  driver_id     bigint primary key generated always as identity,
  user_id       bigint not null unique,  -- ID externo (users-srv)
  availability  varchar(30) not null default 'AVAILABLE'
                check (availability in ('AVAILABLE','ON_ROUTE','LICENSE_EXPIRED','INACTIVE')),
  version       bigint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_drivers_availability on drivers(availability);

-- =========================
-- LICENSE TYPES
-- =========================
-- Tabla: license_types
-- Entidad: LicenseType (src/license-types/entities/license-type.entity.ts)

create table if not exists license_types (
  license_type_id  bigint primary key generated always as identity,
  code             varchar(10) not null unique,
  description      varchar(160),
  is_professional  boolean not null default false,
  created_at       timestamptz not null default now()
);

-- =========================
-- LICENSE INCLUDES
-- =========================
-- Tabla: license_includes
-- Entidad: LicenseInclude (src/license-types/entities/license-include.entity.ts)
-- Tabla de relación muchos-a-muchos para jerarquías de licencias

create table if not exists license_includes (
  parent_license_type_id  bigint not null,
  child_license_type_id   bigint not null,
  primary key (parent_license_type_id, child_license_type_id),
  foreign key (parent_license_type_id) references license_types(license_type_id) on delete cascade,
  foreign key (child_license_type_id) references license_types(license_type_id) on delete cascade
);

create index if not exists idx_license_includes_parent on license_includes(parent_license_type_id);
create index if not exists idx_license_includes_child on license_includes(child_license_type_id);

-- =========================
-- DRIVER LICENSES
-- =========================
-- Tabla: driver_licenses
-- Entidad: DriverLicense (src/drivers/entities/driver-license.entity.ts)

create table if not exists driver_licenses (
  driver_license_id  bigint primary key generated always as identity,
  driver_id           bigint not null,
  license_type_id     bigint not null,
  number              varchar(40) unique,
  issued_at           date,
  expires_at          date,
  status              varchar(20) not null default 'VALID'
                      check (status in ('VALID','EXPIRED','SUSPENDED')),
  version             bigint not null default 0,
  foreign key (driver_id) references drivers(driver_id) on delete cascade,
  foreign key (license_type_id) references license_types(license_type_id) on delete restrict
);

create index if not exists idx_driver_licenses_driver on driver_licenses(driver_id);
create index if not exists idx_driver_licenses_license on driver_licenses(license_type_id);
create index if not exists idx_driver_licenses_expiry on driver_licenses(status, expires_at);

-- =========================
-- TRIGGERS
-- =========================

-- Mantener updated_at actualizado automáticamente
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Drop trigger if exists before creating to avoid errors
drop trigger if exists trg_update_drivers on drivers;
create trigger trg_update_drivers
before update on drivers
for each row execute function set_updated_at();

-- =========================
-- SEED DATA
-- =========================
-- Datos iniciales para testing

-- Insertar conductores (user_id debe coincidir con users-srv)
insert into drivers(user_id, availability)
values 
  (3, 'AVAILABLE'),
  (8, 'AVAILABLE'),
  (9, 'AVAILABLE')
on conflict (user_id) do nothing;

-- Insertar tipos de licencia comunes
insert into license_types(code, description, is_professional)
values 
  ('A', 'Motocicletas', false),
  ('B', 'Vehículos livianos', false),
  ('C', 'Vehículos pesados', true),
  ('D', 'Transporte público', true),
  ('E', 'Vehículos especiales', true)
on conflict (code) do nothing;

-- Insertar licencias de prueba para los conductores
insert into driver_licenses(driver_id, license_type_id, number, issued_at, expires_at, status)
select 
  d.driver_id,
  lt.license_type_id,
  'DLN' || d.user_id || '-001',
  current_date - interval '1 year',
  current_date + interval '4 years',
  'VALID'
from drivers d
cross join license_types lt
where lt.code = 'B'
  and d.user_id in (3, 8, 9)
on conflict (number) do nothing;
