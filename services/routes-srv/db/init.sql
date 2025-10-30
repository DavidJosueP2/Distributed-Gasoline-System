-- ============================================================
-- Routes Service Database Initialization
-- ============================================================

-- ============================================================
-- Tabla de Rutas
-- ============================================================
CREATE TABLE IF NOT EXISTS routes (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    origin_name VARCHAR(255) NOT NULL,
    origin_lat DECIMAL(9,6) NOT NULL,
    origin_lng DECIMAL(9,6) NOT NULL,
    destination_name VARCHAR(255) NOT NULL,
    destination_lat DECIMAL(9,6) NOT NULL,
    destination_lng DECIMAL(9,6) NOT NULL,
    distance_km DECIMAL(10,2) NOT NULL,
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('LIVIANO', 'PESADO', 'CUALQUIERA')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para rutas
CREATE INDEX IF NOT EXISTS idx_routes_vehicle_type ON routes(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_routes_name ON routes(name);
CREATE INDEX IF NOT EXISTS idx_routes_origin_name ON routes(origin_name);
CREATE INDEX IF NOT EXISTS idx_routes_destination_name ON routes(destination_name);

-- ============================================================
-- Tabla de Viajes
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
    id BIGSERIAL PRIMARY KEY,
    route_id BIGINT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    supervisor_id BIGINT NOT NULL,
    driver_id BIGINT NOT NULL,
    vehicle_id BIGINT NOT NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'CREADO' CHECK (status IN ('CREADO', 'EN_RUTA', 'EN_REVISION', 'TERMINADO')),
    odometer_start DECIMAL(12,1) NOT NULL,
    odometer_end DECIMAL(12,1),
    distance_km_real DECIMAL(10,2),
    distance_km_planned DECIMAL(10,2) NOT NULL,
    fuel_estimated DECIMAL(10,3) NOT NULL,
    fuel_actual DECIMAL(10,3),
    review_comment TEXT,
    current_lat DECIMAL(10,7),
    current_lng DECIMAL(10,7),
    current_distance DECIMAL(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para viajes
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_route_id ON trips(route_id);
CREATE INDEX IF NOT EXISTS idx_trips_supervisor_id ON trips(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at);

-- ============================================================
-- Triggers para updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_routes_updated_at
    BEFORE UPDATE ON routes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Datos de ejemplo
-- ============================================================
INSERT INTO routes (name, origin_name, origin_lat, origin_lng, destination_name, destination_lat, destination_lng, distance_km, vehicle_type)
SELECT 'Ruta Centro-Norte', 'Centro de Bogotá', 4.6097, -74.0817, 'Norte de Bogotá', 4.7110, -74.0721, 15.5, 'CUALQUIERA'
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE name = 'Ruta Centro-Norte');

INSERT INTO routes (name, origin_name, origin_lat, origin_lng, destination_name, destination_lat, destination_lng, distance_km, vehicle_type)
SELECT 'Ruta Sur-Aeropuerto', 'Sur de Bogotá', 4.6097, -74.0817, 'Aeropuerto El Dorado', 4.7016, -74.1469, 25.8, 'PESADO'
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE name = 'Ruta Sur-Aeropuerto');

INSERT INTO routes (name, origin_name, origin_lat, origin_lng, destination_name, destination_lat, destination_lng, distance_km, vehicle_type)
SELECT 'Ruta Este-Oeste', 'Este de Bogotá', 4.6097, -74.0817, 'Oeste de Bogotá', 4.6097, -74.2000, 18.2, 'LIVIANO'
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE name = 'Ruta Este-Oeste');

-- Rutas adicionales para pruebas
INSERT INTO routes (name, origin_name, origin_lat, origin_lng, destination_name, destination_lat, destination_lng, distance_km, vehicle_type)
SELECT 'Ruta Norte-Sur', 'Norte de Bogotá', 4.7110, -74.0721, 'Sur de Bogotá', 4.6097, -74.0817, 22.5, 'PESADO'
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE name = 'Ruta Norte-Sur');

INSERT INTO routes (name, origin_name, origin_lat, origin_lng, destination_name, destination_lat, destination_lng, distance_km, vehicle_type)
SELECT 'Ruta Centro-Comercial', 'Centro de Bogotá', 4.6097, -74.0817, 'Centro Comercial', 4.6500, -74.1000, 8.3, 'LIVIANO'
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE name = 'Ruta Centro-Comercial');

-- ============================================================
-- Viajes de prueba para validar restricciones
-- ============================================================

