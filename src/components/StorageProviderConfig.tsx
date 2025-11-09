import { useState, useEffect } from "react";
import { Database, Server, Check, X, Loader2, AlertCircle, Info, TestTube, ArrowRightLeft, History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MigrationWizard } from "./migration/MigrationWizard";
import { MigrationHistory } from "./migration/MigrationHistory";
import { MigrationTestGuide } from "./migration/MigrationTestGuide";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  getStorageConfig,
  setStorageConfig,
  setActiveProvider,
  testProviderConnection,
  type StorageConfiguration,
  type ProviderConfig,
} from "@/lib/storage";

export function StorageProviderConfig() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [config, setConfig] = useState<StorageConfiguration | null>(null);
  const [activeProvider, setActiveProviderState] = useState<'supabase' | 'postgres' | 'mysql' | 'custom'>('supabase');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMigrationWizard, setShowMigrationWizard] = useState(false);
  const [showMigrationHistory, setShowMigrationHistory] = useState(false);

  // PostgreSQL connection settings
  const [pgHost, setPgHost] = useState('');
  const [pgPort, setPgPort] = useState('5432');
  const [pgDatabase, setPgDatabase] = useState('');
  const [pgUsername, setPgUsername] = useState('');
  const [pgPassword, setPgPassword] = useState('');
  const [pgSsl, setPgSsl] = useState(true);

  // MySQL connection settings
  const [mysqlHost, setMysqlHost] = useState('');
  const [mysqlPort, setMysqlPort] = useState('3306');
  const [mysqlDatabase, setMysqlDatabase] = useState('');
  const [mysqlUsername, setMysqlUsername] = useState('');
  const [mysqlPassword, setMysqlPassword] = useState('');
  const [mysqlSsl, setMysqlSsl] = useState(true);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = () => {
    const currentConfig = getStorageConfig();
    setConfig(currentConfig);
    setActiveProviderState(currentConfig.activeProvider);

    // Load existing PostgreSQL config
    if (currentConfig.providers.postgres) {
      setPgHost(currentConfig.providers.postgres.connection.host || '');
      setPgPort(String(currentConfig.providers.postgres.connection.port || '5432'));
      setPgDatabase(currentConfig.providers.postgres.connection.database || '');
      setPgUsername(currentConfig.providers.postgres.connection.username || '');
      setPgSsl(currentConfig.providers.postgres.connection.ssl ?? true);
    }

    // Load existing MySQL config
    if (currentConfig.providers.mysql) {
      setMysqlHost(currentConfig.providers.mysql.connection.host || '');
      setMysqlPort(String(currentConfig.providers.mysql.connection.port || '3306'));
      setMysqlDatabase(currentConfig.providers.mysql.connection.database || '');
      setMysqlUsername(currentConfig.providers.mysql.connection.username || '');
      setMysqlSsl(currentConfig.providers.mysql.connection.ssl ?? true);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      let providerConfig: ProviderConfig;

      if (activeProvider === 'postgres') {
        providerConfig = {
          type: 'postgres',
          connection: {
            host: pgHost,
            port: parseInt(pgPort),
            database: pgDatabase,
            username: pgUsername,
            password: pgPassword,
            ssl: pgSsl,
          },
          features: {
            realtime: false,
            fileStorage: false,
            serverlessFunctions: false,
            fullTextSearch: true,
            transactions: true,
          },
        };
      } else if (activeProvider === 'mysql') {
        providerConfig = {
          type: 'mysql',
          connection: {
            host: mysqlHost,
            port: parseInt(mysqlPort),
            database: mysqlDatabase,
            username: mysqlUsername,
            password: mysqlPassword,
            ssl: mysqlSsl,
          },
          features: {
            realtime: false,
            fileStorage: false,
            serverlessFunctions: false,
            fullTextSearch: true,
            transactions: true,
          },
        };
      } else {
        // Supabase - always available
        toast({
          title: "Connection successful",
          description: "Supabase provider is connected and healthy",
        });
        return;
      }

      const result = await testProviderConnection(providerConfig);

      if (result.success) {
        toast({
          title: "Connection successful",
          description: "Successfully connected to the database",
        });
      } else {
        toast({
          title: "Connection failed",
          description: result.error || "Failed to connect to database",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Test failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newConfig: StorageConfiguration = {
        activeProvider,
        providers: {
          supabase: config?.providers.supabase,
          ...(activeProvider === 'postgres' && {
            postgres: {
              type: 'postgres',
              connection: {
                host: pgHost,
                port: parseInt(pgPort),
                database: pgDatabase,
                username: pgUsername,
                password: pgPassword,
                ssl: pgSsl,
              },
              features: {
                realtime: false,
                fileStorage: false,
                serverlessFunctions: false,
                fullTextSearch: true,
                transactions: true,
              },
            },
          }),
          ...(activeProvider === 'mysql' && {
            mysql: {
              type: 'mysql',
              connection: {
                host: mysqlHost,
                port: parseInt(mysqlPort),
                database: mysqlDatabase,
                username: mysqlUsername,
                password: mysqlPassword,
                ssl: mysqlSsl,
              },
              features: {
                realtime: false,
                fileStorage: false,
                serverlessFunctions: false,
                fullTextSearch: true,
                transactions: true,
              },
            },
          }),
        },
      };

      setStorageConfig(newConfig);
      setActiveProvider(activeProvider);

      toast({
        title: "Configuration saved",
        description: "Storage provider settings updated successfully",
      });
      
      // Warn about page reload
      toast({
        title: "Reload required",
        description: "Please refresh the page to apply the new provider settings",
      });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getFeatureIcon = (supported: boolean) => {
    return supported ? (
      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Current Provider Status */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>{t('settings.storage.currentProvider')}:</strong> {config?.activeProvider === 'supabase' ? t('settings.storage.defaultProvider') : config?.activeProvider === 'postgres' ? t('settings.storage.postgresql') : t('settings.storage.mysql')}
          <br />
          <span className="text-xs text-muted-foreground">
            {t('settings.storage.switchProviders')}
          </span>
        </AlertDescription>
      </Alert>

      {/* Provider Selection */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {t('settings.storage.title')}
            </CardTitle>
            <CardDescription>
              {t('settings.storage.chooseBackend')}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMigrationHistory(!showMigrationHistory)}
            >
              <History className="h-4 w-4 mr-2" />
              {t('settings.storage.history')}
            </Button>
            <Button
              size="sm"
              onClick={() => setShowMigrationWizard(true)}
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              {t('settings.storage.migrate')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('settings.storage.activeProvider')}</Label>
            <Select value={activeProvider} onValueChange={(value: any) => setActiveProviderState(value)}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="supabase">{t('settings.storage.defaultProvider')}</SelectItem>
                <SelectItem value="postgres">PostgreSQL (Custom)</SelectItem>
                <SelectItem value="mysql">MySQL (Custom)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeProvider === 'supabase' && (
            <Alert>
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription>
                {t('settings.storage.defaultDescription')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* PostgreSQL Configuration */}
      {activeProvider === 'postgres' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              PostgreSQL Configuration
            </CardTitle>
            <CardDescription>
              Configure connection to your PostgreSQL database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pg-host">Host</Label>
                <Input
                  id="pg-host"
                  value={pgHost}
                  onChange={(e) => setPgHost(e.target.value)}
                  placeholder="your-db.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pg-port">Port</Label>
                <Input
                  id="pg-port"
                  value={pgPort}
                  onChange={(e) => setPgPort(e.target.value)}
                  placeholder="5432"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pg-database">Database Name</Label>
              <Input
                id="pg-database"
                value={pgDatabase}
                onChange={(e) => setPgDatabase(e.target.value)}
                placeholder="my_database"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pg-username">Username</Label>
                <Input
                  id="pg-username"
                  value={pgUsername}
                  onChange={(e) => setPgUsername(e.target.value)}
                  placeholder="db_user"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pg-password">Password</Label>
                <Input
                  id="pg-password"
                  type="password"
                  value={pgPassword}
                  onChange={(e) => setPgPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="pg-ssl"
                checked={pgSsl}
                onCheckedChange={setPgSsl}
              />
              <Label htmlFor="pg-ssl">Use SSL/TLS</Label>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                onClick={handleTestConnection}
                disabled={testing || !pgHost || !pgDatabase}
                variant="outline"
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MySQL Configuration */}
      {activeProvider === 'mysql' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              MySQL Configuration
            </CardTitle>
            <CardDescription>
              Configure connection to your MySQL database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mysql-host">Host</Label>
                <Input
                  id="mysql-host"
                  value={mysqlHost}
                  onChange={(e) => setMysqlHost(e.target.value)}
                  placeholder="your-db.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mysql-port">Port</Label>
                <Input
                  id="mysql-port"
                  value={mysqlPort}
                  onChange={(e) => setMysqlPort(e.target.value)}
                  placeholder="3306"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mysql-database">Database Name</Label>
              <Input
                id="mysql-database"
                value={mysqlDatabase}
                onChange={(e) => setMysqlDatabase(e.target.value)}
                placeholder="my_database"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mysql-username">Username</Label>
                <Input
                  id="mysql-username"
                  value={mysqlUsername}
                  onChange={(e) => setMysqlUsername(e.target.value)}
                  placeholder="db_user"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mysql-password">Password</Label>
                <Input
                  id="mysql-password"
                  type="password"
                  value={mysqlPassword}
                  onChange={(e) => setMysqlPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="mysql-ssl"
                checked={mysqlSsl}
                onCheckedChange={setMysqlSsl}
              />
              <Label htmlFor="mysql-ssl">Use SSL/TLS</Label>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                onClick={handleTestConnection}
                disabled={testing || !mysqlHost || !mysqlDatabase}
                variant="outline"
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Capabilities Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.storage.featureCapabilities')}</CardTitle>
          <CardDescription>
            {t('settings.storage.featureCapabilitiesDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2 font-medium text-sm pb-2 border-b">
              <div>{t('settings.storage.feature')}</div>
              <div className="text-center">{t('settings.storage.supabase')}</div>
              <div className="text-center">{t('settings.storage.postgresql')}</div>
              <div className="text-center">{t('settings.storage.mysql')}</div>
            </div>

            {[
              { name: t('settings.storage.crudOperations'), supabase: true, postgres: true, mysql: true },
              { name: t('settings.storage.realtimeUpdates'), supabase: true, postgres: false, mysql: false },
              { name: t('settings.storage.fileStorage'), supabase: true, postgres: false, mysql: false },
              { name: t('settings.storage.authentication'), supabase: true, postgres: true, mysql: true },
              { name: t('settings.storage.edgeFunctions'), supabase: true, postgres: false, mysql: false },
              { name: t('settings.storage.fullTextSearch'), supabase: true, postgres: true, mysql: true },
              { name: t('settings.storage.transactions'), supabase: true, postgres: true, mysql: true },
              { name: t('settings.storage.connectionPooling'), supabase: true, postgres: true, mysql: true },
            ].map((feature) => (
              <div key={feature.name} className="grid grid-cols-4 gap-2 text-sm py-2">
                <div>{feature.name}</div>
                <div className="flex justify-center">{getFeatureIcon(feature.supabase)}</div>
                <div className="flex justify-center">
                  {feature.postgres ? (
                    getFeatureIcon(true)
                  ) : feature.name === t('settings.storage.realtimeUpdates') ? (
                    <Badge variant="outline" className="text-xs">{t('settings.storage.polling')}</Badge>
                  ) : (
                    getFeatureIcon(false)
                  )}
                </div>
                <div className="flex justify-center">{getFeatureIcon(feature.mysql)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          <p className="font-medium">{t('settings.storage.importantNotes')}:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>{t('settings.storage.postgresPolling')}</li>
            <li>{t('settings.storage.customProvidersStorage')}</li>
            <li>{t('settings.storage.credentialsStored')}</li>
            <li>{t('settings.storage.reloadRequired')}</li>
            <li>{t('settings.storage.seeDocs')}</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Migration Test Guide */}
      <MigrationTestGuide />

      {showMigrationHistory && <MigrationHistory />}

      <MigrationWizard
        open={showMigrationWizard}
        onClose={() => setShowMigrationWizard(false)}
      />

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={handleSave}
          disabled={saving || (activeProvider === 'postgres' && (!pgHost || !pgDatabase)) || (activeProvider === 'mysql' && (!mysqlHost || !mysqlDatabase))}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('settings.storage.saving')}
            </>
          ) : (
            t('settings.storage.saveConfiguration')
          )}
        </Button>
      </div>
    </div>
  );
}
