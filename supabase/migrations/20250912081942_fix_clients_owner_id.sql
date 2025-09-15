-- Fix the clients table by adding owner_id column if it doesn't exist

-- Check if owner_id column exists and add it if it doesn't
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'clients' 
                 AND column_name = 'owner_id') THEN
    -- Add owner_id column
    ALTER TABLE public.clients ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Set default owner_id for existing records
    DECLARE
      admin_id uuid;
    BEGIN
      -- Try to find an admin user
      SELECT user_id INTO admin_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
      
      -- If no admin found, try to find any user
      IF admin_id IS NULL THEN
        SELECT id INTO admin_id FROM auth.users LIMIT 1;
      END IF;
      
      -- Update all clients with the admin_id
      IF admin_id IS NOT NULL THEN
        UPDATE public.clients SET owner_id = admin_id;
      END IF;
    END;
  ELSE
    -- If column exists, make it nullable
    ALTER TABLE public.clients ALTER COLUMN owner_id DROP NOT NULL;
  END IF;
END $$;

-- Add a trigger to automatically set owner_id from auth.uid() when it's NULL
CREATE OR REPLACE FUNCTION public.set_owner_id_if_null()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add the trigger to the clients table
DROP TRIGGER IF EXISTS set_owner_id_on_clients_insert ON public.clients;
CREATE TRIGGER set_owner_id_on_clients_insert
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_owner_id_if_null();

-- Refresh the schema cache to ensure it recognizes the owner_id column
NOTIFY pgrst, 'reload schema';
