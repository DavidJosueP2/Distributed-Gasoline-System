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

-- 3 viajes asociados a 'Ruta Centro-Norte' (ID: 1)
INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, odometer_start, distance_km_planned, fuel_estimated, status)
SELECT 1, 101, 201, 301, 15000.0, 15.5, 2.5, 'CREADO'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 1 AND driver_id = 201);

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, odometer_start, distance_km_planned, fuel_estimated, status)
SELECT 1, 102, 202, 302, 25000.0, 15.5, 2.5, 'EN_RUTA'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 1 AND driver_id = 202);

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, odometer_start, distance_km_planned, fuel_estimated, status)
SELECT 1, 103, 203, 303, 35000.0, 15.5, 2.5, 'TERMINADO'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 1 AND driver_id = 203);

-- 2 viajes asociados a 'Ruta Norte-Sur' (ID: 4)
INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, odometer_start, distance_km_planned, fuel_estimated, status)
SELECT 4, 104, 204, 304, 40000.0, 22.5, 4.0, 'CREADO'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 4 AND driver_id = 204);

INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, odometer_start, distance_km_planned, fuel_estimated, status)
SELECT 4, 105, 205, 305, 50000.0, 22.5, 4.0, 'EN_REVISION'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 4 AND driver_id = 205);

-- 1 viaje asociado a 'Ruta Centro-Comercial' (ID: 5)
INSERT INTO trips (route_id, supervisor_id, driver_id, vehicle_id, odometer_start, distance_km_planned, fuel_estimated, status)
SELECT 5, 106, 206, 306, 60000.0, 8.3, 1.5, 'TERMINADO'
WHERE NOT EXISTS (SELECT 1 FROM trips WHERE route_id = 5 AND driver_id = 206);