-- Registros adicionales para pruebas (20 viajes)
-- 1) CREADO (sin tiempos ni métricas finales)
INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, odometer_start, distance_km_planned, fuel_estimated, status)
SELECT 2, 2, 3, 307, 12345.0, 25.8, 3.100, 'CREADO'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 2 AND driver_id = 3 AND status = 'CREADO');

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, odometer_start, distance_km_planned, fuel_estimated, status)
SELECT 3, 6, 8, 308, 22300.0, 18.2, 2.100, 'CREADO'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 3 AND driver_id = 8 AND status = 'CREADO');

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, odometer_start, distance_km_planned, fuel_estimated, status)
SELECT 4, 7, 9, 309, 33333.0, 22.5, 3.800, 'CREADO'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 4 AND driver_id = 9 AND status = 'CREADO');

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, odometer_start, distance_km_planned, fuel_estimated, status)
SELECT 5, 6, 9, 310, 44444.0, 8.3, 1.300, 'CREADO'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 5 AND driver_id = 9 AND status = 'CREADO');

-- CREADO específico con supervisor_id=2 y driver_id=3
INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, odometer_start, distance_km_planned, fuel_estimated, status)
SELECT 1, 2, 3, 301, 15000.0, 15.5, 2.450, 'CREADO'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 1 AND driver_id = 3 AND status = 'CREADO');

-- 2) EN_RUTA (con start_time y posición actual)
INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, status, odometer_start, distance_km_planned, fuel_estimated, current_lat, current_lng, current_distance)
SELECT 2, 6, 8, 311, NOW() - INTERVAL '1 hour', 'EN_RUTA', 55555.0, 25.8, 3.300, 4.7000000, -74.1200000, 12.5
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 2 AND driver_id = 8 AND status = 'EN_RUTA');

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, status, odometer_start, distance_km_planned, fuel_estimated, current_lat, current_lng, current_distance)
SELECT 3, 7, 9, 312, NOW() - INTERVAL '2 hours', 'EN_RUTA', 66666.0, 18.2, 2.050, 4.6500000, -74.1500000, 6.7
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 3 AND driver_id = 9 AND status = 'EN_RUTA');

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, status, odometer_start, distance_km_planned, fuel_estimated, current_lat, current_lng, current_distance)
SELECT 4, 2, 3, 313, NOW() - INTERVAL '30 minutes', 'EN_RUTA', 77777.0, 22.5, 3.950, 4.6900000, -74.0900000, 18.9
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 4 AND driver_id = 3 AND status = 'EN_RUTA');

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, status, odometer_start, distance_km_planned, fuel_estimated, current_lat, current_lng, current_distance)
SELECT 5, 6, 8, 314, NOW() - INTERVAL '45 minutes', 'EN_RUTA', 88888.0, 8.3, 1.250, 4.6400000, -74.1100000, 4.1
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 5 AND driver_id = 8 AND status = 'EN_RUTA');

-- EN_RUTA específico con supervisor_id=2 y driver_id=3
INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, status, odometer_start, distance_km_planned, fuel_estimated, current_lat, current_lng, current_distance)
SELECT 2, 2, 3, 302, NOW() - INTERVAL '20 minutes', 'EN_RUTA', 20000.0, 25.8, 3.100, 4.7005000, -74.1205000, 5.4
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 2 AND driver_id = 3 AND status = 'EN_RUTA');

-- 3) EN_REVISION (solo end_time; sin odometer_end, ni distance_km_real, ni fuel_actual)
INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, end_time, status, odometer_start, distance_km_planned, fuel_estimated)
SELECT 2, 7, 9, 315, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '20 minutes', 'EN_REVISION', 91000.0, 25.8, 3.200
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 2 AND driver_id = 9 AND status = 'EN_REVISION');

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, end_time, status, odometer_start, distance_km_planned, fuel_estimated)
SELECT 3, 2, 3, 316, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '10 minutes', 'EN_REVISION', 12000.0, 18.2, 2.000
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 3 AND driver_id = 3 AND status = 'EN_REVISION');

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, end_time, status, odometer_start, distance_km_planned, fuel_estimated)
SELECT 4, 6, 8, 317, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '30 minutes', 'EN_REVISION', 30500.0, 22.5, 3.900
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 4 AND driver_id = 8 AND status = 'EN_REVISION');

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, end_time, status, odometer_start, distance_km_planned, fuel_estimated)
SELECT 5, 7, 9, 318, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '5 minutes', 'EN_REVISION', 70500.0, 8.3, 1.450
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 5 AND driver_id = 9 AND status = 'EN_REVISION');

-- EN_REVISION específico con supervisor_id=2 y driver_id=3
INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, end_time, status, odometer_start, distance_km_planned, fuel_estimated)
SELECT 3, 2, 3, 303, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '10 minutes', 'EN_REVISION', 30000.0, 18.2, 2.000
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 3 AND driver_id = 3 AND status = 'EN_REVISION');

