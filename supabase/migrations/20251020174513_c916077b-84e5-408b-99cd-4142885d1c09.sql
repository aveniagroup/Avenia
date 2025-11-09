-- Make ticket_number nullable so the trigger can set it automatically
-- The trigger will always set it before the row is inserted, so it will never actually be NULL in the final data
ALTER TABLE public.tickets ALTER COLUMN ticket_number DROP NOT NULL;