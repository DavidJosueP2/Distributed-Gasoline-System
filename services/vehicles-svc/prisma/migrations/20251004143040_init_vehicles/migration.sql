-- ============================================================
--  PRISMA + Postgres (snake_case) - bootstrap
-- ============================================================

-- ===== Extensiones
-- OJO: citext no está permitido en Azure Flexible Server
-- CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== Enums (nombres tal como Prisma los define)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MachineType') THEN
CREATE TYPE "MachineType" AS ENUM ('HEAVY', 'LIGHT');
END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ModelStatus') THEN
CREATE TYPE "ModelStatus" AS ENUM ('ACTIVE', 'DEPRECATED');
END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EngineType') THEN
CREATE TYPE "EngineType" AS ENUM ('GASOLINE', 'DIESEL', 'HYBRID');
END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OperationalStatus') THEN
CREATE TYPE "OperationalStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'RETIRED', 'ON_ROUTE');
END IF;
END $$;

-- ===== Helper: trigger para updated_at automático
CREATE OR REPLACE FUNCTION trg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
RETURN NEW;
END $$;

-- ============================================================
--  1) vehicle_models
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_models (
                                              model_id       BIGSERIAL      PRIMARY KEY,
                                              brand          VARCHAR(60)    NOT NULL,
    family         VARCHAR(60)    NOT NULL,
    trim           VARCHAR(60),
    year_from      INTEGER        NOT NULL,
    year_to        INTEGER,
    machine_type   "MachineType"  NOT NULL,
    status         "ModelStatus"  NOT NULL DEFAULT 'ACTIVE',
    version        BIGINT         NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ    NOT NULL,
    deleted_at     TIMESTAMPTZ
    );

-- Índices
CREATE INDEX IF NOT EXISTS idx_vehicle_models_brand_family ON vehicle_models(brand, family);
CREATE INDEX IF NOT EXISTS idx_vm_status_year              ON vehicle_models(status, year_from);
CREATE INDEX IF NOT EXISTS idx_vm_machine_type             ON vehicle_models(machine_type, deleted_at);

-- Unique soft
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'uq_vm_identity_soft'
  ) THEN
CREATE UNIQUE INDEX uq_vm_identity_soft
    ON vehicle_models(brand, family, trim, year_from, year_to, deleted_at);
END IF;
END $$;

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_vm_touch ON vehicle_models;
CREATE TRIGGER trg_vm_touch
    BEFORE UPDATE ON vehicle_models
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

-- ============================================================
--  1.1) model_engine_specs (1:1 con vehicle_models)
-- ============================================================
CREATE TABLE IF NOT EXISTS model_engine_specs (
                                                  model_engine_spec_id BIGSERIAL      PRIMARY KEY,
                                                  model_id             BIGINT         NOT NULL UNIQUE,
                                                  engine_type          "EngineType"   NOT NULL,
                                                  displacement_cc      DECIMAL(10,2)  NOT NULL,
    power_hp             DECIMAL(10,2)  NOT NULL,
    baseline_l_per_100km DECIMAL(10,3)  NOT NULL,
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at           TIMESTAMPTZ
    );

ALTER TABLE model_engine_specs
DROP CONSTRAINT IF EXISTS model_engine_specs_model_id_fkey,
  ADD  CONSTRAINT model_engine_specs_model_id_fkey
       FOREIGN KEY (model_id) REFERENCES vehicle_models(model_id)
       ON DELETE CASCADE ON UPDATE CASCADE;

DROP TRIGGER IF EXISTS trg_mes_touch ON model_engine_specs;
CREATE TRIGGER trg_mes_touch
    BEFORE UPDATE ON model_engine_specs
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

-- ============================================================
--  1.2) model_license_requirements (licencias por modelo)
-- ============================================================
CREATE TABLE IF NOT EXISTS model_license_requirements (
                                                          model_license_req_id BIGSERIAL   PRIMARY KEY,
                                                          model_id             BIGINT      NOT NULL,
                                                          license_type_code    VARCHAR(2),
    license_type_id      BIGINT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ NOT NULL,
    deleted_at           TIMESTAMPTZ
    );

ALTER TABLE model_license_requirements
DROP CONSTRAINT IF EXISTS model_license_requirements_model_id_fkey,
  ADD  CONSTRAINT model_license_requirements_model_id_fkey
       FOREIGN KEY (model_id) REFERENCES vehicle_models(model_id)
       ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique soft
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'uq_mlr_soft'
  ) THEN
CREATE UNIQUE INDEX uq_mlr_soft
    ON model_license_requirements(model_id, license_type_code, license_type_id, deleted_at);
END IF;
END $$;

DROP TRIGGER IF EXISTS trg_mlr_touch ON model_license_requirements;
CREATE TRIGGER trg_mlr_touch
    BEFORE UPDATE ON model_license_requirements
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

