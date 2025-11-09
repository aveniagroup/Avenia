-- Create template_categories table
CREATE TABLE public.template_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Enable RLS
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view categories in their organization"
  ON public.template_categories
  FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can manage categories"
  ON public.template_categories
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Trigger for updated_at
CREATE TRIGGER update_template_categories_updated_at
  BEFORE UPDATE ON public.template_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default categories for existing organizations
INSERT INTO public.template_categories (organization_id, name)
SELECT o.id, category_name
FROM public.organizations o
CROSS JOIN unnest(ARRAY['general', 'welcome', 'follow-up', 'resolution', 'apology', 'technical']) AS category_name;