-- Fix transaction_charges table schema and policies
-- This migration ensures the table has the correct structure and policies

-- First, check if the transaction_charges table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'transaction_charges'
  ) THEN
    -- Backup existing data if any
    CREATE TABLE IF NOT EXISTS public.transaction_charges_backup AS
    SELECT * FROM public.transaction_charges;
    
    -- Drop existing table
    DROP TABLE public.transaction_charges;
    
    RAISE NOTICE 'Transaction charges table was rebuilt. Old data backed up in transaction_charges_backup.';
  END IF;
END $$;

-- Create the transaction_charges table with the correct structure
CREATE TABLE public.transaction_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_amount NUMERIC NOT NULL,
  max_amount NUMERIC NOT NULL,
  charge_amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'mpesa_send',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments to refresh schema cache
COMMENT ON TABLE public.transaction_charges IS 'Transaction charges for different payment methods';
COMMENT ON COLUMN public.transaction_charges.id IS 'Unique identifier for the transaction charge';
COMMENT ON COLUMN public.transaction_charges.min_amount IS 'Minimum amount for this charge bracket';
COMMENT ON COLUMN public.transaction_charges.max_amount IS 'Maximum amount for this charge bracket';
COMMENT ON COLUMN public.transaction_charges.charge_amount IS 'Fee amount to charge for this bracket';
COMMENT ON COLUMN public.transaction_charges.transaction_type IS 'Type of transaction (mpesa_send or paybill)';

-- Create updated_at trigger
CREATE TRIGGER update_transaction_charges_updated_at
  BEFORE UPDATE ON public.transaction_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_transaction_charges_type_amount 
ON public.transaction_charges(transaction_type, min_amount, max_amount);

-- Enable row level security
ALTER TABLE public.transaction_charges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can read transaction charges" ON public.transaction_charges;
DROP POLICY IF EXISTS "Only admins can insert transaction charges" ON public.transaction_charges;
DROP POLICY IF EXISTS "Only admins can update transaction charges" ON public.transaction_charges;
DROP POLICY IF EXISTS "Only admins can delete transaction charges" ON public.transaction_charges;

-- Create RLS policies using text comparison instead of enum casting
CREATE POLICY "Everyone can read transaction charges"
ON public.transaction_charges
FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert transaction charges"
ON public.transaction_charges
FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'superadmin');

CREATE POLICY "Only admins can update transaction charges"
ON public.transaction_charges
FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'superadmin');

CREATE POLICY "Only admins can delete transaction charges"
ON public.transaction_charges
FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'superadmin');

-- Insert MPESA Send Money rates
INSERT INTO public.transaction_charges (min_amount, max_amount, charge_amount, transaction_type) VALUES
(1, 49, 0, 'mpesa_send'),
(50, 100, 0, 'mpesa_send'),
(101, 500, 7, 'mpesa_send'),
(501, 1000, 13, 'mpesa_send'),
(1001, 1500, 23, 'mpesa_send'),
(1501, 2500, 33, 'mpesa_send'),
(2501, 3500, 53, 'mpesa_send'),
(3501, 5000, 57, 'mpesa_send'),
(5001, 7500, 78, 'mpesa_send'),
(7501, 10000, 90, 'mpesa_send'),
(10001, 15000, 100, 'mpesa_send'),
(15001, 20000, 105, 'mpesa_send'),
(20001, 25000, 108, 'mpesa_send'),
(25001, 30000, 108, 'mpesa_send'),
(30001, 35000, 108, 'mpesa_send'),
(35001, 45000, 108, 'mpesa_send'),
(45001, 50000, 108, 'mpesa_send'),
(50001, 70000, 108, 'mpesa_send'),
(70001, 100000, 108, 'mpesa_send');

-- Insert Paybill rates
INSERT INTO public.transaction_charges (min_amount, max_amount, charge_amount, transaction_type) VALUES
(1, 49, 0, 'paybill'),
(50, 100, 0, 'paybill'),
(101, 500, 5, 'paybill'),
(501, 1000, 10, 'paybill'),
(1001, 1500, 15, 'paybill'),
(1501, 2500, 20, 'paybill'),
(2501, 3500, 25, 'paybill'),
(3501, 5000, 34, 'paybill'),
(5001, 7500, 42, 'paybill'),
(7501, 10000, 48, 'paybill'),
(10001, 15000, 57, 'paybill'),
(15001, 20000, 62, 'paybill'),
(20001, 25000, 67, 'paybill'),
(25001, 30000, 72, 'paybill'),
(30001, 35000, 83, 'paybill'),
(35001, 45000, 99, 'paybill'),
(45001, 50000, 103, 'paybill'),
(50001, 70000, 108, 'paybill'),
(70001, 100000, 108, 'paybill');
