-- ============================================================
-- Routes Service Database Initialization
-- ============================================================

-- Crear base de datos si no existe
CREATE DATABASE routes;

-- Usar la base de datos
\c routes;

-- ============================================================
-- Tabla de Rutas
-- ============================================================
CREATE TABLE IF NOT EXISTS routes (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    origin_lat DECIMAL(9,6) NOT NULL,
    origin_lng DECIMAL(9,6) NOT NULL,
    destination_lat DECIMAL(9,6) NOT NULL,
    destination_lng DECIMAL(9,6) NOT NULL,
    distance_km DECIMAL(10,2) NOT NULL,
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('LIVIANO', 'PESADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para rutas
CREATE INDEX IF NOT EXISTS idx_routes_vehicle_type ON routes(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_routes_name ON routes(name);

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
$$ language 'plpgsql';

-- Trigger para routes
DROP TRIGGER IF EXISTS update_routes_updated_at ON routes;
CREATE TRIGGER update_routes_updated_at
    BEFORE UPDATE ON routes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para trips
DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Datos de ejemplo (opcional)
-- ============================================================

-- Insertar rutas de ejemplo
INSERT INTO routes (name, origin_lat, origin_lng, destination_lat, destination_lng, distance_km, vehicle_type) VALUES
('Ruta Centro - Norte', 4.6097, -74.0817, 4.7110, -74.0721, 15.5, 'LIVIANO'),
('Ruta Sur - Aeropuerto', 4.6097, -74.0817, 4.7016, -74.1469, 25.8, 'PESADO'),
('Ruta Este - Oeste', 4.6097, -74.0817, 4.6097, -74.2000, 18.2, 'LIVIANO')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Comentarios de tabla
-- ============================================================
COMMENT ON TABLE routes IS 'Tabla de rutas disponibles en el sistema';
COMMENT ON TABLE trips IS 'Tabla de viajes realizados por conductores';

COMMENT ON COLUMN routes.vehicle_type IS 'Tipo de vehículo permitido: LIVIANO o PESADO';
COMMENT ON COLUMN trips.status IS 'Estado del viaje: CREADO, EN_RUTA, EN_REVISION, TERMINADO';
COMMENT ON COLUMN trips.odometer_start IS 'Lectura inicial del odómetro del vehículo';
COMMENT ON COLUMN trips.odometer_end IS 'Lectura final del odómetro del vehículo';
COMMENT ON COLUMN trips.distance_km_real IS 'Distancia real calculada: odometer_end - odometer_start';
COMMENT ON COLUMN trips.fuel_estimated IS 'Consumo estimado calculado con 5% de holgura';
COMMENT ON COLUMN trips.fuel_actual IS 'Consumo real calculado basado en distancia real';
COMMENT ON COLUMN trips.review_comment IS 'Comentario obligatorio si desviación > 3%';
