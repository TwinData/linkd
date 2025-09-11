-- Create settings table for per-user/workspace configuration
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  key TEXT NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, key)
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policies: owners manage their own settings
CREATE POLICY IF NOT EXISTS "Owners can read their settings"
ON public.settings
FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Owners can insert their settings"
ON public.settings
FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Owners can update their settings"
ON public.settings
FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Owners can delete their settings"
ON public.settings
FOR DELETE
USING (owner_id = auth.uid());

-- Policies: admins and superadmins can manage all settings
CREATE POLICY IF NOT EXISTS "Admins can read all settings"
ON public.settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY IF NOT EXISTS "Admins can insert settings"
ON public.settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY IF NOT EXISTS "Admins can update all settings"
ON public.settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY IF NOT EXISTS "Admins can delete all settings"
ON public.settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger to keep updated_at fresh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;