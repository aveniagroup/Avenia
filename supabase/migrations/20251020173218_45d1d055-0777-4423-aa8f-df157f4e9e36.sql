-- Drop the existing ticket number generation function
DROP FUNCTION IF EXISTS public.generate_ticket_number(uuid);

-- Create an improved version that uses a sequence per organization
CREATE OR REPLACE FUNCTION public.generate_ticket_number(org_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  last_number INTEGER;
  new_number TEXT;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  LOOP
    -- Get the highest ticket number for this organization with a lock
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
      AND ticket_number ~ 'TKT-\d+'
    FOR UPDATE;
    
    new_number := 'TKT-' || LPAD((last_number + 1)::TEXT, 6, '0');
    
    -- Try to verify this number doesn't exist (additional safety check)
    IF NOT EXISTS (
      SELECT 1 FROM public.tickets 
      WHERE organization_id = org_id 
      AND ticket_number = new_number
    ) THEN
      RETURN new_number;
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique ticket number after % attempts', max_attempts;
    END IF;
    
    -- Small delay before retry
    PERFORM pg_sleep(0.01);
  END LOOP;
END;
$$;