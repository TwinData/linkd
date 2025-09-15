-- Final comprehensive fix for the promotions table
-- This migration consolidates all previous fixes and ensures the table works correctly

-- First, back up any existing data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'promotions'
  ) THEN
    -- Create backup table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.promotions_backup AS
    SELECT * FROM public.promotions;
    
    RAISE NOTICE 'Promotions data backed up to promotions_backup table';
  END IF;
END $$;

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.promotions;

-- Create the promotions table with the correct structure
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL, -- Include both name and title for compatibility
  description text,
  discount_type text NOT NULL DEFAULT 'percentage',
  value numeric(10,2) NOT NULL DEFAULT 10 CHECK (value > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  results text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add comments to refresh schema cache
COMMENT ON TABLE public.promotions IS 'Promotions table with all required columns';
COMMENT ON COLUMN public.promotions.id IS 'Unique identifier for the promotion';
COMMENT ON COLUMN public.promotions.name IS 'Name of the promotion';
COMMENT ON COLUMN public.promotions.title IS 'Title of the promotion (duplicate of name for compatibility)';
COMMENT ON COLUMN public.promotions.description IS 'Description of the promotion';
COMMENT ON COLUMN public.promotions.discount_type IS 'Type of discount: percentage or fixed amount';
COMMENT ON COLUMN public.promotions.value IS 'Value of the discount (percentage or fixed amount)';
COMMENT ON COLUMN public.promotions.starts_at IS 'Start date and time for the promotion';
COMMENT ON COLUMN public.promotions.ends_at IS 'End date and time for the promotion';
COMMENT ON COLUMN public.promotions.active IS 'Flag indicating if the promotion is currently active';
COMMENT ON COLUMN public.promotions.results IS 'Results and performance notes for the promotion';
COMMENT ON COLUMN public.promotions.created_at IS 'Timestamp when the promotion was created';
COMMENT ON COLUMN public.promotions.updated_at IS 'Timestamp when the promotion was last updated';

-- Create updated_at trigger
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_promotions_name ON public.promotions(name);
CREATE INDEX idx_promotions_title ON public.promotions(title);
CREATE INDEX idx_promotions_value ON public.promotions(value);
CREATE INDEX idx_promotions_active ON public.promotions(active);
CREATE INDEX idx_promotions_dates ON public.promotions(starts_at, ends_at);

-- Enable row level security
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Everyone authenticated can read promotions"
  ON public.promotions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can create promotions"
  ON public.promotions FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'superadmin');

CREATE POLICY "Only admins can update promotions"
  ON public.promotions FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'superadmin');

CREATE POLICY "Only admins can delete promotions"
  ON public.promotions FOR DELETE TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'superadmin');

-- Restore data from backup if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'promotions_backup'
  ) THEN
    -- Insert data from backup, handling both name and title fields
    INSERT INTO public.promotions (
      id, 
      name, 
      title,
      description, 
      discount_type, 
      value, 
      starts_at, 
      ends_at, 
      active, 
      results, 
      created_at, 
      updated_at
    )
    SELECT 
      b.id,
      COALESCE(b.name, b.title, 'Unnamed Promotion') AS name,
      COALESCE(b.title, b.name, 'Unnamed Promotion') AS title,
      b.description,
      COALESCE(b.discount_type, 'percentage') AS discount_type,
      COALESCE(b.value, 10) AS value,
      b.starts_at,
      b.ends_at,
      COALESCE(b.active, true) AS active,
      b.results,
      COALESCE(b.created_at, now()) AS created_at,
      COALESCE(b.updated_at, now()) AS updated_at
    FROM public.promotions_backup b
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Data restored from backup';
  END IF;
END $$;

-- Create a function to ensure name and title are synchronized
CREATE OR REPLACE FUNCTION sync_promotion_name_title()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- If name is updated but title is not, sync title to name
    IF NEW.name IS DISTINCT FROM OLD.name AND NEW.title IS NOT DISTINCT FROM OLD.title THEN
      NEW.title := NEW.name;
    -- If title is updated but name is not, sync name to title
    ELSIF NEW.title IS DISTINCT FROM OLD.title AND NEW.name IS NOT DISTINCT FROM OLD.name THEN
      NEW.name := NEW.title;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to keep name and title in sync
CREATE TRIGGER sync_promotion_name_title_trigger
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION sync_promotion_name_title();
