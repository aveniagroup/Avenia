import React, { useEffect, useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Settings as SettingsIcon, Globe, Bell, Plug, Shield, Lock, Clock, MapPin, Loader2, Sparkles, ArrowLeft, ArrowRight, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ConfigureIntegrationDialog } from "@/components/ConfigureIntegrationDialog";
import { ResponseTemplateManager } from "@/components/ResponseTemplateManager";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { AuditLogViewer } from "@/components/AuditLogViewer";
import { IPWhitelistManager } from "@/components/IPWhitelistManager";
import { StorageProviderConfig } from "@/components/StorageProviderConfig";
import { AIAutoExecutionSettings } from "@/components/AIAutoExecutionSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

function Settings() {
  const [loading, setLoading] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingOrgSettings, setSavingOrgSettings] = useState(false);
  const [configureDialogOpen, setConfigureDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { open, toggleSidebar } = useSidebar();

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    email_notifications: true,
    in_app_notifications: true,
    ticket_updates: true,
    new_messages: true,
    system_alerts: true,
  });

  // Organization settings state
  const [orgSettings, setOrgSettings] = useState({
    platform_name: "",
    timezone: "UTC",
    language: "en",
    two_factor_required: false,
    session_timeout_minutes: 60,
  });

  // AI settings state
  const [aiSettings, setAiSettings] = useState({
    ai_enabled: false,
    ai_agents_enabled: true,
    ai_auto_suggest_responses: false,
    ai_sentiment_analysis: false,
    ai_priority_suggestions: false,
    ai_translation_enabled: false,
    ai_knowledge_base_enabled: false,
    ai_summarization_enabled: false,
    ai_template_suggestions_enabled: false,
    ai_pii_detection_enabled: true,
    ai_require_consent_for_pii: true,
    ai_auto_anonymize: false,
    data_retention_days: 90,
    gdpr_dpo_email: '',
    ai_transparency_notice_url: '',
    ai_auto_execution_enabled: false,
    ai_auto_execution_threshold: 85,
    ai_auto_execution_actions: {
      respondToCustomers: true,
      updateStatus: true,
      changePriority: true,
      sendUpdates: true,
      logEscalations: true,
      scheduleFollowUps: true,
    },
  });

  const [savingAiSettings, setSavingAiSettings] = useState(false);
  
  // Custom AI configuration state
  const [aiProvider, setAiProvider] = useState('integrated');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [savingCustomAI, setSavingCustomAI] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Integrations state
  const [integrations, setIntegrations] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch notification preferences
      const { data: notifData } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (notifData) {
        setNotifications(notifData);
      }

      // Fetch organization settings
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.organization_id) {
        const { data: orgData } = await supabase
          .from("organization_settings")
          .select("*")
          .eq("organization_id", profile.organization_id)
          .single();

        if (orgData) {
          setOrgSettings(orgData);
          setAiSettings({
            ai_enabled: orgData.ai_enabled || false,
            ai_agents_enabled: orgData.ai_agents_enabled !== false,
            ai_auto_suggest_responses: orgData.ai_auto_suggest_responses || false,
            ai_sentiment_analysis: orgData.ai_sentiment_analysis || false,
            ai_priority_suggestions: orgData.ai_priority_suggestions || false,
            ai_translation_enabled: orgData.ai_translation_enabled || false,
            ai_knowledge_base_enabled: orgData.ai_knowledge_base_enabled || false,
            ai_summarization_enabled: orgData.ai_summarization_enabled || false,
            ai_template_suggestions_enabled: orgData.ai_template_suggestions_enabled || false,
            ai_pii_detection_enabled: orgData.ai_pii_detection_enabled !== false,
            ai_require_consent_for_pii: orgData.ai_require_consent_for_pii !== false,
            ai_auto_anonymize: orgData.ai_auto_anonymize || false,
            data_retention_days: orgData.data_retention_days || 90,
            gdpr_dpo_email: orgData.gdpr_dpo_email || '',
            ai_transparency_notice_url: orgData.ai_transparency_notice_url || '',
            ai_auto_execution_enabled: orgData.ai_auto_execution_enabled || false,
            ai_auto_execution_threshold: orgData.ai_auto_execution_threshold || 85,
            ai_auto_execution_actions: (orgData as any).ai_auto_execution_actions || {
              respondToCustomers: true,
              updateStatus: true,
              changePriority: true,
              sendUpdates: true,
              logEscalations: true,
              scheduleFollowUps: true,
            },
          });
          
          // Set custom AI configuration
          setAiProvider(orgData.ai_provider || 'integrated');
          setCustomEndpoint(orgData.ai_custom_endpoint || '');
          setCustomModel(orgData.ai_custom_model || '');
          
          // Apply saved language on load
          if (orgData.language) {
            i18n.changeLanguage(orgData.language);
          }
        }

        // Fetch integrations
        const { data: integrationsData } = await supabase
          .from("integrations")
          .select("*")
          .eq("organization_id", profile.organization_id);

        setIntegrations(integrationsData || []);
      }
    } catch (error: any) {
      toast({
        title: "Error loading settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveNotificationPreferences = async () => {
    setSavingNotifications(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: user.id,
          ...notifications,
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Notification preferences updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingNotifications(false);
    }
  };

  const saveOrganizationSettings = async () => {
    setSavingOrgSettings(true);
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
        .upsert({
          organization_id: profile.organization_id,
          ...orgSettings,
          ...aiSettings,
        }, { onConflict: 'organization_id' });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Organization settings updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingOrgSettings(false);
    }
  };

  const getIntegrationBadge = (status: string) => {
    const colors: Record<string, string> = {
      connected: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      disconnected: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
      error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status] || colors.disconnected;
  };

  const saveAISettings = async () => {
    setSavingAiSettings(true);
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
        .upsert({
          organization_id: profile.organization_id,
          ...orgSettings,
          ...aiSettings,
          ai_provider: aiProvider,
          ai_custom_endpoint: customEndpoint || null,
          ai_custom_model: customModel || null,
        }, { onConflict: 'organization_id' });

      if (error) throw error;

      toast({
        title: "AI settings saved",
        description: "AI feature preferences updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingAiSettings(false);
    }
  };

  const saveCustomAISettings = async () => {
    setSavingCustomAI(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return;

      // Update organization settings
      const { error: settingsError } = await supabase
        .from("organization_settings")
        .upsert({
          organization_id: profile.organization_id,
          ...orgSettings,
          ...aiSettings,
          ai_provider: aiProvider,
          ai_custom_endpoint: customEndpoint || null,
          ai_custom_model: customModel || null,
        }, { onConflict: 'organization_id' });

      if (settingsError) throw settingsError;

      // Save API key if not using integrated AI
      if (aiProvider !== 'integrated' && apiKey) {
        const { error: credError } = await supabase
          .from("organization_ai_credentials")
          .upsert({
            organization_id: profile.organization_id,
            provider: aiProvider,
            api_key_encrypted: apiKey,
          });

        if (credError) throw credError;
        setApiKey('');
      }

      toast({
        title: "Configuration saved",
        description: "Custom AI model configuration updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingCustomAI(false);
    }
  };

  const testAIConnection = async () => {
    setTestingConnection(true);
    try {
      toast({
        title: "Testing connection...",
        description: "This feature will be available soon",
      });
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex h-14 md:h-16 items-center gap-2 md:gap-4 px-4 md:px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-7 w-7 -ml-2"
            >
              {open ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
            <div className="flex-1" />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="space-y-1 md:space-y-2">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
                <p className="text-xs md:text-sm text-muted-foreground">{t('settings.subtitle')}</p>
              </div>

              <Tabs defaultValue="general" className="space-y-4 md:space-y-6">
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                  <TabsList className="inline-flex w-auto min-w-full md:min-w-0">
                    <TabsTrigger value="general" className="text-xs md:text-sm whitespace-nowrap">{t('settings.general')}</TabsTrigger>
                    <TabsTrigger value="notifications" className="text-xs md:text-sm whitespace-nowrap">{t('settings.notifications')}</TabsTrigger>
                    <TabsTrigger value="storage" className="text-xs md:text-sm whitespace-nowrap">{t('settings.storage.title')}</TabsTrigger>
                    <TabsTrigger value="ai-features" className="text-xs md:text-sm whitespace-nowrap">{t('ai.title')}</TabsTrigger>
                    <TabsTrigger value="templates" className="text-xs md:text-sm whitespace-nowrap">{t('templates.title')}</TabsTrigger>
                    <TabsTrigger value="integrations" className="text-xs md:text-sm whitespace-nowrap">{t('settings.integrations')}</TabsTrigger>
                    <TabsTrigger value="security" className="text-xs md:text-sm whitespace-nowrap">{t('settings.security')}</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="general" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('settings.general')} {t('settings.title')}</CardTitle>
                      <CardDescription>
                        {t('settings.subtitle')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="platform-name">{t('settings.platformName')}</Label>
                        <Input
                          id="platform-name"
                          value={orgSettings.platform_name || ""}
                          onChange={(e) => setOrgSettings({ ...orgSettings, platform_name: e.target.value })}
                          placeholder="My Support Platform"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="timezone">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {t('settings.timezone')}
                            </div>
                          </Label>
                          <Select
                            value={orgSettings.timezone}
                            onValueChange={(value) => setOrgSettings({ ...orgSettings, timezone: value })}
                          >
                            <SelectTrigger id="timezone">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Etc/GMT+12">UTC-12:00</SelectItem>
                              <SelectItem value="Pacific/Midway">UTC-11:00</SelectItem>
                              <SelectItem value="Pacific/Honolulu">UTC-10:00</SelectItem>
                              <SelectItem value="America/Anchorage">UTC-09:00</SelectItem>
                              <SelectItem value="America/Los_Angeles">UTC-08:00</SelectItem>
                              <SelectItem value="America/Denver">UTC-07:00</SelectItem>
                              <SelectItem value="America/Chicago">UTC-06:00</SelectItem>
                              <SelectItem value="America/New_York">UTC-05:00</SelectItem>
                              <SelectItem value="America/Caracas">UTC-04:00</SelectItem>
                              <SelectItem value="America/St_Johns">UTC-03:30</SelectItem>
                              <SelectItem value="America/Sao_Paulo">UTC-03:00</SelectItem>
                              <SelectItem value="America/Noronha">UTC-02:00</SelectItem>
                              <SelectItem value="Atlantic/Azores">UTC-01:00</SelectItem>
                              <SelectItem value="UTC">UTC+00:00</SelectItem>
                              <SelectItem value="Europe/Paris">UTC+01:00</SelectItem>
                              <SelectItem value="Europe/Athens">UTC+02:00</SelectItem>
                              <SelectItem value="Europe/Moscow">UTC+03:00</SelectItem>
                              <SelectItem value="Asia/Tehran">UTC+03:30</SelectItem>
                              <SelectItem value="Asia/Dubai">UTC+04:00</SelectItem>
                              <SelectItem value="Asia/Kabul">UTC+04:30</SelectItem>
                              <SelectItem value="Asia/Karachi">UTC+05:00</SelectItem>
                              <SelectItem value="Asia/Kolkata">UTC+05:30</SelectItem>
                              <SelectItem value="Asia/Kathmandu">UTC+05:45</SelectItem>
                              <SelectItem value="Asia/Dhaka">UTC+06:00</SelectItem>
                              <SelectItem value="Asia/Yangon">UTC+06:30</SelectItem>
                              <SelectItem value="Asia/Bangkok">UTC+07:00</SelectItem>
                              <SelectItem value="Asia/Shanghai">UTC+08:00</SelectItem>
                              <SelectItem value="Asia/Tokyo">UTC+09:00</SelectItem>
                              <SelectItem value="Australia/Adelaide">UTC+09:30</SelectItem>
                              <SelectItem value="Australia/Sydney">UTC+10:00</SelectItem>
                              <SelectItem value="Pacific/Noumea">UTC+11:00</SelectItem>
                              <SelectItem value="Pacific/Auckland">UTC+12:00</SelectItem>
                              <SelectItem value="Pacific/Tongatapu">UTC+13:00</SelectItem>
                              <SelectItem value="Pacific/Kiritimati">UTC+14:00</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="language">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              {t('settings.language')}
                            </div>
                          </Label>
                          <Select
                            value={orgSettings.language}
                            onValueChange={(value) => {
                              setOrgSettings({ ...orgSettings, language: value });
                              i18n.changeLanguage(value);
                            }}
                          >
                            <SelectTrigger id="language">
                              <SelectValue />
                            </SelectTrigger>
                             <SelectContent>
                              <SelectItem value="en">{t('settings.languages.en')}</SelectItem>
                              <SelectItem value="es">{t('settings.languages.es')}</SelectItem>
                              <SelectItem value="fr">{t('settings.languages.fr')}</SelectItem>
                              <SelectItem value="de">{t('settings.languages.de')}</SelectItem>
                              <SelectItem value="fi">{t('settings.languages.fi')}</SelectItem>
                              <SelectItem value="sv">{t('settings.languages.sv')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button onClick={saveOrganizationSettings} disabled={savingOrgSettings}>
                        {savingOrgSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('settings.saveChanges')}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('settings.notifications')}</CardTitle>
                      <CardDescription>
                        {t('settings.subtitle')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>{t('settings.emailNotifications')}</Label>
                          <p className="text-sm text-muted-foreground">
                            {t('settings.receiveViaEmail')}
                          </p>
                        </div>
                        <Switch
                          checked={notifications.email_notifications}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, email_notifications: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>{t('settings.inAppNotifications')}</Label>
                          <p className="text-sm text-muted-foreground">
                            {t('settings.showInApp')}
                          </p>
                        </div>
                        <Switch
                          checked={notifications.in_app_notifications}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, in_app_notifications: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>{t('settings.ticketUpdates')}</Label>
                          <p className="text-sm text-muted-foreground">
                            {t('settings.notifyTicketUpdates')}
                          </p>
                        </div>
                        <Switch
                          checked={notifications.ticket_updates}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, ticket_updates: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>{t('settings.newMessages')}</Label>
                          <p className="text-sm text-muted-foreground">
                            {t('settings.notifyNewMessages')}
                          </p>
                        </div>
                        <Switch
                          checked={notifications.new_messages}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, new_messages: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>{t('settings.systemAlerts')}</Label>
                          <p className="text-sm text-muted-foreground">
                            {t('settings.importantUpdates')}
                          </p>
                        </div>
                        <Switch
                          checked={notifications.system_alerts}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, system_alerts: checked })
                          }
                        />
                      </div>

                      <Button onClick={saveNotificationPreferences} disabled={savingNotifications}>
                        {savingNotifications && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('settings.savePreferences')}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="storage" className="space-y-6">
                  <StorageProviderConfig />
                </TabsContent>

                <TabsContent value="ai-features" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('ai.title')}</CardTitle>
                      <CardDescription>
                        {t('ai.description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                        <div className="space-y-0.5">
                          <Label className="text-base font-semibold">{t('ai.enabled')}</Label>
                          <p className="text-sm text-muted-foreground">
                            {t('ai.masterToggle')}
                          </p>
                        </div>
                        <Switch
                          checked={aiSettings.ai_enabled}
                          onCheckedChange={(checked) =>
                            setAiSettings({ ...aiSettings, ai_enabled: checked })
                          }
                        />
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>{t('ai.agent.enabled')}</Label>
                            <p className="text-sm text-muted-foreground">
                              {t('ai.agent.enabledDesc')}
                            </p>
                          </div>
                          <Switch
                            disabled={!aiSettings.ai_enabled}
                            checked={aiSettings.ai_agents_enabled}
                            onCheckedChange={(checked) =>
                              setAiSettings({ ...aiSettings, ai_agents_enabled: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>{t('ai.suggestResponses')}</Label>
                            <p className="text-sm text-muted-foreground">
                              {t('ai.suggestResponsesDesc')}
                            </p>
                          </div>
                          <Switch
                            disabled={!aiSettings.ai_enabled}
                            checked={aiSettings.ai_auto_suggest_responses}
                            onCheckedChange={(checked) =>
                              setAiSettings({ ...aiSettings, ai_auto_suggest_responses: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>{t('ai.sentimentAnalysis')}</Label>
                            <p className="text-sm text-muted-foreground">
                              {t('ai.sentimentAnalysisDesc')}
                            </p>
                          </div>
                          <Switch
                            disabled={!aiSettings.ai_enabled}
                            checked={aiSettings.ai_sentiment_analysis}
                            onCheckedChange={(checked) =>
                              setAiSettings({ ...aiSettings, ai_sentiment_analysis: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>{t('ai.prioritySuggestions')}</Label>
                            <p className="text-sm text-muted-foreground">
                              {t('ai.prioritySuggestionsDesc')}
                            </p>
                          </div>
                          <Switch
                            disabled={!aiSettings.ai_enabled}
                            checked={aiSettings.ai_priority_suggestions}
                            onCheckedChange={(checked) =>
                              setAiSettings({ ...aiSettings, ai_priority_suggestions: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>{t('ai.multiLangTranslation')}</Label>
                            <p className="text-sm text-muted-foreground">
                              {t('ai.multiLangTranslationDesc')}
                            </p>
                          </div>
                          <Switch
                            disabled={!aiSettings.ai_enabled}
                            checked={aiSettings.ai_translation_enabled}
                            onCheckedChange={(checked) =>
                              setAiSettings({ ...aiSettings, ai_translation_enabled: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>{t('ai.knowledgeBaseSuggestions')}</Label>
                            <p className="text-sm text-muted-foreground">
                              {t('ai.knowledgeBaseSuggestionsDesc')}
                            </p>
                          </div>
                          <Switch
                            disabled={!aiSettings.ai_enabled}
                            checked={aiSettings.ai_knowledge_base_enabled}
                            onCheckedChange={(checked) =>
                              setAiSettings({ ...aiSettings, ai_knowledge_base_enabled: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>{t('ai.conversationSummarization')}</Label>
                            <p className="text-sm text-muted-foreground">
                              {t('ai.conversationSummarizationDesc')}
                            </p>
                          </div>
                          <Switch
                            disabled={!aiSettings.ai_enabled}
                            checked={aiSettings.ai_summarization_enabled}
                            onCheckedChange={(checked) =>
                              setAiSettings({ ...aiSettings, ai_summarization_enabled: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>{t('ai.templateSuggestions')}</Label>
                            <p className="text-sm text-muted-foreground">
                              {t('ai.templateSuggestionsDesc')}
                            </p>
                          </div>
                          <Switch
                            disabled={!aiSettings.ai_enabled}
                            checked={aiSettings.ai_template_suggestions_enabled}
                            onCheckedChange={(checked) =>
                              setAiSettings({ ...aiSettings, ai_template_suggestions_enabled: checked })
                            }
                          />
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <p className="text-xs text-muted-foreground mb-4">
                          {t('ai.compliance')}
                        </p>
                        <Button onClick={saveAISettings} disabled={savingAiSettings}>
                          {savingAiSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t('settings.saveChanges')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* AI Auto-Execution Settings */}
                  <AIAutoExecutionSettings
                    enabled={aiSettings.ai_auto_execution_enabled}
                    threshold={aiSettings.ai_auto_execution_threshold}
                    onEnabledChange={(enabled) =>
                      setAiSettings({ ...aiSettings, ai_auto_execution_enabled: enabled })
                    }
                    onThresholdChange={(threshold) =>
                      setAiSettings({ ...aiSettings, ai_auto_execution_threshold: threshold })
                    }
                    enabledActions={aiSettings.ai_auto_execution_actions}
                    onActionToggle={(action, enabled) =>
                      setAiSettings({
                        ...aiSettings,
                        ai_auto_execution_actions: {
                          ...aiSettings.ai_auto_execution_actions,
                          [action]: enabled,
                        },
                      })
                    }
                    onSave={saveAISettings}
                    isSaving={savingAiSettings}
                  />

                  {/* Custom AI Model Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t('customAI.title')}
                      </CardTitle>
                      <CardDescription>
                        {t('customAI.description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label>{t('customAI.aiProvider')}</Label>
                        <Select value={aiProvider} onValueChange={setAiProvider}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="integrated">{t('customAI.integratedAI')}</SelectItem>
                            <SelectItem value="openai">{t('customAI.openAI')}</SelectItem>
                            <SelectItem value="anthropic">{t('customAI.anthropic')}</SelectItem>
                            <SelectItem value="custom">{t('customAI.customEndpoint')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {t('customAI.integratedAIDesc')}
                        </p>
                      </div>

                      {aiProvider !== 'integrated' && (
                        <>
                          <div className="space-y-2">
                            <Label>{t('customAI.apiKey')}</Label>
                            <Input
                              type="password"
                              placeholder={t('customAI.apiKeyPlaceholder')}
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              {t('customAI.apiKeySecure')}
                            </p>
                          </div>

                          {aiProvider === 'openai' && (
                            <div className="space-y-2">
                              <Label>{t('customAI.model')}</Label>
                              <Select value={customModel} onValueChange={setCustomModel}>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('customAI.selectModel')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {aiProvider === 'anthropic' && (
                            <div className="space-y-2">
                              <Label>{t('customAI.model')}</Label>
                              <Select value={customModel} onValueChange={setCustomModel}>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('customAI.selectModel')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                                  <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                                  <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {aiProvider === 'custom' && (
                            <>
                              <div className="space-y-2">
                                <Label>{t('customAI.endpointUrl')}</Label>
                                <Input
                                  placeholder={t('customAI.endpointUrlPlaceholder')}
                                  value={customEndpoint}
                                  onChange={(e) => setCustomEndpoint(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t('customAI.modelName')}</Label>
                                <Input
                                  placeholder={t('customAI.modelNamePlaceholder')}
                                  value={customModel}
                                  onChange={(e) => setCustomModel(e.target.value)}
                                />
                              </div>
                            </>
                          )}

                          <Button variant="outline" onClick={testAIConnection} disabled={testingConnection}>
                            {testingConnection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Info className="mr-2 h-4 w-4" />}
                            {t('customAI.testConnection')}
                          </Button>
                        </>
                      )}

                      <div className="border-t pt-4">
                        <Button onClick={saveCustomAISettings} disabled={savingCustomAI}>
                          {savingCustomAI && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t('customAI.saveConfiguration')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="templates" className="space-y-6">
                  <ResponseTemplateManager />
                </TabsContent>

                <TabsContent value="integrations" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('settings.integrations')}</CardTitle>
                      <CardDescription>
                        {t('settings.subtitle')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {integrations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Plug className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>{t('settings.noIntegrations')}</p>
                          <Button className="mt-4" variant="outline">
                            {t('settings.addIntegration')}
                          </Button>
                        </div>
                      ) : (
                        integrations.map((integration) => (
                          <div
                            key={integration.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              <Plug className="h-8 w-8 text-primary" />
                              <div>
                                <div className="font-medium">{integration.name}</div>
                                <div className="text-sm text-muted-foreground capitalize">
                                  {integration.type}
                                </div>
                              </div>
                            </div>
                             <div className="flex items-center gap-3">
                               <Badge className={getIntegrationBadge(integration.status)}>
                                 {t(`settings.integrationStatus.${integration.status}`)}
                               </Badge>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => {
                                   setSelectedIntegration(integration);
                                   setConfigureDialogOpen(true);
                                 }}
                               >
                                 {t('settings.configure')}
                               </Button>
                             </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('settings.security')} {t('settings.title')}</CardTitle>
                      <CardDescription>
                        {t('settings.subtitle')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>
                            <div className="flex items-center gap-2">
                              <Lock className="h-4 w-4" />
                              {t('settings.twoFactorAuth')}
                            </div>
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {t('settings.require2FA')}
                          </p>
                        </div>
                        <Switch
                          checked={orgSettings.two_factor_required}
                          onCheckedChange={(checked) =>
                            setOrgSettings({ ...orgSettings, two_factor_required: checked })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="session-timeout">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t('settings.sessionTimeout')}
                          </div>
                        </Label>
                        <Input
                          id="session-timeout"
                          type="number"
                          value={orgSettings.session_timeout_minutes}
                          onChange={(e) =>
                            setOrgSettings({
                              ...orgSettings,
                              session_timeout_minutes: parseInt(e.target.value) || 60,
                            })
                          }
                        />
                        <p className="text-sm text-muted-foreground">
                          {t('settings.logoutAfterInactivity')}
                        </p>
                      </div>

                      <Button onClick={saveOrganizationSettings} disabled={savingOrgSettings}>
                        {savingOrgSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('settings.saveSecuritySettings')}
                      </Button>
                    </CardContent>
                  </Card>

                  <TwoFactorSetup />
                  <IPWhitelistManager />
                  <AuditLogViewer />
                </TabsContent>
              </Tabs>
            </div>
        </main>
      </div>

      <ConfigureIntegrationDialog
        open={configureDialogOpen}
        onOpenChange={setConfigureDialogOpen}
        integration={selectedIntegration}
        onSuccess={fetchSettings}
      />
    </>
  );
}

export default Settings;
