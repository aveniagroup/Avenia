-- Fix ticket number generation to work with aggregate functions
CREATE OR REPLACE FUNCTION public.generate_ticket_number(org_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  last_number INTEGER;
  new_number TEXT;
BEGIN
  -- Lock the organization to prevent race conditions
  PERFORM 1 FROM public.organizations WHERE id = org_id FOR UPDATE;
  
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
  
  new_number := 'TKT-' || LPAD((last_number + 1)::TEXT, 6, '0');
  RETURN new_number;
END;
$function$;

-- Update any tickets with missing ticket numbers
UPDATE tickets 
SET ticket_number = generate_ticket_number(organization_id) 
WHERE ticket_number IS NULL OR ticket_number = '';