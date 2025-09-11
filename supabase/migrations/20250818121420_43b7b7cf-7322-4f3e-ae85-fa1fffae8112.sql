-- Create transaction_charges table for M-Pesa tariff rates
CREATE TABLE public.transaction_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_amount NUMERIC NOT NULL,
  max_amount NUMERIC NOT NULL,
  charge_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transaction_charges ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read transaction charges (needed for calculations)
CREATE POLICY "Everyone can read transaction charges"
ON public.transaction_charges
FOR SELECT
USING (true);

-- Only admins can manage transaction charges
CREATE POLICY "Only admins can insert transaction charges"
ON public.transaction_charges
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Only admins can update transaction charges"
ON public.transaction_charges
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Only admins can delete transaction charges"
ON public.transaction_charges
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_transaction_charges_updated_at
BEFORE UPDATE ON public.transaction_charges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert M-Pesa tariff data based on Safaricom rates
INSERT INTO public.transaction_charges (min_amount, max_amount, charge_amount) VALUES
(1, 49, 0),
(50, 100, 0),
(101, 500, 7),
(501, 1000, 13),
(1001, 1500, 23),
(1501, 2500, 33),
(2501, 3500, 53),
(3501, 5000, 57),
(5001, 7500, 78),
(7501, 10000, 90),
(10001, 15000, 100),
(15001, 20000, 105),
(20001, 35000, 108),
(35001, 50000, 110),
(50001, 150000, 110);