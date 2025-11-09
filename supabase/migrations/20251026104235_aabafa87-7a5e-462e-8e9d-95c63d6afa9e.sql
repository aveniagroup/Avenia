-- Create enum for data subject request types
CREATE TYPE dsr_type AS ENUM ('export', 'deletion', 'rectification', 'restriction');

-- Create enum for DSR status
CREATE TYPE dsr_status AS ENUM ('pending', 'processing', 'completed', 'rejected');

-- Create enum for consent types
CREATE TYPE consent_type AS ENUM ('data_processing', 'marketing', 'analytics', 'ai_processing', 'third_party_sharing');

-- Table for data subject requests
CREATE TABLE public.data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  requester_email TEXT NOT NULL,
  requester_name TEXT,
  request_type dsr_type NOT NULL,
  status dsr_status NOT NULL DEFAULT 'pending',
  description TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  verification_token TEXT,
  verification_expires_at TIMESTAMP WITH TIME ZONE,
  export_file_path TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for consent records
CREATE TABLE public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  customer_email TEXT,
  consent_type consent_type NOT NULL,
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  source TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for retention policies
CREATE TABLE public.retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL,
  retention_days INTEGER NOT NULL,
  auto_delete BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, resource_type)
);

-- Table for compliance certifications
CREATE TABLE public.compliance_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  certification_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  certificate_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, certification_type)
);

-- Enable RLS
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_certifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data_subject_requests
CREATE POLICY "Admins can view DSRs in their organization"
  ON public.data_subject_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role) AND organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can insert DSRs"
  ON public.data_subject_requests FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role) AND organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can update DSRs in their organization"
  ON public.data_subject_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::user_role) AND organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "System can insert DSRs"
  ON public.data_subject_requests FOR INSERT
  WITH CHECK (true);

-- RLS Policies for consent_records
CREATE POLICY "Users can view consents in their organization"
  ON public.consent_records FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can insert consent records"
  ON public.consent_records FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can update consent records"
  ON public.consent_records FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::user_role) AND organization_id = get_user_organization_id(auth.uid()));

-- RLS Policies for retention_policies
CREATE POLICY "Admins can manage retention policies"
  ON public.retention_policies FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role) AND organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can view retention policies in their organization"
  ON public.retention_policies FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

-- RLS Policies for compliance_certifications
CREATE POLICY "Admins can manage certifications"
  ON public.compliance_certifications FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role) AND organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can view certifications in their organization"
  ON public.compliance_certifications FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_data_subject_requests_updated_at
  BEFORE UPDATE ON public.data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_consent_records_updated_at
  BEFORE UPDATE ON public.consent_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_retention_policies_updated_at
  BEFORE UPDATE ON public.retention_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_compliance_certifications_updated_at
  BEFORE UPDATE ON public.compliance_certifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to apply retention policies
CREATE OR REPLACE FUNCTION apply_retention_policies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy_record RECORD;
  deleted_count INTEGER;
BEGIN
  FOR policy_record IN 
    SELECT * FROM retention_policies 
    WHERE is_active = true AND auto_delete = true
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
      'retention_policy_applied',
      policy_record.resource_type,
      jsonb_build_object(
        'policy_id', policy_record.id,
        'policy_name', policy_record.name,
        'deleted_count', deleted_count,
        'retention_days', policy_record.retention_days
      ),
      'info'
    );
  END LOOP;
END;
$$;