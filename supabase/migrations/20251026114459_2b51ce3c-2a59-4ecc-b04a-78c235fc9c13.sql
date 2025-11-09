-- Drop the existing function
DROP FUNCTION IF EXISTS public.apply_retention_policies();

-- Create updated function with manual execution parameter
CREATE OR REPLACE FUNCTION public.apply_retention_policies(manual_execution boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  policy_record RECORD;
  deleted_count INTEGER;
BEGIN
  FOR policy_record IN 
    SELECT * FROM retention_policies 
    WHERE is_active = true 
      AND (manual_execution = true OR auto_delete = true)
  LOOP
    -- Apply retention policy based on resource type
    IF policy_record.resource_type = 'tickets' THEN
      DELETE FROM tickets
      WHERE organization_id = policy_record.organization_id
        AND created_at < NOW() - (policy_record.retention_days || ' days')::INTERVAL
        AND status IN ('closed', 'resolved');
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      
    ELSIF policy_record.resource_type = 'audit_logs' THEN
      DELETE FROM audit_logs
      WHERE organization_id = policy_record.organization_id
        AND created_at < NOW() - (policy_record.retention_days || ' days')::INTERVAL;
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      
    ELSIF policy_record.resource_type = 'ticket_attachments' THEN
      DELETE FROM ticket_attachments
      WHERE ticket_id IN (
        SELECT id FROM tickets 
        WHERE organization_id = policy_record.organization_id
      )
      AND created_at < NOW() - (policy_record.retention_days || ' days')::INTERVAL;
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
    END IF;
    
    -- Update last run timestamp
    UPDATE retention_policies
    SET last_run_at = NOW()
    WHERE id = policy_record.id;
    
    -- Log the retention policy execution
    INSERT INTO audit_logs (
      organization_id,
      action,
      resource_type,
      details,
      severity
    ) VALUES (
      policy_record.organization_id,
      CASE WHEN manual_execution THEN 'retention_policy_manual_run' ELSE 'retention_policy_applied' END,
      policy_record.resource_type,
      jsonb_build_object(
        'policy_id', policy_record.id,
        'policy_name', policy_record.name,
        'deleted_count', deleted_count,
        'retention_days', policy_record.retention_days,
        'manual_execution', manual_execution
      ),
      'info'
    );
  END LOOP;
END;
$$;