-- Migration: Remove full_name column and dependent objects
-- This migration removes the full_name column from drivers table
-- and drops any views that depend on it.

BEGIN;

-- 1) Drop the view that depends on full_name (if exists)
DROP VIEW IF EXISTS v_active_drivers;
RAISE NOTICE 'View v_active_drivers dropped (if existed)';

-- 2) Now we can safely drop the full_name column (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE drivers DROP COLUMN full_name;
    RAISE NOTICE 'Column full_name dropped from drivers';
  ELSE
    RAISE NOTICE 'Column full_name does not exist in drivers, skipping';
  END IF;
END $$;

-- 3) Also remove columns that are no longer in the entity (if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE drivers DROP COLUMN phone_number;
    RAISE NOTICE 'Column phone_number dropped from drivers';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'email'
  ) THEN
    ALTER TABLE drivers DROP COLUMN email;
    RAISE NOTICE 'Column email dropped from drivers';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'rating'
  ) THEN
    ALTER TABLE drivers DROP COLUMN rating;
    RAISE NOTICE 'Column rating dropped from drivers';
  END IF;
END $$;

-- 4) Update the availability check constraint to match the entity enum
DO $$
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'drivers_availability_check'
  ) THEN
    ALTER TABLE drivers DROP CONSTRAINT drivers_availability_check;
    RAISE NOTICE 'Old drivers_availability_check constraint dropped';
  END IF;

  -- Add new constraint
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'drivers') THEN
    ALTER TABLE drivers ADD CONSTRAINT drivers_availability_check
      CHECK (availability IN ('AVAILABLE', 'ON_ROUTE', 'LICENSE_EXPIRED', 'INACTIVE'));
    RAISE NOTICE 'New drivers_availability_check constraint added';
  END IF;
END $$;

COMMIT;

RAISE NOTICE 'Migration 20251028_remove_full_name_column completed successfully';

-- Note: The v_active_drivers view is no longer needed as the data
-- should be fetched by joining driver_id with the user service
