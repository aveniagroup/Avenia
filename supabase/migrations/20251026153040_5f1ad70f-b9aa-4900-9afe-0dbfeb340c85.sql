-- Add RLS policy to allow admins to delete data subject requests
CREATE POLICY "Admins can delete DSRs in their organization"
ON data_subject_requests
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role) 
  AND organization_id = get_user_organization_id(auth.uid())
);