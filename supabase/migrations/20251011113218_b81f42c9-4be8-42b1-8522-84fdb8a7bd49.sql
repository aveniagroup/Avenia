-- Add AI feature settings to organization_settings table
ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS ai_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_auto_suggest_responses boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_sentiment_analysis boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_priority_suggestions boolean DEFAULT false;