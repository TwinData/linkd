-- Fix for the 'active' column in promotions table
-- This migration ensures the column exists and refreshes the schema cache

-- First, check if the column exists and add it if it doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'promotions'
    AND column_name = 'active'
  ) THEN
    ALTER TABLE public.promotions ADD COLUMN active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Refresh the schema cache for the promotions table
COMMENT ON TABLE public.promotions IS 'Promotions table with active column';

-- Update the column comment to force a schema refresh
COMMENT ON COLUMN public.promotions.active IS 'Flag indicating if the promotion is currently active';

-- Create an index on the active column for better performance
CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions(active);
