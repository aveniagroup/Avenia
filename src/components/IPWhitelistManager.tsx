import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, X, Globe } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function IPWhitelistManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [ipList, setIpList] = useState<string[]>([]);
  const [newIp, setNewIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentIp, setCurrentIp] = useState<string>("");

  useEffect(() => {
    fetchIPWhitelist();
    detectCurrentIP();
  }, []);

  const detectCurrentIP = async () => {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      setCurrentIp(data.ip);
    } catch (error) {
      console.error("Failed to detect IP:", error);
    }
  };

  const fetchIPWhitelist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return;

      const { data } = await supabase
        .from("organization_settings")
        .select("ip_whitelist")
        .eq("organization_id", profile.organization_id)
        .single();

      setIpList(data?.ip_whitelist || []);
    } catch (error) {
      console.error("Error fetching IP whitelist:", error);
    }
  };

  const validateIP = (ip: string) => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;
    
    const parts = ip.split(".");
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  };

  const addIP = async () => {
    if (!validateIP(newIp)) {
      toast({
        title: t("ipWhitelist.invalidIp"),
        description: t("ipWhitelist.invalidIpDesc"),
        variant: "destructive",
      });
      return;
    }

    if (ipList.includes(newIp)) {
      toast({
        title: t("ipWhitelist.duplicateIp"),
        description: t("ipWhitelist.duplicateIpDesc"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) throw new Error("No organization found");

      const updatedList = [...ipList, newIp];

      const { error } = await supabase
        .from("organization_settings")
        .update({ ip_whitelist: updatedList })
        .eq("organization_id", profile.organization_id);

      if (error) throw error;

      // Log audit event
      await supabase.rpc("log_audit_event", {
        _organization_id: profile.organization_id,
        _user_id: user.id,
        _action: "ip_whitelist_updated",
        _resource_type: "security",
        _details: { action: "add", ip: newIp },
        _severity: "warning",
      });

      setIpList(updatedList);
      setNewIp("");
      toast({
        title: t("ipWhitelist.ipAddedSuccess"),
        description: t("ipWhitelist.ipAddedSuccessDesc"),
      });
    } catch (error) {
      toast({
        title: t("ipWhitelist.errorAdding"),
        description: t("ipWhitelist.errorAddingDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeIP = async (ip: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) throw new Error("No organization found");

      const updatedList = ipList.filter((item) => item !== ip);

      const { error } = await supabase
        .from("organization_settings")
        .update({ ip_whitelist: updatedList })
        .eq("organization_id", profile.organization_id);

      if (error) throw error;

      // Log audit event
      await supabase.rpc("log_audit_event", {
        _organization_id: profile.organization_id,
        _user_id: user.id,
        _action: "ip_whitelist_updated",
        _resource_type: "security",
        _details: { action: "remove", ip },
        _severity: "warning",
      });

      setIpList(updatedList);
      toast({
        title: t("ipWhitelist.ipRemovedSuccess"),
        description: t("ipWhitelist.ipRemovedSuccessDesc"),
      });
    } catch (error) {
      toast({
        title: t("ipWhitelist.errorRemoving"),
        description: t("ipWhitelist.errorRemovingDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t("ipWhitelist.title")}
        </CardTitle>
        <CardDescription>
          {t("ipWhitelist.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentIp && (
          <Alert>
            <Globe className="h-4 w-4" />
            <AlertDescription>
              {t("ipWhitelist.currentIp")} <code className="font-mono">{currentIp}</code>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="new-ip">{t("ipWhitelist.addIpAddress")}</Label>
            <Input
              id="new-ip"
              placeholder={t("ipWhitelist.ipPlaceholder")}
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addIP()}
            />
          </div>
          <Button onClick={addIP} disabled={loading} className="mt-8">
            <Plus className="h-4 w-4 mr-2" />
            {t("ipWhitelist.add")}
          </Button>
        </div>

        {ipList.length === 0 ? (
          <Alert>
            <AlertDescription>
              {t("ipWhitelist.noIpsWhitelisted")}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <Label>{t("ipWhitelist.whitelistedAddresses")}</Label>
            <div className="space-y-2">
              {ipList.map((ip) => (
                <div
                  key={ip}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <code className="font-mono">{ip}</code>
                  <div className="flex items-center gap-2">
                    {ip === currentIp && (
                      <Badge variant="secondary">{t("ipWhitelist.currentIpBadge")}</Badge>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeIP(ip)}
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Alert>
          <AlertDescription className="text-xs">
            <strong>{t("ipWhitelist.warning")}</strong> {t("ipWhitelist.warningMessage")}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
