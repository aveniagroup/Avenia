-- Add custom AI configuration columns to organization_settings
ALTER TABLE public.organization_settings
ADD COLUMN IF NOT EXISTS ai_provider text DEFAULT 'lovable',
ADD COLUMN IF NOT EXISTS ai_custom_endpoint text,
ADD COLUMN IF NOT EXISTS ai_custom_model text;

-- Create table for storing encrypted AI credentials
CREATE TABLE IF NOT EXISTS public.organization_ai_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  api_key_encrypted text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, provider)
);

-- Enable RLS on organization_ai_credentials
ALTER TABLE public.organization_ai_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view credentials in their organization
CREATE POLICY "Admins can view AI credentials in their organization"
ON public.organization_ai_credentials
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role) AND organization_id = get_user_organization_id(auth.uid()));

-- Policy: Only admins can insert credentials
CREATE POLICY "Admins can insert AI credentials"
ON public.organization_ai_credentials
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) AND organization_id = get_user_organization_id(auth.uid()));

-- Policy: Only admins can update credentials
CREATE POLICY "Admins can update AI credentials"
ON public.organization_ai_credentials
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role) AND organization_id = get_user_organization_id(auth.uid()));

-- Policy: Only admins can delete credentials
CREATE POLICY "Admins can delete AI credentials"
ON public.organization_ai_credentials
FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role) AND organization_id = get_user_organization_id(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_organization_ai_credentials_updated_at
BEFORE UPDATE ON public.organization_ai_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();