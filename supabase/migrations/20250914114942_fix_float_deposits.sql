-- Fix float deposits: Remove owner_id and implement automatic profit calculation

-- Drop existing policies that depend on owner_id
DROP POLICY IF EXISTS "Owners can view their float deposits" ON public.float_deposits;
DROP POLICY IF EXISTS "Owners can create their float deposits" ON public.float_deposits;
DROP POLICY IF EXISTS "Owners can update their float deposits" ON public.float_deposits;
DROP POLICY IF EXISTS "Owners can delete their float deposits" ON public.float_deposits;
DROP POLICY IF EXISTS "Admins can manage all float deposits" ON public.float_deposits;
DROP POLICY IF EXISTS "Admins can view all float deposits" ON public.float_deposits;
DROP POLICY IF EXISTS "Admins can create float deposits" ON public.float_deposits;
DROP POLICY IF EXISTS "Admins can update all float deposits" ON public.float_deposits;
DROP POLICY IF EXISTS "Admins can delete all float deposits" ON public.float_deposits;

-- Remove owner_id column
ALTER TABLE public.float_deposits DROP COLUMN IF EXISTS owner_id;

-- Update the calculation function to include automatic profit calculation
CREATE OR REPLACE FUNCTION public.compute_float_deposit_calculations()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate Sarah's total (percentage of Total KD)
  NEW.sarah_total := round((NEW.total_kd * NEW.sarah_share_percentage / 100), 2);
  
  -- Calculate Total KES ((Total KD - Transaction Fee - Sarah's Total) * Rate)
  NEW.total_kes := round((NEW.total_kd - NEW.transaction_fee - NEW.sarah_total) * NEW.rate, 2);
  
  -- Calculate profit automatically: any amount over KES 100,000 is profit
  IF NEW.total_kes > 100000 THEN
    NEW.profit := NEW.total_kes - 100000;
  ELSE
    NEW.profit := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS compute_float_deposit_calculations ON public.float_deposits;
CREATE TRIGGER compute_float_deposit_calculations
  BEFORE INSERT OR UPDATE OF total_kd, transaction_fee, sarah_share_percentage, rate ON public.float_deposits
  FOR EACH ROW EXECUTE FUNCTION public.compute_float_deposit_calculations();

-- Create new simplified policies for admins only using EXISTS to avoid multiple row errors
CREATE POLICY "Admins can manage all float deposits" 
ON public.float_deposits 
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'superadmin'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'superadmin'))
);
