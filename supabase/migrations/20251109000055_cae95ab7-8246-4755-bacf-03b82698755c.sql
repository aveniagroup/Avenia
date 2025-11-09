-- Add AI auto-execution configuration to organization_settings
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS ai_auto_execution_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_auto_execution_threshold integer DEFAULT 85;

-- Add constraint to ensure threshold is between 0 and 100
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ai_auto_execution_threshold_range'
  ) THEN
    ALTER TABLE organization_settings
    ADD CONSTRAINT ai_auto_execution_threshold_range 
    CHECK (ai_auto_execution_threshold >= 0 AND ai_auto_execution_threshold <= 100);
  END IF;
END $$;