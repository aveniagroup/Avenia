import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Calendar, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, type Locale } from "date-fns";
import { enUS, es, de, fi, fr, sv } from "date-fns/locale";

interface ViewProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    role: string;
    created_at: string;
  } | null;
}

export function ViewProfileDialog({ open, onOpenChange, member }: ViewProfileDialogProps) {
  const [ticketStats, setTicketStats] = useState({ assigned: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (member && open) {
      fetchMemberStats();
    }
  }, [member, open]);

  const fetchMemberStats = async () => {
    if (!member) return;

    setLoading(true);
    try {
      // Get assigned tickets count
      const { count: assignedCount } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", member.id);

      // Get resolved tickets count
      const { count: resolvedCount } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", member.id)
        .eq("status", "resolved");

      setTicketStats({
        assigned: assignedCount || 0,
        resolved: resolvedCount || 0,
      });
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

  const getInitials = (name: string | null, email: string | null) => {
    if (name) return name.split(" ").map(n => n[0]).join("").toUpperCase();
    if (email) return email.substring(0, 2).toUpperCase();
    return "??";
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors",
      manager: "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 transition-colors",
      support: "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors",
      agent: "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors",
    };
    return colors[role] || colors.agent;
  };

  const getDateLocale = () => {
    const localeMap: Record<string, Locale> = {
      en: enUS,
      es: es,
      de: de,
      fi: fi,
      fr: fr,
      sv: sv,
    };
    return localeMap[i18n.language] || enUS;
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "PPP", { locale: getDateLocale() });
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("team.profileDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("team.profileDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={member.avatar_url || ""} />
              <AvatarFallback className="text-xl">
                {getInitials(member.full_name, member.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{member.full_name || t("team.profileDialog.unknown")}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{member.email}</span>
              </div>
              <div className="mt-2">
                <Badge className={getRoleBadgeColor(member.role)}>
                  {t(`team.roles.${member.role}`, { defaultValue: member.role })}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("team.profileDialog.joined")}</span>
              <span className="font-medium">{formatDate(member.created_at)}</span>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">
                {t("team.profileDialog.activityStats")}
              </h4>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <div className="text-2xl font-bold">{ticketStats.assigned}</div>
                    <div className="text-sm text-muted-foreground">{t("team.profileDialog.assignedTickets")}</div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-2xl font-bold">{ticketStats.resolved}</div>
                    <div className="text-sm text-muted-foreground">{t("team.profileDialog.resolvedTickets")}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
