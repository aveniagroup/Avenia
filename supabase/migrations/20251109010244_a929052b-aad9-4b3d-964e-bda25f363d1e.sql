-- Add ai_auto_execution_actions column to organization_settings
ALTER TABLE public.organization_settings
ADD COLUMN ai_auto_execution_actions jsonb DEFAULT jsonb_build_object(
  'respondToCustomers', true,
  'updateStatus', true,
  'changePriority', true,
  'sendUpdates', true,
  'logEscalations', true,
  'scheduleFollowUps', true
);