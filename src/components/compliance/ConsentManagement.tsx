import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/config";
import { useTranslation } from "react-i18next";

interface Consent {
  id: string;
  customer_email: string;
  consent_type: string;
  granted: boolean;
  granted_at: string;
  revoked_at: string;
  source: string;
}

export function ConsentManagement() {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    fetchConsents();
  }, []);

  const fetchConsents = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();

      if (!profile?.organization_id) return;

      const { data, error } = await supabase
        .from("consent_records")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConsents(data || []);
    } catch (error) {
      console.error("Error fetching consents:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConsents = consents.filter(
    (consent) =>
      consent.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consent.consent_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatConsentType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("compliance.consentManagement")}</CardTitle>
        <CardDescription>
          {t("compliance.consent.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("compliance.consent.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {loading ? (
          <div>{t("common.loading")}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("compliance.dsr.email")}</TableHead>
                <TableHead>{t("compliance.consent.consentType")}</TableHead>
                <TableHead>{t("compliance.dsr.status")}</TableHead>
                <TableHead>{t("compliance.consent.granted")}</TableHead>
                <TableHead>{t("compliance.consent.revoked")}</TableHead>
                <TableHead>{t("compliance.consent.source")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConsents.map((consent) => (
                <TableRow key={consent.id}>
                  <TableCell>{consent.customer_email || "-"}</TableCell>
                  <TableCell>{formatConsentType(consent.consent_type)}</TableCell>
                  <TableCell>
                    <Badge variant={consent.granted && !consent.revoked_at ? "default" : "secondary"}>
                      {consent.granted && !consent.revoked_at ? t("compliance.consent.active") : t("compliance.consent.revokedStatus")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {consent.granted_at
                      ? format(new Date(consent.granted_at), "MMM d, yyyy", { locale: getDateFnsLocale() })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {consent.revoked_at
                      ? format(new Date(consent.revoked_at), "MMM d, yyyy", { locale: getDateFnsLocale() })
                      : "-"}
                  </TableCell>
                  <TableCell>{consent.source || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
