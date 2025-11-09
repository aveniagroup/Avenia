import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Shield, Info, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface DataProtectionSettings {
  ai_pii_detection_enabled: boolean;
  ai_require_consent_for_pii: boolean;
  ai_auto_anonymize: boolean;
  gdpr_dpo_email: string;
  ai_transparency_notice_url: string;
}

export function DataProtectionSettings() {
  const [settings, setSettings] = useState<DataProtectionSettings>({
    ai_pii_detection_enabled: true,
    ai_require_consent_for_pii: true,
    ai_auto_anonymize: false,
    gdpr_dpo_email: '',
    ai_transparency_notice_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return;

      const { data: orgData } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .single();

      if (orgData) {
        setSettings({
          ai_pii_detection_enabled: orgData.ai_pii_detection_enabled !== false,
          ai_require_consent_for_pii: orgData.ai_require_consent_for_pii !== false,
          ai_auto_anonymize: orgData.ai_auto_anonymize || false,
          gdpr_dpo_email: orgData.gdpr_dpo_email || '',
          ai_transparency_notice_url: orgData.ai_transparency_notice_url || '',
        });
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return;

      const { error } = await supabase
        .from("organization_settings")
        .update({
          ...settings,
        })
        .eq("organization_id", profile.organization_id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('dataProtection.settingsSaved'),
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('dataProtection.cardTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="pii-detection">{t('dataProtection.enablePiiDetection')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('dataProtection.enablePiiDetectionDesc')}
              </p>
            </div>
            <Switch
              id="pii-detection"
              checked={settings.ai_pii_detection_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, ai_pii_detection_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="require-consent">{t('dataProtection.requireConsent')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('dataProtection.requireConsentDesc')}
              </p>
            </div>
            <Switch
              id="require-consent"
              checked={settings.ai_require_consent_for_pii}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, ai_require_consent_for_pii: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="auto-anonymize">{t('dataProtection.autoAnonymize')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('dataProtection.autoAnonymizeDesc')}
              </p>
            </div>
            <Switch
              id="auto-anonymize"
              checked={settings.ai_auto_anonymize}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, ai_auto_anonymize: checked })
              }
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-semibold mb-3">{t('dataProtection.gdprSettings')}</h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dpo-email">{t('dataProtection.dpoEmail')}</Label>
              <Input
                id="dpo-email"
                type="email"
                placeholder="dpo@example.com"
                value={settings.gdpr_dpo_email}
                onChange={(e) =>
                  setSettings({ ...settings, gdpr_dpo_email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-notice-url">{t('dataProtection.aiNoticeUrl')}</Label>
              <Input
                id="ai-notice-url"
                type="url"
                placeholder="https://example.com/ai-policy"
                value={settings.ai_transparency_notice_url}
                onChange={(e) =>
                  setSettings({ ...settings, ai_transparency_notice_url: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t bg-muted/50 px-4 py-4 rounded-lg mt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">{t('dataProtection.complianceTitle')}</p>
              <p className="text-muted-foreground">
                {t('dataProtection.complianceDesc')}
              </p>
              <div className="flex gap-3 mt-2">
                <a 
                  href="https://gdpr-info.eu/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs"
                >
                  {t('dataProtection.gdprDocs')}
                </a>
                <a 
                  href="https://artificialintelligenceact.eu/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs"
                >
                  {t('dataProtection.euAiActInfo')}
                </a>
              </div>
            </div>
          </div>
        </div>

        <Button onClick={saveSettings} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('common.save')}
        </Button>
      </CardContent>
    </Card>
  );
}
