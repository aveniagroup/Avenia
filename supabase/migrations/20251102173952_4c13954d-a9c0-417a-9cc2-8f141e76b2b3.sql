-- Ensure complete row data is sent for organization_settings realtime updates
ALTER TABLE organization_settings REPLICA IDENTITY FULL;