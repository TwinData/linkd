-- Fix transactions table if it doesn't exist
DO $$
BEGIN
  -- Check if transaction_status enum exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
    CREATE TYPE public.transaction_status AS ENUM ('pending', 'verified', 'paid', 'rejected');
  END IF;

  -- Check if transactions table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
    CREATE TABLE IF NOT EXISTS public.transactions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
      amount_kd numeric(12,3) NOT NULL CHECK (amount_kd > 0),
      rate_kes_per_kd numeric(12,3) NOT NULL CHECK (rate_kes_per_kd > 0),
      amount_kes numeric(14,2) NOT NULL,
      type text,
      transaction_fee_kes numeric(10,2) DEFAULT 0,
      payout_kes numeric(14,2),
      screenshot_url text,
      status public.transaction_status NOT NULL DEFAULT 'pending',
      reference text UNIQUE,
      paid_at timestamptz,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    -- Add RLS policies
    ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Owners can read their transactions"
      ON public.transactions FOR SELECT TO authenticated
      USING (owner_id = auth.uid());

    CREATE POLICY "Owners can insert transactions"
      ON public.transactions FOR INSERT TO authenticated
      WITH CHECK (owner_id = auth.uid());

    CREATE POLICY "Owners can update their transactions"
      ON public.transactions FOR UPDATE TO authenticated
      USING (owner_id = auth.uid());

    CREATE POLICY "Owners can delete their transactions"
      ON public.transactions FOR DELETE TO authenticated
      USING (owner_id = auth.uid());

    CREATE POLICY "Admins can read all transactions"
      ON public.transactions FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

    CREATE POLICY "Admins can insert transactions"
      ON public.transactions FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

    CREATE POLICY "Admins can update all transactions"
      ON public.transactions FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

    CREATE POLICY "Admins can delete all transactions"
      ON public.transactions FOR DELETE TO authenticated
      USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));
  ELSE
    -- If table exists but missing columns, add them
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'type') THEN
      ALTER TABLE public.transactions ADD COLUMN type text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'transaction_fee_kes') THEN
      ALTER TABLE public.transactions ADD COLUMN transaction_fee_kes numeric(10,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'payout_kes') THEN
      ALTER TABLE public.transactions ADD COLUMN payout_kes numeric(14,2);
    END IF;
  END IF;
END $$;
