-- Add new columns to transactions for UI needs from the provided spec
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS transaction_fee_kes numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS payout_kes numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS agent_share_kd numeric NOT NULL DEFAULT 0;

-- Helpful index for lookups by client
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON public.transactions (client_id);

-- Ensure amount_kes is computed automatically (function exists already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'transactions_compute_amount_kes'
  ) THEN
    CREATE TRIGGER transactions_compute_amount_kes
    BEFORE INSERT OR UPDATE OF amount_kd, rate_kes_per_kd
    ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.compute_amount_kes();
  END IF;
END $$;

-- Create function to compute payout_kes
CREATE OR REPLACE FUNCTION public.compute_payout_kes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.payout_kes := round(coalesce(NEW.amount_kd, 0) * coalesce(NEW.rate_kes_per_kd, 0) - coalesce(NEW.transaction_fee_kes, 0), 2);
  RETURN NEW;
END;
$$;

-- Trigger to compute payout_kes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'transactions_compute_payout_kes'
  ) THEN
    CREATE TRIGGER transactions_compute_payout_kes
    BEFORE INSERT OR UPDATE OF amount_kd, rate_kes_per_kd, transaction_fee_kes
    ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.compute_payout_kes();
  END IF;
END $$;

-- Keep updated_at fresh on updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_transactions_updated_at'
  ) THEN
    CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;