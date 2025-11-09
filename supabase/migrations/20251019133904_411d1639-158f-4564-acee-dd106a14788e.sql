-- Fix ticket number generation to prevent duplicates
CREATE OR REPLACE FUNCTION public.generate_ticket_number(org_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  last_number INTEGER;
  new_number TEXT;
BEGIN
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
  FOR UPDATE; -- Lock to prevent race conditions
  
  new_number := 'TKT-' || LPAD((last_number + 1)::TEXT, 6, '0');
  RETURN new_number;
END;
$function$;