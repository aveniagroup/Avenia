import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string;
  } | null;
  onSuccess: () => void;
}

export function EditRoleDialog({ open, onOpenChange, member, onSuccess }: EditRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<string>(member?.role || "agent");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (member) {
      setSelectedRole(member.role);
    }
  }, [member]);

  const handleUpdateRole = async () => {
    if (!member) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) throw new Error("Organization not found");

      // Check if user has admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", profile.organization_id);

      const isAdmin = roles?.some(r => r.role === "admin");
      if (!isAdmin) {
        throw new Error("Only admins can update roles");
      }

      // Check if role exists
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", member.id)
        .eq("organization_id", profile.organization_id)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: selectedRole as any })
          .eq("user_id", member.id)
          .eq("organization_id", profile.organization_id);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({
            user_id: member.id,
            organization_id: profile.organization_id,
            role: selectedRole as any,
          } as any);

        if (error) throw error;
      }

      toast({
        title: "Role updated",
        description: `${member.full_name || member.email}'s role has been updated to ${selectedRole}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Team Member Role</DialogTitle>
          <DialogDescription>
            Update the role for {member?.full_name || member?.email}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleUpdateRole} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
