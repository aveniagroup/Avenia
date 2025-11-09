# Storage Provider Registry & Advanced Features

## Overview

The storage abstraction layer now includes:
- **Provider Registry**: Dynamic provider management and discovery
- **Validation Layer**: Runtime config validation with Zod
- **Migration Tools**: Schema comparison and data migration
- **Health Monitoring**: Auto-reconnection and health checks

---

## Provider Registry

### Basic Usage

```typescript
import { providerRegistry } from '@/lib/storage';

// List all available providers
const providers = providerRegistry.listProviders();
for (const [id, metadata] of providers) {
  console.log(`${id}: ${metadata.description}`);
}

// Get provider metadata
const metadata = providerRegistry.getMetadata('postgres');
console.log('Supported features:', metadata?.supportedFeatures);

// Create provider instance
const config = {
  type: 'postgres',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'mydb',
    username: 'user',
    password: 'pass',
    ssl: true,
  },
  features: {
    realtime: false,
    fileStorage: false,
    serverlessFunctions: false,
    fullTextSearch: true,
    transactions: true,
  },
};

const provider = await providerRegistry.getInstance(config);

// Set as active provider
providerRegistry.setActiveProvider('postgres');
```

### Registering Custom Providers

```typescript
import { providerRegistry } from '@/lib/storage';
import { MyCustomProvider } from './providers/MyCustomProvider';

providerRegistry.register('custom', {
  name: 'Custom Provider',
  version: '1.0.0',
  description: 'My custom storage provider',
  supportedFeatures: ['transactions', 'customFeature'],
  factory: async (config) => {
    const provider = new MyCustomProvider(config);
    await provider.initialize();
    return provider;
  },
});
```

---

## Validation

### Validating Provider Configurations

```typescript
import { validateProviderConfig, sanitizeConfig } from '@/lib/storage';

const config = {
  type: 'postgres',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'mydb',
    username: 'user',
    password: 'secret',
    ssl: true,
  },
  features: {
    realtime: false,
    fileStorage: false,
    serverlessFunctions: false,
    fullTextSearch: true,
    transactions: true,
  },
};

// Validate configuration
const result = validateProviderConfig(config);

if (result.success) {
  console.log('Valid config:', result.data);
} else {
  console.error('Validation errors:', result.errors);
}

// Sanitize for logging (removes passwords)
const safe = sanitizeConfig(config);
console.log('Safe to log:', safe);
```

### SQL Injection Prevention

```typescript
import { validateIdentifier, escapeIdentifier } from '@/lib/storage';

const tableName = 'users';

// Validate identifier
if (!validateIdentifier(tableName)) {
  throw new Error('Invalid table name');
}

// Escape identifier for SQL
const escaped = escapeIdentifier(tableName);
console.log(escaped); // "users"
```

---

## Migrations

### Migrating Data Between Providers

```typescript
import { migrateData, providerRegistry } from '@/lib/storage';

// Get source and target providers
const sourceConfig = { type: 'supabase', /* ... */ };
const targetConfig = { type: 'postgres', /* ... */ };

const source = await providerRegistry.getInstance(sourceConfig);
const target = await providerRegistry.getInstance(targetConfig);

// Migrate specific tables
const result = await migrateData(
  source,
  target,
  ['tickets', 'profiles', 'organizations'],
  {
    batchSize: 500,
    skipExisting: true,
    validateData: true,
  }
);

console.log('Migration result:', {
  success: result.success,
  tablesProcessed: result.tablesProcessed,
  rowsMigrated: result.rowsMigrated,
  duration: result.duration,
  errors: result.errors,
  warnings: result.warnings,
});
```

### Schema Comparison

```typescript
import { extractSchema, compareSchemas, generateMigrationSQL } from '@/lib/storage';

// Extract schemas
const schema1 = await extractSchema(sourceProvider, ['tickets', 'profiles']);
const schema2 = await extractSchema(targetProvider, ['tickets', 'profiles']);

// Compare schemas
const differences = await compareSchemas(schema1, schema2);

console.log('Missing tables:', differences.missingTables);
console.log('Extra tables:', differences.extraTables);
console.log('Column differences:', differences.columnDifferences);

// Generate migration SQL
const sql = generateMigrationSQL(differences, 'postgres');
console.log('Migration SQL:', sql);
```

---

## Health Monitoring

### Basic Health Monitoring

