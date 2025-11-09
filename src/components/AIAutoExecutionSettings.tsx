import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, Zap, AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AIAutoExecutionSettingsProps {
  enabled: boolean;
  threshold: number;
  onEnabledChange: (enabled: boolean) => void;
  onThresholdChange: (threshold: number) => void;
  enabledActions: {
    respondToCustomers: boolean;
    updateStatus: boolean;
    changePriority: boolean;
    sendUpdates: boolean;
    logEscalations: boolean;
    scheduleFollowUps: boolean;
  };
  onActionToggle: (action: keyof AIAutoExecutionSettingsProps['enabledActions'], enabled: boolean) => void;
  onSave?: () => void;
  isSaving?: boolean;
}

export function AIAutoExecutionSettings({
  enabled,
  threshold,
  onEnabledChange,
  onThresholdChange,
  enabledActions,
  onActionToggle,
  onSave,
  isSaving = false,
}: AIAutoExecutionSettingsProps) {
  const { t } = useTranslation();

  const getThresholdColor = (value: number) => {
    if (value < 60) return "text-red-600 dark:text-red-400";
    if (value < 80) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  const getThresholdLabel = (value: number) => {
    if (value < 60) return t('ai.autoExecution.permissiveThreshold');
    if (value < 80) return t('ai.autoExecution.balancedThreshold');
    return t('ai.autoExecution.strictThreshold');
  };

  const getThresholdBadge = (value: number) => {
    if (value < 60) return <Badge variant="outline" className="border-red-500 text-red-700 dark:text-red-400">{t('ai.autoExecution.permissive')}</Badge>;
    if (value < 80) return <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">{t('ai.autoExecution.balanced')}</Badge>;
    return <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">{t('ai.autoExecution.strict')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('ai.autoExecution.title')}</CardTitle>
          <CardDescription>
            {t('ai.autoExecution.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master Switch */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-execution-enabled" className="text-base">
                {t('ai.autoExecution.enabled')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('ai.autoExecution.enabledDesc')}
              </p>
            </div>
            <Switch
              id="auto-execution-enabled"
              checked={enabled}
              onCheckedChange={onEnabledChange}
            />
          </div>

          {enabled && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('ai.autoExecution.warningEnabled')}
              </AlertDescription>
            </Alert>
          )}

          {/* Confidence Threshold Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="confidence-threshold" className="text-base">
                {t('ai.autoExecution.threshold')}
              </Label>
              <div className="flex items-center gap-2">
                {getThresholdBadge(threshold)}
                <span className={`text-2xl font-bold ${getThresholdColor(threshold)}`}>
                  {threshold}%
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Slider
                id="confidence-threshold"
                min={0}
                max={100}
                step={1}
                value={[threshold]}
                onValueChange={(value) => onThresholdChange(value[0])}
                disabled={!enabled}
                className="w-full"
              />
              <p className={`text-sm ${enabled ? getThresholdColor(threshold) : 'text-muted-foreground'}`}>
                {getThresholdLabel(threshold)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pt-2">
              <div className="text-left">
                <div className="font-medium text-red-600 dark:text-red-400">0-59%</div>
                <div>{t('ai.autoExecution.permissive')}</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-yellow-600 dark:text-yellow-400">60-79%</div>
                <div>{t('ai.autoExecution.balanced')}</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-green-600 dark:text-green-400">80-100%</div>
                <div>{t('ai.autoExecution.strict')}</div>
              </div>
            </div>
          </div>

          {/* Action Types Preview */}
          <div className="space-y-3 pt-2">
            <Label className="text-base">{t('ai.autoExecution.actionsTitle')}</Label>
            <div className="grid gap-2">
              {[
                { key: 'respondToCustomers' as const, label: t('ai.autoExecution.respondToCustomers'), description: t('ai.autoExecution.respondDesc') },
                { key: 'updateStatus' as const, label: t('ai.autoExecution.updateStatus'), description: t('ai.autoExecution.updateStatusDesc') },
                { key: 'changePriority' as const, label: t('ai.autoExecution.changePriority'), description: t('ai.autoExecution.changePriorityDesc') },
                { key: 'sendUpdates' as const, label: t('ai.autoExecution.sendUpdates'), description: t('ai.autoExecution.sendUpdatesDesc') },
                { key: 'logEscalations' as const, label: t('ai.autoExecution.logEscalations'), description: t('ai.autoExecution.logEscalationsDesc') },
                { key: 'scheduleFollowUps' as const, label: t('ai.autoExecution.scheduleFollowUps'), description: t('ai.autoExecution.scheduleFollowUpsDesc') },
              ].map((action) => (
                <div key={action.key} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{action.label}</div>
                    <div className="text-xs text-muted-foreground">{action.description}</div>
                  </div>
                  <Switch
                    checked={enabledActions[action.key]}
                    onCheckedChange={(checked) => onActionToggle(action.key, checked)}
                    disabled={!enabled}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Safety Information */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{t('ai.autoExecution.safetyTitle')}</p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>{t('ai.autoExecution.safetyPoint1')}</li>
                  <li>{t('ai.autoExecution.safetyPoint2')}</li>
                  <li>{t('ai.autoExecution.safetyPoint3')}</li>
                  <li>{t('ai.autoExecution.safetyPoint4')}</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Save Button */}
          {onSave && (
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('settings.saveChanges')}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export interface AIAutoExecutionSettingsWithSaveProps extends AIAutoExecutionSettingsProps {
  onSave: () => void;
  isSaving: boolean;
}