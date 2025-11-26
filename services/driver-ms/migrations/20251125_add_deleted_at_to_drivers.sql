-- Migration: Add deleted_at column to drivers table for logical deletion
-- This migration adds the deleted_at column to support soft delete functionality

BEGIN;

-- Add deleted_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE drivers ADD COLUMN deleted_at TIMESTAMPTZ NULL;
    RAISE NOTICE 'Column deleted_at added to drivers table';
  ELSE
    RAISE NOTICE 'Column deleted_at already exists in drivers table, skipping';
  END IF;
END $$;

COMMIT;

RAISE NOTICE 'Migration 20251125_add_deleted_at_to_drivers completed successfully';

