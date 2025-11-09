import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ConfigureIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: {
    id: string;
    name: string;
    type: string;
    status: string;
  } | null;
  onSuccess: () => void;
}

export function ConfigureIntegrationDialog({
  open,
  onOpenChange,
  integration,
  onSuccess,
}: ConfigureIntegrationDialogProps) {
  const [enabled, setEnabled] = useState(integration?.status === "connected");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (integration) {
      setEnabled(integration.status === "connected");
    }
  }, [integration]);

  const handleToggleIntegration = async () => {
    if (!integration) return;

    setLoading(true);
    try {
      const newStatus = enabled ? "disconnected" : "connected";

      const { error } = await supabase
        .from("integrations")
        .update({ status: newStatus })
        .eq("id", integration.id);

      if (error) throw error;

      toast({
        title: enabled ? "Integration disconnected" : "Integration connected",
        description: `${integration.name} has been ${enabled ? "disconnected" : "connected"}`,
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
          <DialogTitle>Configure {integration?.name}</DialogTitle>
          <DialogDescription>
            Manage the connection status for this integration
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Integration</Label>
              <p className="text-sm text-muted-foreground">
                Toggle to connect or disconnect this integration
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="rounded-lg border p-4 bg-muted/50">
            <h4 className="font-medium mb-2">Integration Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium capitalize">{integration?.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Status:</span>
                <span className="font-medium capitalize">{integration?.status}</span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleToggleIntegration} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
