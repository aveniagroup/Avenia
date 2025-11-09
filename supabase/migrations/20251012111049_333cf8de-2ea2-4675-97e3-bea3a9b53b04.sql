-- Add new AI feature columns to organization_settings table
ALTER TABLE public.organization_settings
ADD COLUMN IF NOT EXISTS ai_translation_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_knowledge_base_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_summarization_enabled BOOLEAN DEFAULT false;