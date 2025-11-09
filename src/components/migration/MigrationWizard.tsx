import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, ArrowRight, Settings, Play, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { providerRegistry } from '@/lib/storage';
import { migrationJobManager } from '@/lib/storage/migration-job';
import { extractSchema, getTableList } from '@/lib/storage/schema-extraction';
import { compareSchemas } from '@/lib/storage/migrations';
import type { IStorageProvider } from '@/lib/storage/types';

interface MigrationWizardProps {
  open: boolean;
  onClose: () => void;
}

type WizardStep = 'providers' | 'tables' | 'options' | 'review' | 'running';

export function MigrationWizard({ open, onClose }: MigrationWizardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<WizardStep>('providers');
  const [sourceProvider, setSourceProvider] = useState<IStorageProvider | null>(null);
  const [targetProvider, setTargetProvider] = useState<IStorageProvider | null>(null);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [jobName, setJobName] = useState('');
  const [options, setOptions] = useState({
    batchSize: 1000,
    skipExisting: true,
    validateData: true,
    dryRun: false,
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleProviderSelect = async (type: 'source' | 'target', providerId: string) => {
    try {
      let provider: IStorageProvider;
      
      if (providerId === 'supabase') {
        // Use the active Supabase provider
        const active = providerRegistry.getActiveProvider();
        if (!active) throw new Error(t('settings.migration.wizard.noProviderFound'));
        provider = active;
      } else {
        // Try to get configured provider from storage config
        const config = localStorage.getItem('storage-config');
        if (!config) throw new Error(t('settings.migration.wizard.noProviderConfig'));
        
        const parsed = JSON.parse(config);
        const providerConfig = parsed.providers[providerId];
        
        if (!providerConfig) {
          throw new Error(`${providerId} ${t('settings.migration.wizard.providerNotConfigured')}`);
        }
        
        provider = await providerRegistry.getInstance(providerConfig);
      }

      if (type === 'source') {
        setSourceProvider(provider);
        setError(null);
        
        // Load available tables
        try {
          const tables = await getTableList(provider);
          if (tables.length === 0) {
            setError(t('settings.migration.wizard.noTablesFound'));
          }
          setAvailableTables(tables);
        } catch (err) {
          setError(`${t('settings.migration.wizard.failedToLoadTables')}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      } else {
        setTargetProvider(provider);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.migration.wizard.failedToInitialize'));
    }
  };

  const handleTableToggle = (table: string) => {
    setSelectedTables(prev =>
      prev.includes(table) ? prev.filter(t => t !== table) : [...prev, table]
    );
  };

  const handleStartMigration = async () => {
    if (!sourceProvider || !targetProvider || selectedTables.length === 0) return;

    try {
      const job = migrationJobManager.createJob({
        name: jobName || `Migration ${new Date().toLocaleString()}`,
        sourceProvider,
        targetProvider,
        tables: selectedTables,
        options,
      });

      setJobId(job.id);
      setStep('running');

      // Subscribe to progress updates
      const unsubscribe = migrationJobManager.subscribe(event => {
        if (event.jobId === job.id) {
          if (event.type === 'progress') {
            setProgress(event.data.percentComplete);
          } else if (event.type === 'completed') {
            setProgress(100);
            unsubscribe();
          } else if (event.type === 'failed') {
            setError(event.data.error);
            unsubscribe();
          }
        }
      });

      await migrationJobManager.startJob(job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.migration.wizard.migrationFailed'));
    }
  };

  const renderProvidersStep = () => (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertDescription>
          <strong>{t('settings.migration.wizard.testingSetup')}:</strong> {t('settings.migration.wizard.testingSetupDesc')}
        </AlertDescription>
      </Alert>

      <div>
        <Label className="text-lg mb-4 block">{t('settings.migration.wizard.sourceProvider')}</Label>
        <div className="grid grid-cols-2 gap-4">
          {Array.from(providerRegistry.listProviders()).map(([id, metadata]) => (
            <Card
              key={`source-${id}`}
              className={`p-4 cursor-pointer hover:border-primary transition-colors ${
                sourceProvider?.name.toLowerCase() === id.toLowerCase() ? 'border-primary bg-accent' : ''
              }`}
              onClick={() => handleProviderSelect('source', id)}
            >
              <div className="flex items-center gap-3">
                <Database className="h-6 w-6" />
                <div>
                  <div className="font-medium">{metadata.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {t(`settings.migration.wizard.providers.${id.toLowerCase()}`)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center">
        <ArrowRight className="h-6 w-6 text-muted-foreground" />
      </div>

      <div>
        <Label className="text-lg mb-4 block">{t('settings.migration.wizard.targetProvider')}</Label>
        <div className="grid grid-cols-2 gap-4">
          {Array.from(providerRegistry.listProviders()).map(([id, metadata]) => (
            <Card
              key={`target-${id}`}
              className={`p-4 cursor-pointer hover:border-primary transition-colors ${
                targetProvider?.name.toLowerCase() === id.toLowerCase() ? 'border-primary bg-accent' : ''
              }`}
              onClick={() => handleProviderSelect('target', id)}
            >
              <div className="flex items-center gap-3">
                <Database className="h-6 w-6" />
                <div>
                  <div className="font-medium">{metadata.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {t(`settings.migration.wizard.providers.${id.toLowerCase()}`)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Button
        onClick={() => setStep('tables')}
        disabled={!sourceProvider || !targetProvider}
        className="w-full"
      >
        {t('settings.migration.wizard.nextSelectTables')}
      </Button>
    </div>
  );

  const renderTablesStep = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-lg mb-4 block">{t('settings.migration.wizard.selectTables')}</Label>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {availableTables.map(table => (
            <div key={table} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent">
              <Checkbox
                checked={selectedTables.includes(table)}
                onCheckedChange={() => handleTableToggle(table)}
              />
              <Label className="flex-1 cursor-pointer">{table}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep('providers')} className="flex-1">
          {t('settings.migration.wizard.back')}
        </Button>
        <Button
          onClick={() => setStep('options')}
          disabled={selectedTables.length === 0}
          className="flex-1"
        >
          {t('settings.migration.wizard.nextConfigureOptions')}
        </Button>
      </div>
    </div>
  );

  const renderOptionsStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="jobName">{t('settings.migration.wizard.migrationName')}</Label>
          <Input
            id="jobName"
            value={jobName}
            onChange={e => setJobName(e.target.value)}
            placeholder={t('settings.migration.wizard.migrationNamePlaceholder')}
          />
        </div>

        <div>
          <Label htmlFor="batchSize">{t('settings.migration.wizard.batchSize')}</Label>
          <Input
            id="batchSize"
            type="number"
            value={options.batchSize}
            onChange={e => setOptions({ ...options, batchSize: Number(e.target.value) })}
            min={100}
            max={10000}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={options.skipExisting}
              onCheckedChange={checked =>
                setOptions({ ...options, skipExisting: checked as boolean })
              }
            />
            <Label>{t('settings.migration.wizard.skipExisting')}</Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              checked={options.validateData}
              onCheckedChange={checked =>
                setOptions({ ...options, validateData: checked as boolean })
              }
            />
            <Label>{t('settings.migration.wizard.validateData')}</Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              checked={options.dryRun}
              onCheckedChange={checked =>
                setOptions({ ...options, dryRun: checked as boolean })
              }
            />
            <Label>{t('settings.migration.wizard.dryRun')}</Label>
          </div>
        </div>
      </div>

      {options.dryRun && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('settings.migration.wizard.dryRunAlert')}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep('tables')} className="flex-1">
          {t('settings.migration.wizard.back')}
        </Button>
        <Button onClick={() => setStep('review')} className="flex-1">
          {t('settings.migration.wizard.nextReview')}
        </Button>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label className="text-sm text-muted-foreground">{t('settings.migration.wizard.migrationName')}</Label>
          <div className="text-lg font-medium">{jobName || t('settings.migration.wizard.unnamedMigration')}</div>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">{t('settings.migration.wizard.sourceToTarget')}</Label>
          <div className="text-lg font-medium">
            {sourceProvider?.name} → {targetProvider?.name}
          </div>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">{t('settings.migration.wizard.tables')} ({selectedTables.length})</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedTables.map(table => (
              <span key={table} className="px-3 py-1 bg-accent rounded-full text-sm">
                {table}
              </span>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">{t('settings.migration.wizard.options')}</Label>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• {t('settings.migration.wizard.batchSizeOption')}: {options.batchSize}</li>
            <li>• {options.skipExisting ? t('settings.migration.wizard.skipOption') : t('settings.migration.wizard.overwriteOption')}</li>
            <li>• {options.validateData ? t('settings.migration.wizard.validateOption') : t('settings.migration.wizard.skipValidationOption')}</li>
            {options.dryRun && <li>• {t('settings.migration.wizard.dryRunEnabled')}</li>}
          </ul>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep('options')} className="flex-1">
          {t('settings.migration.wizard.back')}
        </Button>
        <Button onClick={handleStartMigration} className="flex-1">
          <Play className="h-4 w-4 mr-2" />
          {t('settings.migration.wizard.startMigration')}
        </Button>
      </div>
    </div>
  );

  const renderRunningStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="text-2xl font-bold">{progress}%</div>
        <Progress value={progress} className="w-full" />
        <div className="text-muted-foreground">
          {progress < 100 ? t('settings.migration.wizard.migrationInProgress') : t('settings.migration.wizard.migrationCompleted')}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {progress === 100 && (
        <Button onClick={onClose} className="w-full">
          {t('settings.migration.wizard.close')}
        </Button>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t('settings.migration.wizard.title')}
          </DialogTitle>
        </DialogHeader>

        {step === 'providers' && renderProvidersStep()}
        {step === 'tables' && renderTablesStep()}
        {step === 'options' && renderOptionsStep()}
        {step === 'review' && renderReviewStep()}
        {step === 'running' && renderRunningStep()}
      </DialogContent>
    </Dialog>
  );
}
