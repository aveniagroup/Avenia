-- Create ticket_data_classification table for tracking PII and sensitivity
CREATE TABLE IF NOT EXISTS public.ticket_data_classification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  contains_pii BOOLEAN NOT NULL DEFAULT false,
  pii_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  sensitivity_level TEXT CHECK (sensitivity_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
  gdpr_relevant BOOLEAN DEFAULT false,
  last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  ai_usage_consent BOOLEAN DEFAULT false,
  consent_given_at TIMESTAMPTZ,
  consent_given_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ticket_data_classification ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view classification for tickets in their organization"
  ON public.ticket_data_classification
  FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE organization_id = get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "Users can insert classification for tickets in their organization"
  ON public.ticket_data_classification
  FOR INSERT
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE organization_id = get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "Users can update classification for tickets in their organization"
  ON public.ticket_data_classification
  FOR UPDATE
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE organization_id = get_user_organization_id(auth.uid())
    )
  );

-- Add index for performance
CREATE INDEX idx_ticket_data_classification_ticket_id ON public.ticket_data_classification(ticket_id);
CREATE INDEX idx_ticket_data_classification_contains_pii ON public.ticket_data_classification(contains_pii);

-- Add new columns to organization_settings for privacy controls
ALTER TABLE public.organization_settings
ADD COLUMN IF NOT EXISTS ai_pii_detection_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ai_require_consent_for_pii BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ai_auto_anonymize BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_block_sensitive_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS gdpr_dpo_email TEXT,
ADD COLUMN IF NOT EXISTS ai_transparency_notice_url TEXT;

-- Add columns to ticket_activities for audit trail
ALTER TABLE public.ticket_activities
ADD COLUMN IF NOT EXISTS ai_processing_detected_pii BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_processing_consent_given BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_anonymized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gdpr_compliance_check JSONB;

-- Update updated_at trigger for ticket_data_classification
CREATE TRIGGER update_ticket_data_classification_updated_at
  BEFORE UPDATE ON public.ticket_data_classification
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();