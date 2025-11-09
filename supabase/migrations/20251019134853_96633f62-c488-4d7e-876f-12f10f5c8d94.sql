-- Add DELETE policy for tickets
CREATE POLICY "Users can delete tickets in their organization" 
ON public.tickets 
FOR DELETE 
USING (organization_id = get_user_organization_id(auth.uid()));