-- Remove agent_share_kd column from transactions table
ALTER TABLE public.transactions DROP COLUMN IF EXISTS agent_share_kd;

-- Update the compute_payout_kes function to remove agent share calculation
CREATE OR REPLACE FUNCTION public.compute_payout_kes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.payout_kes := round(coalesce(NEW.amount_kd, 0) * coalesce(NEW.rate_kes_per_kd, 0) - coalesce(NEW.transaction_fee_kes, 0), 2);
  RETURN NEW;
END;
$function$;