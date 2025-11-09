-- Fix the ticket number generation function to properly handle UUID dashes
DROP FUNCTION IF EXISTS public.generate_ticket_number(uuid);

CREATE OR REPLACE FUNCTION public.generate_ticket_number(org_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  last_number INTEGER;
  new_number TEXT;
  lock_key BIGINT;
  uuid_hex TEXT;
BEGIN
  -- Remove dashes from UUID and take first 16 hex characters
  uuid_hex := replace(org_id::text, '-', '');
  uuid_hex := substr(uuid_hex, 1, 16);
  
  -- Convert hex string to bigint for advisory lock
  lock_key := ('x' || uuid_hex)::bit(64)::bigint;
  
  -- Acquire an advisory lock for this organization
  -- This ensures only one transaction can generate a ticket number for this org at a time
  PERFORM pg_advisory_xact_lock(lock_key);
  
  -- Get the highest ticket number for this organization
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(ticket_number FROM 'TKT-(\d+)') AS INTEGER
      )
    ),
    0
  ) INTO last_number
  FROM public.tickets
  WHERE organization_id = org_id
    AND ticket_number IS NOT NULL
    AND ticket_number ~ 'TKT-\d+';
  
  -- Generate the new ticket number
  new_number := 'TKT-' || LPAD((last_number + 1)::TEXT, 6, '0');
  
  RETURN new_number;
  
  -- The advisory lock is automatically released at the end of the transaction
END;
$$;