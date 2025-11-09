import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Plus, FileText, MoreVertical, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/config";
import { useTranslation } from "react-i18next";

interface DSR {
  id: string;
  requester_email: string;
  requester_name: string;
  request_type: string;
  status: string;
  description: string;
  requested_at: string;
  processed_at: string;
  export_file_path: string;
}

export function DataSubjectRequests() {
  const [requests, setRequests] = useState<DSR[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DSR | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const [formData, setFormData] = useState<{
    requester_email: string;
    requester_name: string;
    request_type: "export" | "deletion" | "rectification" | "restriction";
    description: string;
  }>({
    requester_email: "",
    requester_name: "",
    request_type: "export",
    description: ""
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();

      if (!profile?.organization_id) return;

      const { data, error } = await supabase
        .from("data_subject_requests")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("requested_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching DSRs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data subject requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();

      if (!profile?.organization_id) return;

      const { error } = await supabase
        .from("data_subject_requests")
        .insert([{
          organization_id: profile.organization_id,
          ...formData
        }]);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("compliance.dsr.requestCreated"),
      });

      setIsDialogOpen(false);
      setFormData({
        requester_email: "",
        requester_name: "",
        request_type: "export",
        description: ""
      });
      fetchRequests();
    } catch (error) {
      console.error("Error creating DSR:", error);
      toast({
        title: t("common.error"),
        description: t("compliance.dsr.createFailed"),
        variant: "destructive",
      });
    }
  };

  const processRequest = async (requestId: string, action: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase.functions.invoke("process-dsr", {
        body: { request_id: requestId, action }
      });

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t(`compliance.dsr.${action === 'export' ? 'exported' : 'processed'}Successfully`),
      });

      fetchRequests();
    } catch (error) {
      console.error("Error processing DSR:", error);
      toast({
        title: t("common.error"),
        description: t("compliance.dsr.processFailed"),
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const deleteRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("data_subject_requests")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("compliance.dsr.deleted"),
      });

      fetchRequests();
    } catch (error) {
      console.error("Error deleting DSR:", error);
      toast({
        title: t("common.error"),
        description: t("compliance.dsr.deleteFailed"),
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (request: DSR) => {
    setSelectedRequest(request);
    setIsEditDialogOpen(true);
  };

  const downloadExport = (exportData: string) => {
    const data = JSON.parse(exportData);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dsr-export-${Date.now()}.json`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      processing: "secondary",
      completed: "default",
      rejected: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{t(`compliance.dsr.statuses.${status}`)}</Badge>;
  };

  const getRequestTypeLabel = (type: string) => {
    return t(`compliance.dsr.types.${type}`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{t("compliance.dataSubjectRequests")}</CardTitle>
            <CardDescription>
              {t("compliance.dsr.description")}
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("compliance.dsr.newRequest")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("compliance.dsr.createTitle")}</DialogTitle>
                <DialogDescription>
                  {t("compliance.dsr.createDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t("compliance.dsr.requesterEmail")}</Label>
                  <Input
                    value={formData.requester_email}
                    onChange={(e) => setFormData({ ...formData, requester_email: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <Label>{t("compliance.dsr.requesterName")}</Label>
                  <Input
                    value={formData.requester_name}
                    onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label>{t("compliance.dsr.requestType")}</Label>
                  <Select
                    value={formData.request_type}
                    onValueChange={(value: "export" | "deletion" | "rectification" | "restriction") => 
                      setFormData({ ...formData, request_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="export">{t("compliance.dsr.dataExport")}</SelectItem>
                      <SelectItem value="deletion">{t("compliance.dsr.dataDeletion")}</SelectItem>
                      <SelectItem value="rectification">{t("compliance.dsr.dataRectification")}</SelectItem>
                      <SelectItem value="restriction">{t("compliance.dsr.processingRestriction")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("compliance.dsr.description")}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t("compliance.dsr.descriptionPlaceholder")}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createRequest}>{t("compliance.dsr.createRequest")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>{t("common.loading")}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("compliance.dsr.email")}</TableHead>
                <TableHead>{t("compliance.dsr.name")}</TableHead>
                <TableHead>{t("compliance.dsr.type")}</TableHead>
                <TableHead>{t("compliance.dsr.status")}</TableHead>
                <TableHead>{t("compliance.dsr.requested")}</TableHead>
                <TableHead>{t("compliance.dsr.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.requester_email}</TableCell>
                  <TableCell>{request.requester_name || "-"}</TableCell>
                  <TableCell>{getRequestTypeLabel(request.request_type)}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    {format(new Date(request.requested_at), "MMM d, yyyy", { locale: getDateFnsLocale() })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 items-center">
                      {request.status === "pending" && (
                        <>
                          {request.request_type === "export" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => processRequest(request.id, "export")}
                              disabled={processingId === request.id}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              {t("compliance.dsr.process")}
                            </Button>
                          )}
                          {request.request_type === "deletion" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => processRequest(request.id, "delete")}
                              disabled={processingId === request.id}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              {t("common.delete")}
                            </Button>
                          )}
                        </>
                      )}
                      {request.status === "completed" && request.export_file_path && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadExport(request.export_file_path)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {t("compliance.dsr.download")}
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-50">
                          <DropdownMenuItem onClick={() => openEditDialog(request)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t("common.view")}
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t("common.delete")}
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("compliance.dsr.deleteConfirmTitle")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("compliance.dsr.deleteConfirmDescription")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteRequest(request.id)}>
                                  {t("common.delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

      {/* Edit Request Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("compliance.dsr.viewRequest")}</DialogTitle>
            <DialogDescription>
              {t("compliance.dsr.viewDescription")}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">{t("compliance.dsr.requesterEmail")}</Label>
                  <p className="text-sm mt-1">{selectedRequest.requester_email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t("compliance.dsr.requesterName")}</Label>
                  <p className="text-sm mt-1">{selectedRequest.requester_name || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t("compliance.dsr.requestType")}</Label>
                  <p className="text-sm mt-1">{getRequestTypeLabel(selectedRequest.request_type)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t("compliance.dsr.status")}</Label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t("compliance.dsr.requested")}</Label>
                  <p className="text-sm mt-1">
                    {format(new Date(selectedRequest.requested_at), "MMM d, yyyy HH:mm", { locale: getDateFnsLocale() })}
                  </p>
                </div>
                {selectedRequest.processed_at && (
                  <div>
                    <Label className="text-sm font-medium">{t("compliance.dsr.processed")}</Label>
                    <p className="text-sm mt-1">
                      {format(new Date(selectedRequest.processed_at), "MMM d, yyyy HH:mm", { locale: getDateFnsLocale() })}
                    </p>
                  </div>
                )}
              </div>
              {selectedRequest.description && (
                <div>
                  <Label className="text-sm font-medium">{t("compliance.dsr.description")}</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md">{selectedRequest.description}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