```typescript
import { HealthMonitor } from '@/lib/storage';

const provider = await providerRegistry.getInstance(config);

const monitor = new HealthMonitor(provider, {
  checkInterval: 30000, // 30 seconds
  timeout: 5000, // 5 seconds
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  
  onHealthChange: (status) => {
    console.log('Health changed:', status);
    if (!status.healthy) {
      // Show error notification
    }
  },
  
  onReconnect: (success) => {
    console.log('Reconnection:', success ? 'success' : 'failed');
  },
});

// Start monitoring
monitor.start();

// Get current status
const status = monitor.getStatus();
console.log('Current health:', status);

// Force reconnection
await monitor.forceReconnect();

// Stop monitoring
monitor.stop();
```

### Global Monitoring Manager

```typescript
import { monitoringManager, providerRegistry } from '@/lib/storage';

// Monitor a provider
const provider = await providerRegistry.getInstance(config);
const monitor = monitoringManager.monitor('postgres', provider, {
  checkInterval: 30000,
  onHealthChange: (status) => {
    console.log('Provider health changed:', status);
  },
});

// Get all health statuses
const allStatuses = monitoringManager.getAllStatuses();
for (const [id, status] of allStatuses) {
  console.log(`${id}: ${status.healthy ? 'healthy' : 'unhealthy'}`);
}

// Stop monitoring specific provider
monitoringManager.stopMonitoring('postgres');

// Stop all monitoring
monitoringManager.stopAll();
```

---

## Integration with React

### Provider Context with Monitoring

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import { providerRegistry, monitoringManager, type HealthStatus } from '@/lib/storage';

const ProviderHealthContext = createContext<{
  health: Map<string, HealthStatus>;
  forceReconnect: (providerId: string) => Promise<void>;
} | null>(null);

export function ProviderHealthProvider({ children }: { children: React.ReactNode }) {
  const [health, setHealth] = useState<Map<string, HealthStatus>>(new Map());

  useEffect(() => {
    // Start monitoring active provider
    const activeProvider = providerRegistry.getActiveProvider();
    if (activeProvider) {
      monitoringManager.monitor('active', activeProvider, {
        onHealthChange: (status) => {
          setHealth(prev => new Map(prev).set('active', status));
        },
      });
    }

    return () => {
      monitoringManager.stopAll();
    };
  }, []);

  const forceReconnect = async (providerId: string) => {
    const monitor = monitoringManager.getMonitor(providerId);
    if (monitor) {
      await monitor.forceReconnect();
    }
  };

  return (
    <ProviderHealthContext.Provider value={{ health, forceReconnect }}>
      {children}
    </ProviderHealthContext.Provider>
  );
}

export function useProviderHealth() {
  const context = useContext(ProviderHealthContext);
  if (!context) {
    throw new Error('useProviderHealth must be used within ProviderHealthProvider');
  }
  return context;
}
```

---

## Best Practices

### Security
1. **Always validate configs** before creating providers
2. **Sanitize configs** before logging
3. **Validate identifiers** to prevent SQL injection
4. **Use Zod schemas** for runtime type safety

### Performance
1. **Reuse provider instances** via registry
2. **Use batch operations** for migrations
3. **Monitor connection health** proactively
4. **Set appropriate timeouts** for health checks

### Error Handling
1. **Check migration results** for errors and warnings
2. **Handle reconnection failures** gracefully
3. **Log validation errors** for debugging
4. **Provide user feedback** on health changes

### Monitoring
1. **Start monitoring** when provider is created
2. **Stop monitoring** when provider is destroyed
3. **Set reasonable intervals** (30s recommended)
4. **Handle auto-reconnection** failures

---

## Troubleshooting

### Validation Errors
```typescript
const result = validateProviderConfig(config);
if (!result.success) {
  console.error('Validation failed:');
  result.errors?.forEach(err => console.error(`  - ${err}`));
}
```

### Migration Failures
```typescript
const result = await migrateData(source, target, tables, {
  skipExisting: true, // Continue on errors
});

if (!result.success) {
  console.error('Migration errors:', result.errors);
  console.warn('Warnings:', result.warnings);
}
```

### Connection Issues
```typescript
const monitor = monitoringManager.getMonitor('postgres');
const status = monitor?.getStatus();

if (!status?.healthy) {
  console.error('Provider unhealthy:', status?.error);
  console.log('Consecutive failures:', status?.consecutiveFailures);
  
  // Force reconnect
  await monitor?.forceReconnect();
}
```

---

## API Reference

See inline JSDoc comments in:
- `src/lib/storage/ProviderRegistry.ts`
- `src/lib/storage/validation.ts`
- `src/lib/storage/migrations.ts`
- `src/lib/storage/monitoring.ts`