-- ============================================================
--  2) vehicle_units (instancias físicas)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_units (
                                             vehicle_id         BIGSERIAL           PRIMARY KEY,
                                             model_id           BIGINT              NOT NULL,
    -- antes: plate CITEXT NOT NULL
                                             plate              VARCHAR(255)        NOT NULL,
    -- antes: serial_vin CITEXT
    serial_vin         VARCHAR(255),
    operational_status "OperationalStatus" NOT NULL DEFAULT 'ACTIVE',
    tank_capacity_l    DECIMAL(10,2)       NOT NULL,
    odometer_km        DECIMAL(12,1)       NOT NULL DEFAULT 0,
    version            BIGINT              NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ         NOT NULL,
    deleted_at         TIMESTAMPTZ
    );

ALTER TABLE vehicle_units
DROP CONSTRAINT IF EXISTS vehicle_units_model_id_fkey,
  ADD  CONSTRAINT vehicle_units_model_id_fkey
       FOREIGN KEY (model_id) REFERENCES vehicle_models(model_id)
       ON DELETE RESTRICT ON UPDATE CASCADE;

-- Índices y uniques (soft)
CREATE INDEX IF NOT EXISTS idx_vehicle_units_status ON vehicle_units(operational_status);
CREATE INDEX IF NOT EXISTS idx_vu_status_plate      ON vehicle_units(operational_status, plate);
CREATE INDEX IF NOT EXISTS idx_vu_plate             ON vehicle_units(plate);
CREATE INDEX IF NOT EXISTS idx_vu_model_deleted     ON vehicle_units(model_id, deleted_at);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_vu_plate_soft') THEN
CREATE UNIQUE INDEX uq_vu_plate_soft ON vehicle_units(plate, deleted_at);
END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_vu_vin_soft') THEN
CREATE UNIQUE INDEX uq_vu_vin_soft   ON vehicle_units(serial_vin, deleted_at);
END IF;
END $$;

DROP TRIGGER IF EXISTS trg_vu_touch ON vehicle_units;
CREATE TRIGGER trg_vu_touch
    BEFORE UPDATE ON vehicle_units
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

-- ============================================================
--  2.1) unit_consumption_specs (1:1 por unidad)
-- ============================================================
CREATE TABLE IF NOT EXISTS unit_consumption_specs (
                                                      vehicle_id                    BIGINT        PRIMARY KEY,
                                                      baseline_override_l_per_100km DECIMAL(10,3) NOT NULL,
    calibration_k                 DECIMAL(7,5)  NOT NULL DEFAULT 1.00000,
    updated_at                    TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

ALTER TABLE unit_consumption_specs
DROP CONSTRAINT IF EXISTS unit_consumption_specs_vehicle_id_fkey,
  ADD  CONSTRAINT unit_consumption_specs_vehicle_id_fkey
       FOREIGN KEY (vehicle_id) REFERENCES vehicle_units(vehicle_id)
       ON DELETE CASCADE ON UPDATE CASCADE;

DROP TRIGGER IF EXISTS trg_ucs_touch ON unit_consumption_specs;
CREATE TRIGGER trg_ucs_touch
    BEFORE UPDATE ON unit_consumption_specs
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

-- ============================================================
--  2.2) unit_license_requirements (licencias por unidad)
-- ============================================================
CREATE TABLE IF NOT EXISTS unit_license_requirements (
                                                         unit_license_req_id BIGSERIAL   PRIMARY KEY,
                                                         vehicle_id          BIGINT      NOT NULL,
                                                         license_type_code   VARCHAR(2),
    license_type_id     BIGINT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL,
    deleted_at          TIMESTAMPTZ
    );

ALTER TABLE unit_license_requirements
DROP CONSTRAINT IF EXISTS unit_license_requirements_vehicle_id_fkey,
  ADD  CONSTRAINT unit_license_requirements_vehicle_id_fkey
       FOREIGN KEY (vehicle_id) REFERENCES vehicle_units(vehicle_id)
       ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique soft
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'uq_ulr_soft'
  ) THEN
CREATE UNIQUE INDEX uq_ulr_soft
    ON unit_license_requirements(vehicle_id, license_type_code, license_type_id, deleted_at);
END IF;
END $$;

DROP TRIGGER IF EXISTS trg_ulr_touch ON unit_license_requirements;
CREATE TRIGGER trg_ulr_touch
    BEFORE UPDATE ON unit_license_requirements
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

-- ============================================================
--  3) idempotency_keys
-- ============================================================
CREATE TABLE IF NOT EXISTS idempotency_keys (
    -- antes: key CITEXT PRIMARY KEY
                                                key            VARCHAR(255)  PRIMARY KEY,
    resource_type  VARCHAR(40)   NOT NULL,
    resource_id    BIGINT        NOT NULL,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

-- ============================================================
--  4) VISTAS (ajustadas a snake_case y soft-delete)
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
    mes.engine_type,
    COALESCE(ucs.calibration_k, 1.0) AS calibration_k,
    COALESCE(ucs.baseline_override_l_per_100km, mes.baseline_l_per_100km) AS baseline_source_l_per_100km,
    COALESCE(ucs.calibration_k, 1.0) * COALESCE(ucs.baseline_override_l_per_100km, mes.baseline_l_per_100km)
        AS effective_l_per_100km
FROM vehicle_units vu
         JOIN vehicle_models        vm  ON vm.model_id = vu.model_id AND vm.deleted_at IS NULL
         JOIN model_engine_specs    mes ON mes.model_id = vm.model_id AND mes.deleted_at IS NULL
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
