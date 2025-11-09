import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Play, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/config";
import { useTranslation } from "react-i18next";

interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  resource_type: string;
  retention_days: number;
  auto_delete: boolean;
  is_active: boolean;
  last_run_at: string;
}

export function RetentionPolicies() {
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    resource_type: "tickets",
    retention_days: 90,
    auto_delete: true,
    is_active: true
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();

      if (!profile?.organization_id) return;

      const { data, error } = await supabase
        .from("retention_policies")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPolicies(data || []);
    } catch (error) {
      console.error("Error fetching policies:", error);
      toast({
        title: "Error",
        description: "Failed to fetch retention policies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePolicy = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();

      if (!profile?.organization_id) return;

      if (editingPolicy) {
        // Update existing policy
        const { error } = await supabase
          .from("retention_policies")
          .update(formData)
          .eq("id", editingPolicy);

        if (error) throw error;

        toast({
          title: t("common.success"),
          description: "Policy updated successfully",
        });
      } else {
        // Create new policy
        const { error } = await supabase
          .from("retention_policies")
          .insert({
            organization_id: profile.organization_id,
            ...formData
          });

        if (error) throw error;

        toast({
          title: t("common.success"),
          description: t("compliance.retention.policyCreated"),
        });
      }

      setIsDialogOpen(false);
      setEditingPolicy(null);
      setFormData({
        name: "",
        description: "",
        resource_type: "tickets",
        retention_days: 90,
        auto_delete: true,
        is_active: true
      });
      fetchPolicies();
    } catch (error: any) {
      console.error("Error saving policy:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("compliance.retention.createFailed"),
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (policy: RetentionPolicy) => {
    setEditingPolicy(policy.id);
    setFormData({
      name: policy.name,
      description: policy.description,
      resource_type: policy.resource_type,
      retention_days: policy.retention_days,
      auto_delete: policy.auto_delete,
      is_active: policy.is_active
    });
    setIsDialogOpen(true);
  };

  const deletePolicy = async (policyId: string) => {
    if (!confirm("Are you sure you want to delete this retention policy?")) return;

    try {
      const { error } = await supabase
        .from("retention_policies")
        .delete()
        .eq("id", policyId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: "Policy deleted successfully",
      });

      fetchPolicies();
    } catch (error) {
      console.error("Error deleting policy:", error);
      toast({
        title: t("common.error"),
        description: "Failed to delete policy",
        variant: "destructive",
      });
    }
  };

  const togglePolicy = async (policyId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("retention_policies")
        .update({ is_active: isActive })
        .eq("id", policyId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t(`compliance.retention.policy${isActive ? "Activated" : "Deactivated"}`),
      });

      fetchPolicies();
    } catch (error) {
      console.error("Error toggling policy:", error);
      toast({
        title: t("common.error"),
        description: t("compliance.retention.updateFailed"),
        variant: "destructive",
      });
    }
  };

  const runPolicy = async () => {
    try {
      const { error } = await supabase.rpc("apply_retention_policies", {
        manual_execution: true
      });

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("compliance.retention.policiesApplied"),
      });

      fetchPolicies();
    } catch (error) {
      console.error("Error running policies:", error);
      toast({
        title: t("common.error"),
        description: t("compliance.retention.runFailed"),
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{t("compliance.retentionPolicies")}</CardTitle>
            <CardDescription>
              {t("compliance.retention.description")}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={runPolicy}>
              <Play className="h-4 w-4 mr-2" />
              {t("compliance.retention.runNow")}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingPolicy(null);
                setFormData({
                  name: "",
                  description: "",
                  resource_type: "tickets",
                  retention_days: 90,
                  auto_delete: true,
                  is_active: true
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("compliance.retention.newPolicy")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingPolicy ? t("compliance.retention.editTitle") : t("compliance.retention.createTitle")}
                  </DialogTitle>
                  <DialogDescription>
                    {editingPolicy ? t("compliance.retention.editDescription") : t("compliance.retention.createDescription")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{t("compliance.retention.policyName")}</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t("compliance.retention.policyNamePlaceholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("compliance.dsr.description")}</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t("compliance.retention.descriptionPlaceholder")}
                    />
                  </div>
                  <div>
                    <Label>{t("compliance.retention.resourceType")}</Label>
                    <Select
                      value={formData.resource_type}
                      onValueChange={(value) => setFormData({ ...formData, resource_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tickets">{t("nav.tickets")}</SelectItem>
                        <SelectItem value="audit_logs">{t("compliance.retention.auditLogs")}</SelectItem>
                        <SelectItem value="ticket_attachments">{t("compliance.retention.attachments")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("compliance.retention.retentionDays")}</Label>
                    <Input
                      type="number"
                      value={formData.retention_days}
                      onChange={(e) => setFormData({ ...formData, retention_days: parseInt(e.target.value) })}
                      min="1"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.auto_delete}
                      onCheckedChange={(checked) => setFormData({ ...formData, auto_delete: checked })}
                    />
                    <Label>{t("compliance.retention.autoDelete")}</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={savePolicy}>
                    {editingPolicy ? t("common.update") : t("compliance.retention.createPolicy")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>{t("common.loading")}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("compliance.dsr.name")}</TableHead>
                <TableHead>{t("compliance.retention.resourceType")}</TableHead>
                <TableHead>{t("compliance.retention.retentionDays")}</TableHead>
                <TableHead>{t("compliance.retention.autoDelete")}</TableHead>
                <TableHead>{t("compliance.dsr.status")}</TableHead>
                <TableHead>{t("compliance.retention.lastRun")}</TableHead>
                <TableHead>{t("compliance.dsr.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">{policy.name}</TableCell>
                  <TableCell className="capitalize">{policy.resource_type}</TableCell>
                  <TableCell>{policy.retention_days} {t("compliance.retention.days")}</TableCell>
                  <TableCell>
                    <Badge variant={policy.auto_delete ? "default" : "secondary"}>
                      {policy.auto_delete ? t("compliance.retention.yes") : t("compliance.retention.no")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={policy.is_active ? "default" : "secondary"}>
                      {policy.is_active ? t("compliance.retention.active") : t("compliance.retention.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {policy.last_run_at
                      ? format(new Date(policy.last_run_at), "MMM d, yyyy HH:mm", { locale: getDateFnsLocale() })
                      : t("compliance.retention.never")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-between">
                      <Switch
                        checked={policy.is_active}
                        onCheckedChange={(checked) => togglePolicy(policy.id, checked)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => openEditDialog(policy)}>
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deletePolicy(policy.id)}
                            className="text-destructive"
                          >
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
