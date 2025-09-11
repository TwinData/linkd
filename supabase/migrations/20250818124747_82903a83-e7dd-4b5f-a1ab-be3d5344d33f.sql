-- Create float_deposits table
CREATE TABLE public.float_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_kd NUMERIC NOT NULL,
  transaction_fee NUMERIC NOT NULL DEFAULT 0,
  sarah_share_percentage NUMERIC NOT NULL DEFAULT 0,
  sarah_total NUMERIC NOT NULL DEFAULT 0,
  total_kes NUMERIC NOT NULL DEFAULT 0,
  rate NUMERIC NOT NULL,
  profit NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.float_deposits ENABLE ROW LEVEL SECURITY;

-- Create policies for owners
CREATE POLICY "Owners can view their float deposits" 
ON public.float_deposits 
FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "Owners can create their float deposits" 
ON public.float_deposits 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their float deposits" 
ON public.float_deposits 
FOR UPDATE 
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their float deposits" 
ON public.float_deposits 
FOR DELETE 
USING (owner_id = auth.uid());

-- Create policies for admins
CREATE POLICY "Admins can view all float deposits" 
ON public.float_deposits 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can create float deposits" 
ON public.float_deposits 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can update all float deposits" 
ON public.float_deposits 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can delete all float deposits" 
ON public.float_deposits 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Create function to compute Sarah's total and Total KES
CREATE OR REPLACE FUNCTION public.compute_float_deposit_calculations()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate Sarah's total (percentage of Total KD)
  NEW.sarah_total := round((NEW.total_kd * NEW.sarah_share_percentage / 100), 2);
  
  -- Calculate Total KES ((Total KD - Sarah's Total) * Rate)
  NEW.total_kes := round((NEW.total_kd - NEW.sarah_total) * NEW.rate, 2);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic calculations
CREATE TRIGGER compute_float_deposit_calculations_trigger
BEFORE INSERT OR UPDATE ON public.float_deposits
FOR EACH ROW
EXECUTE FUNCTION public.compute_float_deposit_calculations();

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_float_deposits_updated_at
BEFORE UPDATE ON public.float_deposits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();