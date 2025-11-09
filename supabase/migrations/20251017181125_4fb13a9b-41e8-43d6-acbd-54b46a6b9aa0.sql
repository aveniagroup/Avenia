-- Add template suggestions feature flag to organization settings
ALTER TABLE public.organization_settings
ADD COLUMN ai_template_suggestions_enabled boolean DEFAULT false;

-- Create response templates table
CREATE TABLE public.response_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  name text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  tags text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on response_templates
ALTER TABLE public.response_templates ENABLE ROW LEVEL SECURITY;

-- Users can view templates in their organization
CREATE POLICY "Users can view templates in their organization"
ON public.response_templates
FOR SELECT
USING (organization_id = get_user_organization_id(auth.uid()));

-- Admins can manage templates
CREATE POLICY "Admins can manage templates"
ON public.response_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create template usage tracking table
CREATE TABLE public.template_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL,
  ticket_id uuid NOT NULL,
  used_by uuid,
  used_at timestamp with time zone DEFAULT now(),
  was_modified boolean DEFAULT false,
  effectiveness_score integer CHECK (effectiveness_score >= 1 AND effectiveness_score <= 5)
);

-- Enable RLS on template_usage
ALTER TABLE public.template_usage ENABLE ROW LEVEL SECURITY;

-- Users can insert usage records for their organization's tickets
CREATE POLICY "Users can insert template usage for their tickets"
ON public.template_usage
FOR INSERT
WITH CHECK (ticket_id IN (
  SELECT id FROM tickets WHERE organization_id = get_user_organization_id(auth.uid())
));

-- Users can view usage records for their organization's tickets
CREATE POLICY "Users can view template usage for their tickets"
ON public.template_usage
FOR SELECT
USING (ticket_id IN (
  SELECT id FROM tickets WHERE organization_id = get_user_organization_id(auth.uid())
));

-- Create trigger for template updated_at
CREATE TRIGGER update_response_templates_updated_at
BEFORE UPDATE ON public.response_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create index for faster template lookups
CREATE INDEX idx_response_templates_organization ON public.response_templates(organization_id);
CREATE INDEX idx_response_templates_category ON public.response_templates(category);
CREATE INDEX idx_template_usage_template ON public.template_usage(template_id);
CREATE INDEX idx_template_usage_ticket ON public.template_usage(ticket_id);