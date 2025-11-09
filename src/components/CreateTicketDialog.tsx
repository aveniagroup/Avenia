import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Sparkles, Loader2, Paperclip, X, File } from "lucide-react";
import { anonymizeText } from "@/utils/anonymizeData";
import { auditLog } from "@/utils/auditLogger";

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateTicketDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateTicketDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [suggestedPriority, setSuggestedPriority] = useState<string | null>(null);
  const [loadingPriority, setLoadingPriority] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    checkAISettings();
  }, []);

  const checkAISettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.organization_id) return;

      const { data: settings } = await supabase
        .from("organization_settings")
        .select("ai_enabled, ai_priority_suggestions")
        .eq("organization_id", profile.organization_id)
        .single();

      setAiEnabled(settings?.ai_enabled && settings?.ai_priority_suggestions);
    } catch (error) {
      console.error("Error checking AI settings:", error);
    }
  };

  const suggestPriority = async () => {
    if (!title || !description || !aiEnabled) return;

    setLoadingPriority(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user?.id)
        .single();

      // Check if auto-anonymize is enabled
      const { data: settings } = await supabase
        .from('organization_settings')
        .select('ai_auto_anonymize, ai_pii_detection_enabled')
        .eq('organization_id', profile?.organization_id)
        .single();

      let ticketData = { title, description };

      // If auto-anonymize is enabled, detect and anonymize PII
      if (settings?.ai_auto_anonymize && settings?.ai_pii_detection_enabled) {
        const fullText = `${title}\n${description}`;
        const { data: detectionData } = await supabase.functions.invoke("detect-sensitive-data", {
          body: {
            ticket_id: 'temp', // Temporary ID for detection
            text: fullText,
            organization_id: profile?.organization_id,
          },
        });

        if (detectionData?.piiTypes?.length > 0) {
          ticketData = {
            title: anonymizeText(title, detectionData.piiTypes),
            description: anonymizeText(description, detectionData.piiTypes),
          };
        }
      }

      const { data, error } = await supabase.functions.invoke("ai-ticket-assistant", {
        body: {
          action: "suggest_priority",
          ticket: ticketData,
          organization_id: profile?.organization_id,
        },
      });

      if (error) throw error;

      if (data.suggested_priority) {
        setSuggestedPriority(data.suggested_priority);
        setPriority(data.suggested_priority as any);
        toast({ title: t("ai.prioritySuggested") });
      }
    } catch (error: any) {
      console.error("Error suggesting priority:", error);
      toast({ 
        title: t("ai.errorSuggestingPriority"), 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoadingPriority(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast({ 
          title: t("attachments.fileTooLarge"), 
          description: `${file.name}: ${t("attachments.maxFileSize")}`, 
          variant: "destructive" 
        });
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    event.target.value = ''; // Reset input
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (ticketId: string, userId: string) => {
    for (const file of selectedFiles) {
      try {
        const filePath = `${ticketId}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("ticket-attachments")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from("ticket_attachments")
          .insert({
            ticket_id: ticketId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: userId,
          });

        if (dbError) throw dbError;
      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error);
        toast({ 
          title: t("attachments.uploadFailed"), 
          description: `${file.name}: ${error.message}`, 
          variant: "destructive" 
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error("Organization not found");
      }

      const { data: newTicket, error } = await supabase.from("tickets").insert([{
        organization_id: profile.organization_id,
        title,
        description,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        priority,
        status: "open",
        created_by: user?.id,
        ticket_number: null,
      }]).select().single();

      if (error) throw error;

      // Upload attachments if any
      if (newTicket && selectedFiles.length > 0) {
        await uploadAttachments(newTicket.id, user?.id || '');
      }

      // Detect PII in ticket content after creation
      if (newTicket) {
        const fullText = `${title}\n${description}\n${customerEmail}\n${customerPhone || ''}`;
        try {
          await supabase.functions.invoke("detect-sensitive-data", {
            body: {
              ticket_id: newTicket.id,
              text: fullText,
              organization_id: profile.organization_id,
            },
          });
          console.log("PII detection triggered for new ticket");
        } catch (piiError) {
          console.error("Error detecting PII:", piiError);
          // Don't fail ticket creation if PII detection fails
        }

        // Log audit event
        auditLog.ticketCreated(newTicket.id, {
          title,
          priority,
          customer_email: customerEmail,
        });
      }

      toast({ title: t("tickets.ticketCreatedSuccess") });
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setTitle("");
      setDescription("");
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setPriority("medium");
      setSelectedFiles([]);
    } catch (error: any) {
      toast({ title: t("tickets.errorCreatingTicket"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{t("tickets.createNewTicket")}</DialogTitle>
          <DialogDescription className="text-sm">
            {t("tickets.createTicketDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName" className="text-sm font-medium">{t("tickets.customerName")}</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail" className="text-sm font-medium">{t("tickets.customerEmail")}</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="h-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone" className="text-sm font-medium">{t("tickets.customerPhone")}</Label>
            <Input
              id="customerPhone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="h-10"
              placeholder="+1 234 567 8900"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">{t("tickets.title")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("tickets.titlePlaceholder")}
              className="h-10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">{t("tickets.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("tickets.descriptionPlaceholder")}
              rows={5}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="priority" className="text-sm font-medium">{t("tickets.priority")}</Label>
              {aiEnabled && title && description && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={suggestPriority}
                  disabled={loadingPriority}
                  className="h-7 text-xs"
                >
                  {loadingPriority ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      {t("ai.analyzing")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      {t("ai.suggestPriority")}
                    </>
                  )}
                </Button>
              )}
            </div>
            <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
              <SelectTrigger id="priority" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t("tickets.low")}</SelectItem>
                <SelectItem value="medium">{t("tickets.medium")}</SelectItem>
                <SelectItem value="high">{t("tickets.high")}</SelectItem>
                <SelectItem value="urgent">{t("tickets.urgent")}</SelectItem>
              </SelectContent>
            </Select>
            {suggestedPriority && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                {t("ai.aiSuggested")}: {t(`tickets.${suggestedPriority}`)}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("attachments.attachments")}</Label>
            <div className="space-y-3">
              <div>
                <Input
                  type="file"
                  onChange={handleFileSelect}
                  multiple
                  className="hidden"
                  id="ticket-file-upload"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <label htmlFor="ticket-file-upload" className="w-full">
                  <Button variant="outline" size="sm" type="button" asChild className="w-full sm:w-auto">
                    <span className="cursor-pointer">
                      <Paperclip className="h-4 w-4 mr-2" />
                      {t("attachments.attachFile")}
                    </span>
                  </Button>
                </label>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                      <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm truncate">{file.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        className="h-7 w-7 flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10">
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="h-10">
              {loading ? t("tickets.creating") : t("tickets.createTicket")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
