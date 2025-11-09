import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Database, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function MigrationTestGuide() {
  const { t } = useTranslation();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          {t('settings.migration.testGuide')}
        </CardTitle>
        <CardDescription>
          {t('settings.migration.testGuideDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            <strong>{t('settings.migration.prerequisites')}:</strong> {t('settings.migration.prerequisitesDesc')}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Badge variant="outline" className="rounded-full w-6 h-6 flex items-center justify-center p-0">
                1
              </Badge>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">{t('settings.migration.step1')}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {t('settings.migration.step1Desc')}
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>{t('settings.migration.step1Item1')}</li>
                <li>{t('settings.migration.step1Item2')}</li>
                <li>{t('settings.migration.step1Item3')}</li>
                <li>{t('settings.migration.step1Item4')}</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Badge variant="outline" className="rounded-full w-6 h-6 flex items-center justify-center p-0">
                2
              </Badge>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">{t('settings.migration.step2')}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {t('settings.migration.step2Desc')}
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>{t('settings.migration.step2Item1')}</li>
                <li>{t('settings.migration.step2Item2')}</li>
                <li>{t('settings.migration.step2Item3')}</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Badge variant="outline" className="rounded-full w-6 h-6 flex items-center justify-center p-0">
                3
              </Badge>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">{t('settings.migration.step3')}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {t('settings.migration.step3Desc')}
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>{t('settings.migration.step3Item1')}</li>
                <li>{t('settings.migration.step3Item2')}</li>
                <li>{t('settings.migration.step3Item3')}</li>
                <li>{t('settings.migration.step3Item4')}</li>
                <li>{t('settings.migration.step3Item5')}</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Badge variant="outline" className="rounded-full w-6 h-6 flex items-center justify-center p-0">
                4
              </Badge>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">{t('settings.migration.step4')}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {t('settings.migration.step4Desc')}
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>{t('settings.migration.step4Item1')}</li>
                <li>{t('settings.migration.step4Item2')}</li>
                <li>{t('settings.migration.step4Item3')}</li>
                <li>{t('settings.migration.step4Item4')}</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Badge variant="outline" className="rounded-full w-6 h-6 flex items-center justify-center p-0">
                5
              </Badge>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">{t('settings.migration.step5')}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {t('settings.migration.step5Desc')}
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>{t('settings.migration.step5Item1')}</li>
                <li>{t('settings.migration.step5Item2')}</li>
                <li>{t('settings.migration.step5Item3')}</li>
                <li>{t('settings.migration.step5Item4')}</li>
              </ul>
            </div>
          </div>
        </div>

        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('settings.migration.proTip')}:</strong> {t('settings.migration.proTipDesc')}
          </AlertDescription>
        </Alert>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">{t('settings.migration.commonScenarios')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <span>{t('settings.migration.scenario1')}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <span>{t('settings.migration.scenario2')}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <span>{t('settings.migration.scenario3')}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <span>{t('settings.migration.scenario4')}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
