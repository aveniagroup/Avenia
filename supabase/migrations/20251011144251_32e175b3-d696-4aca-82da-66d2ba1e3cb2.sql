-- Create ticket_activities table for tracking all ticket-related activities
CREATE TABLE public.ticket_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'note', 'status_change', 'priority_change', 'assignment', 'forward', 'closed', 'reopened'
  content TEXT, -- For notes, or description of the change
  old_value TEXT, -- For tracking what changed (e.g., old status)
  new_value TEXT, -- For tracking what changed (e.g., new status)
  created_by UUID REFERENCES public.profiles(id),
  created_by_name TEXT,
  created_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX idx_ticket_activities_ticket_id ON public.ticket_activities(ticket_id);
CREATE INDEX idx_ticket_activities_created_at ON public.ticket_activities(created_at DESC);

-- Enable RLS
ALTER TABLE public.ticket_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view activities for tickets in their organization"
  ON public.ticket_activities FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets 
      WHERE organization_id = get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "Users can insert activities for tickets in their organization"
  ON public.ticket_activities FOR INSERT
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.tickets 
      WHERE organization_id = get_user_organization_id(auth.uid())
    )
  );