-- Create a stored procedure to handle client creation
CREATE OR REPLACE FUNCTION public.create_client(
  p_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
) RETURNS SETOF public.clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_owner_id BOOLEAN;
BEGIN
  -- Check if owner_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'owner_id'
  ) INTO has_owner_id;
  
  IF has_owner_id THEN
    -- If owner_id column exists, include it in the insert
    RETURN QUERY
    INSERT INTO public.clients (
      name,
      phone,
      email,
      owner_id
    ) VALUES (
      p_name,
      p_phone,
      p_email,
      auth.uid()
    )
    RETURNING *;
  ELSE
    -- If owner_id column doesn't exist, insert without it
    RETURN QUERY
    INSERT INTO public.clients (
      name,
      phone,
      email
    ) VALUES (
      p_name,
      p_phone,
      p_email
    )
    RETURNING *;
  END IF;
END;
$$;
