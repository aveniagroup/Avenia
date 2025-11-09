import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, X, Download, Loader2, File } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface FileAttachmentProps {
  ticketId: string;
  onAttachmentChange?: () => void;
  lastMessageTime?: string;
}

export function FileAttachment({ ticketId, onAttachmentChange, lastMessageTime }: FileAttachmentProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const loadAttachments = async () => {
    const { data, error } = await supabase
      .from("ticket_attachments")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Only show attachments uploaded after the last message
      const filtered = lastMessageTime 
        ? data.filter(att => new Date(att.created_at) > new Date(lastMessageTime))
        : data;
      setAttachments(filtered);
    }
  };

  React.useEffect(() => {
    loadAttachments();
  }, [ticketId, lastMessageTime]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: t("attachments.fileTooLarge"), description: t("attachments.maxFileSize"), variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
          uploaded_by: user?.id,
        });

      if (dbError) throw dbError;

      toast({ title: t("attachments.uploadSuccess") });
      loadAttachments();
      onAttachmentChange?.();
    } catch (error: any) {
      toast({ title: t("attachments.uploadFailed"), description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from("ticket-attachments")
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: t("attachments.downloadFailed"), description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    try {
      // Check if this attachment is associated with any messages
      const attachmentTime = new Date(attachment.created_at).getTime();
      const { data: messages } = await supabase
        .from("ticket_messages")
        .select("created_at")
        .eq("ticket_id", ticketId);

      if (messages) {
        const isCommitted = messages.some(message => {
          const messageTime = new Date(message.created_at).getTime();
          return Math.abs(messageTime - attachmentTime) < 60000; // Within 1 minute
        });

        if (isCommitted) {
          toast({ 
            title: t("attachments.cannotDelete"), 
            description: t("attachments.partOfHistory"), 
            variant: "destructive" 
          });
          return;
        }
      }

      const { error: storageError } = await supabase.storage
        .from("ticket-attachments")
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("ticket_attachments")
        .delete()
        .eq("id", attachment.id);

      if (dbError) throw dbError;

      toast({ title: t("attachments.deleteSuccess") });
      loadAttachments();
      onAttachmentChange?.();
    } catch (error: any) {
      toast({ title: t("attachments.deleteFailed"), description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          type="file"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
          id={`file-upload-${ticketId}`}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
        <label htmlFor={`file-upload-${ticketId}`} className="w-full sm:w-auto">
          <Button variant="outline" size="sm" disabled={uploading} asChild className="w-full sm:w-auto">
            <span className="cursor-pointer">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Paperclip className="h-4 w-4 mr-2" />}
              {uploading ? t("attachments.uploading") : t("attachments.attachFile")}
            </span>
          </Button>
        </label>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <Card key={attachment.id} className="overflow-hidden">
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm truncate">{attachment.file_name}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {(attachment.file_size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(attachment)}
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      title={t("attachments.download")}
                    >
                      <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(attachment)}
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      title={t("attachments.delete")}
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}