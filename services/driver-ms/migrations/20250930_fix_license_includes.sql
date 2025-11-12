-- Migration: Fix duplicate rows and primary key/indexes on license_includes
-- Backup data, remove duplicates, drop problematic single-column unique indexes,
-- create non-unique indexes and add composite primary key if missing.

-- WARNING: review before running on production. Make a backup of your DB first.

-- Create a backup table (schema + data) - only if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'license_includes') THEN
    DROP TABLE IF EXISTS license_includes_bkp;
    CREATE TABLE license_includes_bkp AS TABLE license_includes;
    RAISE NOTICE 'Backup table created: license_includes_bkp';
  ELSE
    RAISE NOTICE 'Table license_includes does not exist yet, skipping migration';
    RETURN;
  END IF;
END $$;

BEGIN;

-- 1) Remove exact duplicate rows (same parent + child) - only if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'license_includes') THEN
    DELETE FROM license_includes a
    USING license_includes b
    WHERE a.ctid < b.ctid
      AND a.parent_license_type_id = b.parent_license_type_id
      AND a.child_license_type_id = b.child_license_type_id;
    RAISE NOTICE 'Duplicate rows removed from license_includes';
  END IF;
END $$;

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
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'license_includes') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'license_includes'
        AND c.contype = 'p'
    ) THEN
      ALTER TABLE license_includes ADD CONSTRAINT license_includes_pkey PRIMARY KEY (parent_license_type_id, child_license_type_id);
      RAISE NOTICE 'Primary key added to license_includes';
    ELSE
      RAISE NOTICE 'Primary key already exists on license_includes';
    END IF;
  END IF;
END $$;

COMMIT;

RAISE NOTICE 'Migration 20250930_fix_license_includes completed successfully';

-- End of migration
