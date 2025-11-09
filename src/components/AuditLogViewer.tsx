import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Search, AlertTriangle, Info } from "lucide-react";
import { format } from "date-fns";
import { enUS, es, de, fi, fr, sv, type Locale } from "date-fns/locale";

interface AuditLog {
  id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: any;
  severity: "info" | "warning" | "critical";
  created_at: string;
}

export function AuditLogViewer() {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

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

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return;

      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs((data || []) as AuditLog[]);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      critical: "destructive",
      warning: "secondary",
      info: "default",
    };
    return (
      <Badge variant={variants[severity] || "default"}>
        {severity}
      </Badge>
    );
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === "all" || log.severity === severityFilter;
    
    return matchesSearch && matchesSeverity;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t("auditLogs.title")}
        </CardTitle>
        <CardDescription>
          {t("auditLogs.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("auditLogs.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("auditLogs.severity")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("auditLogs.allSeverities")}</SelectItem>
              <SelectItem value="info">{t("auditLogs.info")}</SelectItem>
              <SelectItem value="warning">{t("auditLogs.warning")}</SelectItem>
              <SelectItem value="critical">{t("auditLogs.critical")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t("auditLogs.severity")}</TableHead>
                <TableHead>{t("auditLogs.user")}</TableHead>
                <TableHead>{t("auditLogs.action")}</TableHead>
                <TableHead>{t("auditLogs.resource")}</TableHead>
                <TableHead>{t("auditLogs.ipAddress")}</TableHead>
                <TableHead>{t("auditLogs.timestamp")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {t("auditLogs.loading")}
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {t("auditLogs.noLogsFound")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(log.severity)}
                        {getSeverityBadge(log.severity)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.user_email || t("auditLogs.system")}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {t(`auditLogs.actions.${log.action}`, { defaultValue: log.action })}
                      </code>
                    </TableCell>
                    <TableCell>
                      {t(`auditLogs.resources.${log.resource_type}`, { defaultValue: log.resource_type })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.ip_address || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), "PPp", { locale: getDateLocale() })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
