-- Create table for external ticket links
CREATE TABLE IF NOT EXISTS public.external_ticket_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  external_system TEXT NOT NULL,
  external_ticket_id TEXT NOT NULL,
  external_ticket_url TEXT,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_ticket_links ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view external links for tickets in their organization"
  ON public.external_ticket_links
  FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE organization_id = get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "Users can insert external links for tickets in their organization"
  ON public.external_ticket_links
  FOR INSERT
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE organization_id = get_user_organization_id(auth.uid())
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can delete external links they created"
  ON public.external_ticket_links
  FOR DELETE
  USING (
    created_by = auth.uid() OR has_role(auth.uid(), 'admin'::user_role)
  );

-- Create trigger for updated_at
CREATE TRIGGER update_external_ticket_links_updated_at
  BEFORE UPDATE ON public.external_ticket_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_external_ticket_links_ticket_id ON public.external_ticket_links(ticket_id);
CREATE INDEX idx_external_ticket_links_created_by ON public.external_ticket_links(created_by);