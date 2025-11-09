-- Create audit logs table for tracking all actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_org_id ON public.audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs in their organization
CREATE POLICY "Admins can view audit logs in their organization"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role) AND organization_id = get_user_organization_id(auth.uid()));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Create table for user 2FA settings
CREATE TABLE IF NOT EXISTS public.user_2fa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT false,
  secret TEXT,
  backup_codes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own 2FA settings
CREATE POLICY "Users can manage their own 2FA settings"
ON public.user_2fa_settings
FOR ALL
USING (user_id = auth.uid());

-- Create granular permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role, permission_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can view permissions
CREATE POLICY "Users can view permissions"
ON public.permissions
FOR SELECT
USING (true);

-- Admins can manage role permissions
CREATE POLICY "Admins can manage role permissions"
ON public.role_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Insert default permissions
INSERT INTO public.permissions (name, description, resource, action) VALUES
('tickets.view', 'View tickets', 'tickets', 'view'),
('tickets.create', 'Create tickets', 'tickets', 'create'),
('tickets.update', 'Update tickets', 'tickets', 'update'),
('tickets.delete', 'Delete tickets', 'tickets', 'delete'),
('tickets.assign', 'Assign tickets', 'tickets', 'assign'),
('team.view', 'View team members', 'team', 'view'),
('team.invite', 'Invite team members', 'team', 'invite'),
('team.remove', 'Remove team members', 'team', 'remove'),
('settings.view', 'View settings', 'settings', 'view'),
('settings.update', 'Update settings', 'settings', 'update'),
('audit_logs.view', 'View audit logs', 'audit_logs', 'view'),
('templates.manage', 'Manage templates', 'templates', 'manage'),
('integrations.manage', 'Manage integrations', 'integrations', 'manage')
ON CONFLICT (name) DO NOTHING;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id
      AND p.name = _permission
  )
$$;

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _organization_id UUID,
  _user_id UUID,
  _action TEXT,
  _resource_type TEXT,
  _resource_id UUID DEFAULT NULL,
  _details JSONB DEFAULT '{}'::jsonb,
  _severity TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id UUID;
  _user_email TEXT;
BEGIN
  -- Get user email
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  
  -- Insert audit log
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    user_email,
    action,
    resource_type,
    resource_id,
    details,
    severity
  ) VALUES (
    _organization_id,
    _user_id,
    _user_email,
    _action,
    _resource_type,
    _resource_id,
    _details,
    _severity
  ) RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Function to validate IP whitelist
CREATE OR REPLACE FUNCTION public.is_ip_allowed(_organization_id UUID, _ip_address TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN ip_whitelist IS NULL OR array_length(ip_whitelist, 1) IS NULL THEN true
      ELSE _ip_address = ANY(ip_whitelist)
    END
  FROM public.organization_settings
  WHERE organization_id = _organization_id
$$;

-- Trigger to update updated_at on user_2fa_settings
CREATE TRIGGER update_user_2fa_settings_updated_at
BEFORE UPDATE ON public.user_2fa_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();