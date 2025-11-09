-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
);

-- Create storage policies for ticket attachments
CREATE POLICY "Users can view attachments for tickets in their organization"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ticket-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM tickets WHERE organization_id = get_user_organization_id(auth.uid())
  )
);

CREATE POLICY "Users can upload attachments for tickets in their organization"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM tickets WHERE organization_id = get_user_organization_id(auth.uid())
  )
);

CREATE POLICY "Users can delete attachments for tickets in their organization"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ticket-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM tickets WHERE organization_id = get_user_organization_id(auth.uid())
  )
);

-- Create table for ticket attachments metadata
CREATE TABLE public.ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for attachments
CREATE POLICY "Users can view attachments for tickets in their organization"
ON public.ticket_attachments FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM tickets WHERE organization_id = get_user_organization_id(auth.uid())
  )
);

CREATE POLICY "Users can insert attachments for tickets in their organization"
ON public.ticket_attachments FOR INSERT
WITH CHECK (
  ticket_id IN (
    SELECT id FROM tickets WHERE organization_id = get_user_organization_id(auth.uid())
  )
);

CREATE POLICY "Users can delete attachments for tickets in their organization"
ON public.ticket_attachments FOR DELETE
USING (
  ticket_id IN (
    SELECT id FROM tickets WHERE organization_id = get_user_organization_id(auth.uid())
  )
);

-- Create table for saved filter presets
CREATE TABLE public.filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.filter_presets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for filter presets
CREATE POLICY "Users can manage their own filter presets"
ON public.filter_presets FOR ALL
USING (user_id = auth.uid());

-- Add index for better performance
CREATE INDEX idx_ticket_attachments_ticket_id ON public.ticket_attachments(ticket_id);
CREATE INDEX idx_filter_presets_user_id ON public.filter_presets(user_id);