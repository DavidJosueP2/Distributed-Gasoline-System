-- Migration: Remove full_name column and dependent objects
-- This migration removes the full_name column from drivers table
-- and drops any views that depend on it.

BEGIN;

-- 1) Drop the view that depends on full_name
DROP VIEW IF EXISTS v_active_drivers;

-- 2) Now we can safely drop the full_name column
ALTER TABLE drivers DROP COLUMN IF EXISTS full_name;

-- 3) Also remove columns that are no longer in the entity
ALTER TABLE drivers DROP COLUMN IF EXISTS phone_number;
ALTER TABLE drivers DROP COLUMN IF EXISTS email;
ALTER TABLE drivers DROP COLUMN IF EXISTS rating;

-- 4) Update the availability check constraint to match the entity enum
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_availability_check;
ALTER TABLE drivers ADD CONSTRAINT drivers_availability_check 
  CHECK (availability IN ('AVAILABLE', 'ON_ROUTE', 'LICENSE_EXPIRED', 'INACTIVE'));

COMMIT;

-- Note: The v_active_drivers view is no longer needed as the data
-- should be fetched by joining driver_id with the user service

