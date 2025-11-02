-- =========================
-- SEED INICIAL - Solo Datos
-- =========================
-- Este archivo solo contiene datos de semilla.
-- Las tablas son creadas automáticamente por TypeORM.

-- Insertar driver de prueba (user_id=1 debe existir en users-srv)
INSERT INTO drivers(user_id, full_name, phone_number, email, availability)
VALUES 
  (1, 'Juan Pérez', '+593999999999', 'juan.perez@example.com', 'AVAILABLE')
ON CONFLICT (user_id) DO NOTHING;

-- Insertar vehículo de prueba
INSERT INTO vehicles(driver_id, plate_number, model, brand, year, capacity)
SELECT driver_id, 'ABC-1234', 'Hilux', 'Toyota', 2022, 1
FROM drivers WHERE user_id = 1
ON CONFLICT (plate_number) DO NOTHING;

-- Insertar documento de prueba
INSERT INTO driver_documents(driver_id, type, number, issued_at, expires_at, status)
SELECT driver_id, 'LICENSE', 'DLN123456', 
       current_date - interval '1 year', 
       current_date + interval '4 years', 
       'VALID'
FROM drivers WHERE user_id = 1
ON CONFLICT DO NOTHING;