-- 4) TERMINADO (con métricas finales y comentario de revisión)
INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, end_time, status, odometer_start, odometer_end, distance_km_planned, distance_km_real, fuel_estimated, fuel_actual, review_comment)
SELECT 2, 2, 3, 319, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours', 'TERMINADO', 15000.0, 15026.0, 25.8, 26.0, 3.150, 3.220, 'Desvío leve por tráfico'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 2 AND driver_id = 3 AND status = 'TERMINADO');

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, end_time, status, odometer_start, odometer_end, distance_km_planned, distance_km_real, fuel_estimated, fuel_actual, review_comment)
SELECT 3, 6, 8, 320, NOW() - INTERVAL '7 hours', NOW() - INTERVAL '6 hours 30 minutes', 'TERMINADO', 51000.0, 51018.0, 18.2, 18.0, 2.050, 2.000, 'Ajuste por obras'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 3 AND driver_id = 8 AND status = 'TERMINADO');

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, end_time, status, odometer_start, odometer_end, distance_km_planned, distance_km_real, fuel_estimated, fuel_actual, review_comment)
SELECT 4, 7, 9, 321, NOW() - INTERVAL '8 hours', NOW() - INTERVAL '7 hours 20 minutes', 'TERMINADO', 80200.0, 80223.0, 22.5, 23.0, 3.950, 4.020, 'Ruta extendida por desvíos'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 4 AND driver_id = 9 AND status = 'TERMINADO');

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, end_time, status, odometer_start, odometer_end, distance_km_planned, distance_km_real, fuel_estimated, fuel_actual, review_comment)
SELECT 5, 2, 3, 322, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 45 minutes', 'TERMINADO', 92000.0, 92008.0, 8.3, 8.1, 1.350, 1.330, 'Consumo dentro de lo esperado'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 5 AND driver_id = 3 AND status = 'TERMINADO');

-- TERMINADO específico con supervisor_id=2 y driver_id=3
INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, end_time, status, odometer_start, odometer_end, distance_km_planned, distance_km_real, fuel_estimated, fuel_actual, review_comment)
SELECT 4, 2, 3, 304, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours 35 minutes', 'TERMINADO', 40000.0, 40023.0, 22.5, 23.0, 3.800, 3.950, 'Finalizado por supervisor id=2'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 4 AND driver_id = 3 AND status = 'TERMINADO');

-- 5) Mezcla adicional para alcanzar 20 registros
-- CREADO
INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, odometer_start, distance_km_planned, fuel_estimated, status)
SELECT 1, 6, 8, 323, 15750.0, 15.5, 2.450, 'CREADO'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 1 AND driver_id = 8 AND status = 'CREADO');

-- EN_RUTA
INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, status, odometer_start, distance_km_planned, fuel_estimated, current_lat, current_lng, current_distance)
SELECT 1, 7, 9, 324, NOW() - INTERVAL '25 minutes', 'EN_RUTA', 16500.0, 15.5, 2.400, 4.6800000, -74.1300000, 7.9
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 1 AND driver_id = 9 AND status = 'EN_RUTA');

-- EN_REVISION
INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, end_time, status, odometer_start, distance_km_planned, fuel_estimated)
SELECT 1, 2, 3, 325, NOW() - INTERVAL '2 hours 15 minutes', NOW() - INTERVAL '15 minutes', 'EN_REVISION', 17200.0, 15.5, 2.500
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 1 AND driver_id = 3 AND status = 'EN_REVISION');

-- TERMINADO
INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, end_time, status, odometer_start, odometer_end, distance_km_planned, distance_km_real, fuel_estimated, fuel_actual, review_comment)
SELECT 2, 6, 8, 326, NOW() - INTERVAL '10 hours', NOW() - INTERVAL '9 hours 40 minutes', 'TERMINADO', 26000.0, 26026.0, 25.8, 26.1, 3.250, 3.300, 'Desempeño correcto'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 2 AND driver_id = 8 AND status = 'TERMINADO');

-- Extras para diversidad
INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, odometer_start, distance_km_planned, fuel_estimated, status)
SELECT 3, 7, 9, 327, 27500.0, 18.2, 2.020, 'CREADO'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 3 AND driver_id = 9 AND status = 'CREADO');

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, status, odometer_start, distance_km_planned, fuel_estimated, current_lat, current_lng, current_distance)
SELECT 4, 2, 3, 328, NOW() - INTERVAL '1 hour 10 minutes', 'EN_RUTA', 36500.0, 22.5, 3.880, 4.7005000, -74.0705000, 10.3
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 4 AND driver_id = 3 AND status = 'EN_RUTA');

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, end_time, status, odometer_start, distance_km_planned, fuel_estimated)
SELECT 5, 6, 8, 329, NOW() - INTERVAL '1 hour 30 minutes', NOW() - INTERVAL '8 minutes', 'EN_REVISION', 95000.0, 8.3, 1.380
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 5 AND driver_id = 8 AND status = 'EN_REVISION');

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, start_time, end_time, status, odometer_start, odometer_end, distance_km_planned, distance_km_real, fuel_estimated, fuel_actual, review_comment)
SELECT 1, 7, 9, 330, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours 40 minutes', 'TERMINADO', 18000.0, 18016.0, 15.5, 15.8, 2.480, 2.520, 'Todo OK'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 1 AND driver_id = 9 AND status = 'TERMINADO');
