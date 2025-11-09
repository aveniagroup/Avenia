-- Add ai_agents_enabled column to organization_settings
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS ai_agents_enabled boolean DEFAULT true;