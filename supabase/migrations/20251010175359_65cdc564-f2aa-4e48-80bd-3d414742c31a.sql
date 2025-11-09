-- Create a security definer function to get user's organization_id
-- This prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = user_id;
$$;

-- Drop existing RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can view roles in their organization" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view tickets in their organization" ON public.tickets;
DROP POLICY IF EXISTS "Users can insert tickets in their organization" ON public.tickets;
DROP POLICY IF EXISTS "Users can update tickets in their organization" ON public.tickets;
DROP POLICY IF EXISTS "Users can view messages for tickets in their organization" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users can insert messages for tickets in their organization" ON public.ticket_messages;

-- Recreate policies using the security definer function
CREATE POLICY "Users can view their organization"
  ON public.organizations FOR SELECT
  USING (id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Users can view roles in their organization"
  ON public.user_roles FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Users can view tickets in their organization"
  ON public.tickets FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Users can insert tickets in their organization"
  ON public.tickets FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update tickets in their organization"
  ON public.tickets FOR UPDATE
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Users can view messages for tickets in their organization"
  ON public.ticket_messages FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets 
      WHERE organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "Users can insert messages for tickets in their organization"
  ON public.ticket_messages FOR INSERT
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.tickets 
      WHERE organization_id = public.get_user_organization_id(auth.uid())
    )
  );