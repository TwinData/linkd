-- Complete fix for transactions table and client relationships

-- Ensure transaction_status enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
    CREATE TYPE public.transaction_status AS ENUM ('pending', 'verified', 'paid', 'rejected');
  END IF;
END $$;

-- Instead of modifying the enum, we'll use text comparison in the policies

-- Drop and recreate transactions table to ensure correct schema
DROP TABLE IF EXISTS public.transactions CASCADE;

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount_kd numeric(12,3) NOT NULL CHECK (amount_kd > 0),
  rate_kes_per_kd numeric(12,3) NOT NULL CHECK (rate_kes_per_kd > 0),
  amount_kes numeric(14,2) NOT NULL,
  type text DEFAULT 'M-PESA Send Money',
  transaction_fee_kes numeric(10,2) DEFAULT 0,
  payout_kes numeric(14,2),
  screenshot_url text,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  reference text,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create amount calculation trigger
CREATE OR REPLACE FUNCTION public.compute_amount_kes()
RETURNS TRIGGER AS $$
BEGIN
  -- amount_kes is the total amount in KES (Link Amount * Rate)
  NEW.amount_kes := ROUND(NEW.amount_kd * NEW.rate_kes_per_kd, 2);
  
  -- payout_kes is the amount plus transaction fee (amount_kes + fee)
  NEW.payout_kes := NEW.amount_kes + COALESCE(NEW.transaction_fee_kes, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compute_transactions_amount
  BEFORE INSERT OR UPDATE OF amount_kd, rate_kes_per_kd, transaction_fee_kes ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.compute_amount_kes();

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own transactions"
  ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own transactions"
  ON public.transactions FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own transactions"
  ON public.transactions FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Admin policies using the has_role function with text comparison instead of enum casting
CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (
    (SELECT role::text = 'admin' FROM public.user_roles WHERE user_id = auth.uid()) OR
    (SELECT role::text = 'superadmin' FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can insert all transactions"
  ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role::text = 'admin' FROM public.user_roles WHERE user_id = auth.uid()) OR
    (SELECT role::text = 'superadmin' FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update all transactions"
  ON public.transactions FOR UPDATE TO authenticated
  USING (
    (SELECT role::text = 'admin' FROM public.user_roles WHERE user_id = auth.uid()) OR
    (SELECT role::text = 'superadmin' FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can delete all transactions"
  ON public.transactions FOR DELETE TO authenticated
  USING (
    (SELECT role::text = 'admin' FROM public.user_roles WHERE user_id = auth.uid()) OR
    (SELECT role::text = 'superadmin' FROM public.user_roles WHERE user_id = auth.uid())
  );

-- Create indexes for better performance
CREATE INDEX idx_transactions_client_id ON public.transactions(client_id);
CREATE INDEX idx_transactions_owner_id ON public.transactions(owner_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_status ON public.transactions(status);

-- Create a view for client transaction summaries
CREATE OR REPLACE VIEW public.client_transaction_summary AS
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.phone,
  c.email,
  COUNT(t.id) as transaction_count,
  COALESCE(SUM(t.amount_kd), 0) as total_amount_kd,
  COALESCE(SUM(t.payout_kes), 0) as total_payout_kes,
  MAX(t.created_at) as latest_transaction_date,
  (
    SELECT t2.type 
    FROM public.transactions t2 
    WHERE t2.client_id = c.id 
    ORDER BY t2.created_at DESC 
    LIMIT 1
  ) as latest_transaction_type,
  (
    SELECT t2.amount_kd 
    FROM public.transactions t2 
    WHERE t2.client_id = c.id 
    ORDER BY t2.created_at DESC 
    LIMIT 1
  ) as latest_transaction_amount_kd,
  (
    SELECT t2.payout_kes 
    FROM public.transactions t2 
    WHERE t2.client_id = c.id 
    ORDER BY t2.created_at DESC 
    LIMIT 1
  ) as latest_transaction_payout_kes
FROM public.clients c
LEFT JOIN public.transactions t ON c.id = t.client_id
GROUP BY c.id, c.name, c.phone, c.email;

-- Grant permissions on the view
GRANT SELECT ON public.client_transaction_summary TO authenticated;
