/**
 * Storage Abstraction Layer - Main Exports
 * 
 * This module provides a pluggable storage backend system.
 * Currently wraps Supabase, but designed to support multiple providers.
 */

// Core types
export type {
  IStorageProvider,
  IQueryBuilder,
  IAuthProvider,
  ProviderConfig,
  QueryResult,
  QueryResultList,
  QueryFilter,
  AuthUser,
  AuthSession,
  SignUpCredentials,
  SignInCredentials,
  StorageFile,
  RealtimeChannel,
  RealtimePayload,
} from './types';

// Base classes
export { BaseStorageProvider } from './BaseStorageProvider';
export { BaseQueryBuilder } from './QueryBuilder';

// Providers
export { SupabaseProvider } from './providers/SupabaseProvider';
export { PostgresProvider } from './providers/PostgresProvider';
export { MySQLProvider } from './providers/MySQLProvider';

// Configuration
export {
  getStorageConfig,
  setStorageConfig,
  getActiveProviderConfig,
  setActiveProvider,
  testProviderConnection,
  type StorageConfiguration,
} from './config';

// React context
export { StorageProvider, useStorage, useStorageProvider } from './StorageContext';

// RLS and Polling
export { applyRLSFilters, canInsert, canUpdate, canDelete, addRLSRule, getRLSRules } from './rls';
export { PollingManager } from './polling';

// Provider Registry
export { providerRegistry, type ProviderMetadata } from './ProviderRegistry';

// Validation
export {
  validateProviderConfig,
  validateStorageConfiguration,
  sanitizeConfig,
  validateIdentifier,
  escapeIdentifier,
  type supabaseConnectionSchema,
  type postgresConnectionSchema,
  type mysqlConnectionSchema,
} from './validation';

// Migrations
export {
  migrateData,
  compareSchemas,
  generateMigrationSQL,
  type TableSchema,
  type ColumnDefinition,
  type MigrationResult,
} from './migrations';

// Schema Extraction
export {
  extractSchema,
  getTableList,
  tableExists,
  type SchemaExtractionOptions,
} from './schema-extraction';

// Transformation
export {
  applyTransformations,
  validateTransformationConfig,
  createIdentityTransformation,
  mergeTransformations,
  TransformFunctions,
  type TransformFunction,
  type ColumnTransformation,
  type TableTransformation,
  type TransformationConfig,
} from './transformation';

// Migration Jobs
export {
  migrationJobManager,
  MigrationJobManager,
  type MigrationJob,
  type MigrationJobStatus,
  type MigrationCheckpoint,
  type MigrationJobEvent,
} from './migration-job';

// Monitoring
export {
  HealthMonitor,
  monitoringManager,
  type HealthStatus,
  type MonitoringConfig,
} from './monitoring';

// Singleton instance for non-React usage
import { SupabaseProvider } from './providers/SupabaseProvider';
import type { IStorageProvider } from './types';

let storageInstance: IStorageProvider | null = null;

/**
 * Get global storage instance
 * For use outside React components
 */
export async function getStorageInstance(): Promise<IStorageProvider> {
  if (!storageInstance) {
    storageInstance = new SupabaseProvider();
    await storageInstance.initialize();
  }
  return storageInstance;
}

/**
 * Create a new storage instance
 */
export async function createStorageInstance(
  provider: IStorageProvider
): Promise<IStorageProvider> {
  await provider.initialize();
  return provider;
}
