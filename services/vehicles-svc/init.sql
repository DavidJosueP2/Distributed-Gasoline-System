-- ============================================================
--  BOOTSTRAP: Bases de datos (solo en primer arranque)
-- ============================================================
CREATE DATABASE vehicles_db;
CREATE DATABASE vehicles_shadow;

\connect vehicles_shadow

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

\connect vehicles_db

-- ============================================================
--  EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

/*
-- ============================================================
--  UTILIDAD: updated_at automático
--  (Si luego usas Prisma @updatedAt puedes prescindir de este trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION trg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
RETURN NEW;
END $$;

-- ============================================================
--  1) MODELOS (Plantillas)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_models (
                                              model_id       BIGSERIAL   PRIMARY KEY,
                                              brand          VARCHAR(60) NOT NULL,
    family         VARCHAR(60) NOT NULL, -- línea/base (p.ej., Corolla)
    trim           VARCHAR(60),          -- variante (XLE, etc.)
    year_from      INT         NOT NULL,
    year_to        INT,                  -- NULL = vigente
    machine_type   VARCHAR(10) NOT NULL CHECK (machine_type IN ('HEAVY','LIGHT')),
    status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DEPRECATED')),
    version        BIGINT      NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ
    );

DROP TRIGGER IF EXISTS trg_vm_touch ON vehicle_models;
CREATE TRIGGER trg_vm_touch
    BEFORE UPDATE ON vehicle_models
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

-- Unicidad de identidad SOLO para activos (deleted_at IS NULL)
-- Evita duplicados del mismo modelo “vivo” y permite recrearlo tras soft-delete
CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_models_identity_active
    ON vehicle_models (brand, family, COALESCE(trim,''), year_from, COALESCE(year_to,9999))
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_models_brand_family
    ON vehicle_models (brand, family);

CREATE INDEX IF NOT EXISTS idx_vm_status_year
    ON vehicle_models (status, year_from);

-- 1.1 Motor base del modelo (fábrica) 1:1 (SOLO combustión)
CREATE TABLE IF NOT EXISTS model_engine_specs (
                                                  model_engine_spec_id BIGSERIAL PRIMARY KEY,
                                                  model_id             BIGINT NOT NULL UNIQUE REFERENCES vehicle_models(model_id) ON DELETE CASCADE,
    engine_type          VARCHAR(10) NOT NULL CHECK (engine_type IN ('GASOLINE','DIESEL','HYBRID')),
    displacement_cc      NUMERIC(10,2),
    power_hp             NUMERIC(10,2),
    baseline_l_per_100km NUMERIC(10,3) NOT NULL,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ
    );

DROP TRIGGER IF EXISTS trg_mes_touch ON model_engine_specs;
CREATE TRIGGER trg_mes_touch
    BEFORE UPDATE ON model_engine_specs
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

-- 1.2 Requisitos de licencia por defecto del MODELO (opcional)
CREATE TABLE IF NOT EXISTS model_license_requirements (
                                                          model_license_req_id BIGSERIAL PRIMARY KEY,
                                                          model_id             BIGINT NOT NULL REFERENCES vehicle_models(model_id) ON DELETE CASCADE,
    license_type_code    VARCHAR(2),
    license_type_id      BIGINT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ,
    CONSTRAINT chk_model_license_ref CHECK (
(license_type_code IS NOT NULL AND license_type_id IS NULL) OR
(license_type_code IS NULL AND license_type_id IS NOT NULL)
    )
    );

DROP TRIGGER IF EXISTS trg_mlr_touch ON model_license_requirements;
CREATE TRIGGER trg_mlr_touch
    BEFORE UPDATE ON model_license_requirements
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

-- Unicidad SOLO activos
CREATE UNIQUE INDEX IF NOT EXISTS uq_model_license_requirements_active
    ON model_license_requirements (model_id, COALESCE(license_type_code,''), COALESCE(license_type_id,0))
    WHERE deleted_at IS NULL;

-- ============================================================
--  2) UNIDADES (Vehículos concretos)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_units (
                                             vehicle_id         BIGSERIAL PRIMARY KEY,
                                             model_id           BIGINT  NOT NULL REFERENCES vehicle_models(model_id),
    plate              CITEXT  NOT NULL, -- unicidad case-insensitive por activo
    serial_vin         CITEXT,          -- opcional, unicidad por activo
    operational_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (operational_status IN ('ACTIVE','ON_ROUTE','MAINTENANCE','RETIRED')),
    tank_capacity_l    NUMERIC(10,2),
    odometer_km        NUMERIC(12,1) DEFAULT 0,
    version            BIGINT NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at         TIMESTAMPTZ
    );

DROP TRIGGER IF EXISTS trg_vu_touch ON vehicle_units;
CREATE TRIGGER trg_vu_touch
    BEFORE UPDATE ON vehicle_units
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

-- Unicidad SOLO activos (permite reutilizar placa/VIN tras soft-delete)
CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_units_plate_active
    ON vehicle_units (plate)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_units_vin_active
    ON vehicle_units (serial_vin)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_units_status
    ON vehicle_units (operational_status);

CREATE INDEX IF NOT EXISTS idx_vu_status_plate
    ON vehicle_units (operational_status, plate);

CREATE INDEX IF NOT EXISTS idx_vu_plate
    ON vehicle_units (plate);

-- 2.1 Consumo por UNIDAD (override + calibración) 1:1 (SOLO L/100 km)
CREATE TABLE IF NOT EXISTS unit_consumption_specs (
                                                      vehicle_id                     BIGINT PRIMARY KEY REFERENCES vehicle_units(vehicle_id) ON DELETE CASCADE,
    baseline_override_l_per_100km  NUMERIC(10,3),
    calibration_k                  NUMERIC(7,5) NOT NULL DEFAULT 1.00000
    CHECK (calibration_k > 0.50000 AND calibration_k < 2.50000),
    updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
    );

DROP TRIGGER IF EXISTS trg_ucs_touch ON unit_consumption_specs;
CREATE TRIGGER trg_ucs_touch
    BEFORE UPDATE ON unit_consumption_specs
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

-- 2.2 Requisitos de licencia adicionales por UNIDAD (opcional)
CREATE TABLE IF NOT EXISTS unit_license_requirements (
                                                         unit_license_req_id BIGSERIAL PRIMARY KEY,
                                                         vehicle_id          BIGINT NOT NULL REFERENCES vehicle_units(vehicle_id) ON DELETE CASCADE,
    license_type_code   VARCHAR(2),
    license_type_id     BIGINT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT chk_unit_license_ref CHECK (
(license_type_code IS NOT NULL AND license_type_id IS NULL) OR
(license_type_code IS NULL AND license_type_id IS NOT NULL)
    )
    );

DROP TRIGGER IF EXISTS trg_ulr_touch ON unit_license_requirements;
CREATE TRIGGER trg_ulr_touch
    BEFORE UPDATE ON unit_license_requirements
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

-- Unicidad SOLO activos
CREATE UNIQUE INDEX IF NOT EXISTS uq_unit_license_requirements_active
    ON unit_license_requirements (vehicle_id, COALESCE(license_type_code,''), COALESCE(license_type_id,0))
    WHERE deleted_at IS NULL;

-- ============================================================
--  3) Idempotencia (opcional)
-- ============================================================
CREATE TABLE IF NOT EXISTS idempotency_keys (
                                                key            CITEXT PRIMARY KEY,
                                                resource_type  VARCHAR(40) NOT NULL, -- 'vehicle_model' | 'vehicle_unit' | ...
    resource_id    BIGINT      NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );

-- ============================================================
--  4) VISTAS (licencias + consumo efectivo)  [filtran borrados]
-- ============================================================

-- 4.1 Licencias consolidadas (MODELO + UNIDAD)
CREATE OR REPLACE VIEW v_unit_required_licenses AS
WITH m AS (
  SELECT vm.model_id,
         ARRAY_REMOVE(ARRAY_AGG(DISTINCT mlr.license_type_code)
           FILTER (WHERE mlr.license_type_code IS NOT NULL AND mlr.deleted_at IS NULL), NULL) AS model_codes,
         ARRAY_REMOVE(ARRAY_AGG(DISTINCT mlr.license_type_id)
           FILTER (WHERE mlr.license_type_id   IS NOT NULL AND mlr.deleted_at IS NULL), NULL) AS model_ids
  FROM vehicle_models vm
  LEFT JOIN model_license_requirements mlr ON mlr.model_id = vm.model_id
  WHERE vm.deleted_at IS NULL
  GROUP BY vm.model_id
),
u AS (
  SELECT vu.vehicle_id,
         vu.model_id,
         ARRAY_REMOVE(ARRAY_AGG(DISTINCT ulr.license_type_code)
           FILTER (WHERE ulr.license_type_code IS NOT NULL AND ulr.deleted_at IS NULL), NULL) AS unit_codes,
         ARRAY_REMOVE(ARRAY_AGG(DISTINCT ulr.license_type_id)
           FILTER (WHERE ulr.license_type_id   IS NOT NULL AND ulr.deleted_at IS NULL), NULL) AS unit_ids
  FROM vehicle_units vu
  LEFT JOIN unit_license_requirements ulr ON ulr.vehicle_id = vu.vehicle_id
  WHERE vu.deleted_at IS NULL
  GROUP BY vu.vehicle_id, vu.model_id
)
SELECT
    u.vehicle_id,
    COALESCE(m.model_codes, '{}') || COALESCE(u.unit_codes, '{}') AS required_codes,
    COALESCE(m.model_ids,   '{}') || COALESCE(u.unit_ids,   '{}') AS required_ids
FROM u
         LEFT JOIN m ON m.model_id = u.model_id;

-- 4.2 Consumo efectivo por UNIDAD
CREATE OR REPLACE VIEW v_unit_effective_consumption AS
SELECT
    vu.vehicle_id,
    mes.engine_type, -- GASOLINE | DIESEL | HYBRID
    COALESCE(ucs.calibration_k, 1.0) AS calibration_k,
    COALESCE(ucs.baseline_override_l_per_100km, mes.baseline_l_per_100km) AS baseline_source_l_per_100km,
    COALESCE(ucs.calibration_k, 1.0) * COALESCE(ucs.baseline_override_l_per_100km, mes.baseline_l_per_100km)
        AS effective_l_per_100km
FROM vehicle_units vu
         JOIN vehicle_models vm ON vm.model_id = vu.model_id       AND vm.deleted_at IS NULL
         JOIN model_engine_specs mes ON mes.model_id = vm.model_id  AND mes.deleted_at IS NULL
         LEFT JOIN unit_consumption_specs ucs ON ucs.vehicle_id = vu.vehicle_id
WHERE vu.deleted_at IS NULL;

-- ============================================================
--  5) HELPERS (respetan soft-delete)
-- ============================================================
CREATE OR REPLACE FUNCTION get_unit_required_license_codes(p_vehicle_id BIGINT)
RETURNS TEXT[] LANGUAGE sql STABLE AS $$
SELECT required_codes FROM v_unit_required_licenses WHERE vehicle_id = $1;
$$;

CREATE OR REPLACE FUNCTION get_unit_required_license_ids(p_vehicle_id BIGINT)
RETURNS BIGINT[] LANGUAGE sql STABLE AS $$
SELECT required_ids FROM v_unit_required_licenses WHERE vehicle_id = $1;
$$;

CREATE OR REPLACE FUNCTION get_unit_effective_baseline_l(p_vehicle_id BIGINT)
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
SELECT effective_l_per_100km FROM v_unit_effective_consumption WHERE vehicle_id = $1;
$$;

CREATE OR REPLACE FUNCTION estimate_liters_simple(p_vehicle_id BIGINT, p_distance_km NUMERIC)
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
SELECT CASE
           WHEN c.effective_l_per_100km IS NULL THEN NULL
           ELSE c.effective_l_per_100km * (p_distance_km / 100.0)
           END
FROM v_unit_effective_consumption c
WHERE c.vehicle_id = $1;
$$;

-- ============================================================
--  6) Seed de ejemplo (opcional)
-- ============================================================
INSERT INTO vehicle_models(brand, family, trim, year_from, year_to, machine_type)
VALUES ('Volvo','FH','460',2022,NULL,'HEAVY')
    ON CONFLICT DO NOTHING;

INSERT INTO model_engine_specs(model_id, engine_type, displacement_cc, power_hp, baseline_l_per_100km)
SELECT vm.model_id, 'DIESEL', 12800, 460, 28.0
FROM vehicle_models vm
WHERE vm.brand='Volvo' AND vm.family='FH' AND vm.trim='460' AND vm.year_from=2022
    ON CONFLICT DO NOTHING;

INSERT INTO vehicle_units(model_id, plate, operational_status, tank_capacity_l)
SELECT vm.model_id, 'PQR-456', 'ACTIVE', 600
FROM vehicle_models vm
WHERE vm.brand='Volvo' AND vm.family='FH' AND vm.trim='460' AND vm.year_from=2022
    ON CONFLICT DO NOTHING;

INSERT INTO unit_consumption_specs(vehicle_id, baseline_override_l_per_100km, calibration_k)
SELECT vu.vehicle_id, 30.0, 1.05000
FROM vehicle_units vu
WHERE vu.plate='PQR-456' AND vu.deleted_at IS NULL
    ON CONFLICT (vehicle_id) DO UPDATE
                                    SET baseline_override_l_per_100km = EXCLUDED.baseline_override_l_per_100km,
                                    calibration_k = EXCLUDED.calibration_k;
