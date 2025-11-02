-- Migration: Fix duplicate rows and primary key/indexes on license_includes
-- Backup data, remove duplicates, drop problematic single-column unique indexes,
-- create non-unique indexes and add composite primary key if missing.

-- WARNING: review before running on production. Make a backup of your DB first.

-- Create a backup table (schema + data)
CREATE TABLE IF NOT EXISTS license_includes_bkp AS TABLE license_includes WITH NO DATA;
INSERT INTO license_includes_bkp SELECT * FROM license_includes;

BEGIN;

-- 1) Remove exact duplicate rows (same parent + child)
DELETE FROM license_includes a
USING license_includes b
WHERE a.ctid < b.ctid
  AND a.parent_license_type_id = b.parent_license_type_id
  AND a.child_license_type_id = b.child_license_type_id;

-- 2) Drop any index that references only child_license_type_id (these would block creating the composite PK)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT indexname, indexdef FROM pg_indexes
    WHERE tablename='license_includes'
      AND indexdef ~ '\(child_license_type_id\)'
      AND indexdef !~ '\(parent_license_type_id, child_license_type_id\)'
  LOOP
    RAISE NOTICE 'Dropping index %', r.indexname;
    EXECUTE format('DROP INDEX IF EXISTS %I', r.indexname);
  END LOOP;
END;
$$;

-- 3) Ensure non-unique indexes exist for lookup performance (matches your SQL schema)
CREATE INDEX IF NOT EXISTS idx_license_includes_parent ON license_includes(parent_license_type_id);
CREATE INDEX IF NOT EXISTS idx_license_includes_child ON license_includes(child_license_type_id);

-- 4) Add composite primary key if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'license_includes'
      AND c.contype = 'p'
  ) THEN
    ALTER TABLE license_includes ADD CONSTRAINT license_includes_pkey PRIMARY KEY (parent_license_type_id, child_license_type_id);
  ELSE
    RAISE NOTICE 'Primary key already exists on license_includes';
  END IF;
END;
$$;

COMMIT;

-- End of migration
