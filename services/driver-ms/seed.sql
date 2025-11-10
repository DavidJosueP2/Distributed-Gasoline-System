
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
