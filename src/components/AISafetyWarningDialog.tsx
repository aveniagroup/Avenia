import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";

interface AISafetyWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  piiTypes: string[];
  sensitivityLevel: string;
  gdprRelevant: boolean;
  onProceed: (consent: boolean) => void;
  onCancel: () => void;
}

const getPIIDescription = (type: string, t: any): string => {
  const descriptions: Record<string, string> = {
    email: t('privacy.piiTypes.email'),
    phone: t('privacy.piiTypes.phone'),
    credit_card: t('privacy.piiTypes.creditCard'),
    ssn: t('privacy.piiTypes.ssn'),
    medical: t('privacy.piiTypes.medical'),
    financial: t('privacy.piiTypes.financial'),
    personal: t('privacy.piiTypes.personal'),
    auth: t('privacy.piiTypes.auth'),
    ip_address: t('privacy.piiTypes.ipAddress'),
    postal_code: t('privacy.piiTypes.postalCode'),
  };
  return descriptions[type] || type;
};

const SENSITIVITY_COLORS: Record<string, string> = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

export function AISafetyWarningDialog({
  open,
  onOpenChange,
  piiTypes,
  sensitivityLevel,
  gdprRelevant,
  onProceed,
  onCancel,
}: AISafetyWarningDialogProps) {
  const [anonymizeData, setAnonymizeData] = useState(true);
  const { t } = useTranslation();

  const handleProceed = () => {
    onProceed(anonymizeData);
    setAnonymizeData(true);
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-6 w-6 ${sensitivityLevel === 'critical' || sensitivityLevel === 'high' ? 'text-destructive' : 'text-warning'}`} />
            <DialogTitle className="text-xl">{t('privacy.sensitiveDataDetected')}</DialogTitle>
          </div>
          <DialogDescription>
            {t('privacy.requiresSpecialHandling')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {/* Sensitivity Level */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('privacy.sensitivityLevel')}:</span>
              <Badge className={`${SENSITIVITY_COLORS[sensitivityLevel]} text-white`}>
                {t(`privacy.${sensitivityLevel}`).toUpperCase()}
              </Badge>
            </div>

            {/* Detected PII Types */}
            <div>
              <h4 className="text-sm font-semibold mb-2">
                {t('privacy.personalDataDetected')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {piiTypes.map((type) => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {getPIIDescription(type, t)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* GDPR Notice */}
            {gdprRelevant && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>{t('privacy.gdprArticle9')}</strong>
                  <p className="mt-1 text-sm">
                    {t('privacy.gdprArticle9Description')}
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Data Protection Options */}
            <div className="space-y-3">
              <h4 className="font-medium">
                {t('privacy.recommendedActions')}
              </h4>
              <div className="flex items-start space-x-2 bg-muted/50 p-3 rounded-md">
                <Checkbox
                  id="anonymize"
                  checked={anonymizeData}
                  onCheckedChange={(checked) => setAnonymizeData(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="anonymize"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {t('privacy.anonymizeData')} ({t('privacy.recommended')})
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {t('privacy.anonymizeDescription')}
                  </p>
                </div>
              </div>
            </div>

            {/* Learn More Links */}
            <div className="flex flex-wrap gap-2 text-xs">
              <a 
                href="https://gdpr-info.eu/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                {t('privacy.learnAboutGDPR')} <ExternalLink className="h-3 w-3" />
              </a>
              <span className="text-muted-foreground">•</span>
              <a 
                href="https://artificialintelligenceact.eu/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                {t('privacy.euAIActInfo')} <ExternalLink className="h-3 w-3" />
              </a>
            </div>

          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleProceed}
          >
            {t('privacy.proceedWithAI')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}