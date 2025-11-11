-- Migration: Migrate housing_buildings from DOB to DCP Housing Database
-- This adds all new DCP Housing Database fields and removes old DOB-specific fields

BEGIN;

-- ============================================================================
-- HOUSING BUILDINGS TABLE MIGRATION
-- ============================================================================

-- Add DCP Housing Database core fields
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS job_number TEXT;
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS job_type TEXT;
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS job_status TEXT;
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS job_description TEXT;

-- Add DCP geography fields (comprehensive coverage)
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS community_district TEXT;
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS council_district TEXT;
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS census_tract_2020 TEXT;
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS nta_2020 TEXT;
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS nta_name_2020 TEXT;

-- Add DCP completion/permit dates
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS permit_year INTEGER;
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS permit_date TEXT;

-- Add DCP unit count fields
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS class_a_init INTEGER;
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS class_a_prop INTEGER;
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS class_a_net INTEGER;
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS units_co INTEGER;

-- Add DCP building details
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS floors_init REAL;
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS floors_prop REAL;
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS ownership TEXT;

-- Add additional zoning districts
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS zoning_district_1 TEXT;
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS zoning_district_2 TEXT;
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS zoning_district_3 TEXT;

-- Add affordable overlay tracking
ALTER TABLE housing_buildings ADD COLUMN IF NOT EXISTS has_affordable_overlay BOOLEAN DEFAULT FALSE;

-- Rename Housing NY specific fields (only if old columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'housing_buildings' AND column_name = 'project_id') THEN
    ALTER TABLE housing_buildings RENAME COLUMN project_id TO housing_ny_project_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'housing_buildings' AND column_name = 'project_name') THEN
    ALTER TABLE housing_buildings RENAME COLUMN project_name TO housing_ny_project_name;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'housing_buildings' AND column_name = 'construction_type') THEN
    ALTER TABLE housing_buildings RENAME COLUMN construction_type TO housing_ny_construction_type;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'housing_buildings' AND column_name = 'extended_affordability_only') THEN
    ALTER TABLE housing_buildings RENAME COLUMN extended_affordability_only TO housing_ny_extended_affordability_only;
  END IF;
END $$;

-- Drop old fields that are no longer used
ALTER TABLE housing_buildings DROP COLUMN IF EXISTS postcode;
ALTER TABLE housing_buildings DROP COLUMN IF EXISTS community_board;
ALTER TABLE housing_buildings DROP COLUMN IF EXISTS census_tract;
ALTER TABLE housing_buildings DROP COLUMN IF EXISTS nta;
ALTER TABLE housing_buildings DROP COLUMN IF EXISTS completion_month;
ALTER TABLE housing_buildings DROP COLUMN IF EXISTS zoning_district;
ALTER TABLE housing_buildings DROP COLUMN IF EXISTS is_renovation;
ALTER TABLE housing_buildings DROP COLUMN IF EXISTS prevailing_wage_status;

-- Update constraints on new required fields
-- Note: We'll set these in the seed script, but make job_number unique if it exists
CREATE UNIQUE INDEX IF NOT EXISTS housing_job_number_idx ON housing_buildings(job_number) WHERE job_number IS NOT NULL;

-- Update indexes for new fields
CREATE INDEX IF NOT EXISTS housing_job_type_idx ON housing_buildings(job_type);
CREATE INDEX IF NOT EXISTS housing_has_affordable_overlay_idx ON housing_buildings(has_affordable_overlay);

-- ============================================================================
-- HOUSING DEMOLITIONS TABLE MIGRATION
-- ============================================================================

-- Add DCP Housing Database core fields
ALTER TABLE housing_demolitions ADD COLUMN IF NOT EXISTS job_number TEXT;
ALTER TABLE housing_demolitions ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'Demolition';
ALTER TABLE housing_demolitions ADD COLUMN IF NOT EXISTS job_status TEXT;
ALTER TABLE housing_demolitions ADD COLUMN IF NOT EXISTS job_description TEXT;

-- Add DCP unit fields
ALTER TABLE housing_demolitions ADD COLUMN IF NOT EXISTS class_a_init INTEGER;
ALTER TABLE housing_demolitions ADD COLUMN IF NOT EXISTS class_a_net INTEGER;

-- Drop old fields
ALTER TABLE housing_demolitions DROP COLUMN IF EXISTS demolition_month;

-- Update constraints
CREATE UNIQUE INDEX IF NOT EXISTS demolition_job_number_idx ON housing_demolitions(job_number) WHERE job_number IS NOT NULL;

-- ============================================================================
-- DATA CLEANUP (Optional - will be overwritten by seed script)
-- ============================================================================

-- You can truncate the tables to start fresh with DCP data
-- TRUNCATE housing_buildings, housing_demolitions;

COMMIT;
