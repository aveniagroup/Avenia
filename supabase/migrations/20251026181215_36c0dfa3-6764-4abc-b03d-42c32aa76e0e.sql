-- Create AI ticket actions table to track autonomous AI actions
CREATE TABLE public.ai_ticket_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('triage', 'resolution', 'quality')),
  action_type TEXT NOT NULL CHECK (action_type IN ('auto_response', 'priority_change', 'status_change', 'escalation', 'customer_update', 'refund_request', 'follow_up')),
  action_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score DECIMAL(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  reasoning TEXT,
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI learning feedback table for human corrections
CREATE TABLE public.ai_learning_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.ai_ticket_actions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('correction', 'approval', 'rejection')),
  original_action JSONB NOT NULL,
  corrected_action JSONB,
  feedback_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add AI-related columns to tickets table
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS ai_status TEXT CHECK (ai_status IN ('pending_analysis', 'in_progress', 'resolved', 'escalated', 'human_required')),
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(5,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
ADD COLUMN IF NOT EXISTS ai_last_action_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_resolution_attempted BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX idx_ai_ticket_actions_ticket_id ON public.ai_ticket_actions(ticket_id);
CREATE INDEX idx_ai_ticket_actions_status ON public.ai_ticket_actions(status);
CREATE INDEX idx_ai_ticket_actions_confidence ON public.ai_ticket_actions(confidence_score);
CREATE INDEX idx_ai_learning_feedback_action_id ON public.ai_learning_feedback(action_id);
CREATE INDEX idx_tickets_ai_status ON public.tickets(ai_status);

-- Enable RLS
ALTER TABLE public.ai_ticket_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_learning_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_ticket_actions
CREATE POLICY "Users can view AI actions for their org tickets"
ON public.ai_ticket_actions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ai_ticket_actions.ticket_id
    AND t.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "System can insert AI actions"
ON public.ai_ticket_actions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update AI actions for their org"
ON public.ai_ticket_actions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ai_ticket_actions.ticket_id
    AND t.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- RLS Policies for ai_learning_feedback
CREATE POLICY "Users can view learning feedback for their org"
ON public.ai_learning_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ai_ticket_actions a
    JOIN public.tickets t ON t.id = a.ticket_id
    WHERE a.id = ai_learning_feedback.action_id
    AND t.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert learning feedback"
ON public.ai_learning_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updating ai_ticket_actions updated_at
CREATE TRIGGER update_ai_ticket_actions_updated_at
BEFORE UPDATE ON public.ai_ticket_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();