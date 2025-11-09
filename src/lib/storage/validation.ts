import { z } from 'zod';

/**
 * Provider Configuration Validation
 * Uses Zod for runtime validation and type safety
 */

// Connection configuration schemas
export const supabaseConnectionSchema = z.object({
  url: z.string().url('Invalid Supabase URL'),
  anonKey: z.string().optional(),
});

export const postgresConnectionSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.number().int().min(1).max(65535, 'Invalid port number'),
  database: z.string().min(1, 'Database name is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  ssl: z.boolean().default(true),
});

export const mysqlConnectionSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.number().int().min(1).max(65535, 'Invalid port number'),
  database: z.string().min(1, 'Database name is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  ssl: z.boolean().default(false),
});

// Features schema
export const featuresSchema = z.object({
  realtime: z.boolean(),
  fileStorage: z.boolean(),
  serverlessFunctions: z.boolean(),
  fullTextSearch: z.boolean(),
  transactions: z.boolean(),
});

// Provider config schemas
export const supabaseProviderConfigSchema = z.object({
  type: z.literal('supabase'),
  connection: supabaseConnectionSchema,
  features: featuresSchema,
});

export const postgresProviderConfigSchema = z.object({
  type: z.literal('postgres'),
  connection: postgresConnectionSchema,
  features: featuresSchema,
});

export const mysqlProviderConfigSchema = z.object({
  type: z.literal('mysql'),
  connection: mysqlConnectionSchema,
  features: featuresSchema,
});

export const customProviderConfigSchema = z.object({
  type: z.literal('custom'),
  connection: z.record(z.any()),
  features: featuresSchema,
});

// Union of all provider configs
export const providerConfigSchema = z.discriminatedUnion('type', [
  supabaseProviderConfigSchema,
  postgresProviderConfigSchema,
  mysqlProviderConfigSchema,
  customProviderConfigSchema,
]);

// Storage configuration schema
export const storageConfigurationSchema = z.object({
  activeProvider: z.enum(['supabase', 'postgres', 'mysql', 'custom']),
  providers: z.object({
    supabase: supabaseProviderConfigSchema.optional(),
    postgres: postgresProviderConfigSchema.optional(),
    mysql: mysqlProviderConfigSchema.optional(),
    custom: customProviderConfigSchema.optional(),
  }),
});

/**
 * Validation functions
 */
export function validateProviderConfig(config: unknown): {
  success: boolean;
  data?: any;
  errors?: string[];
} {
  try {
    const result = providerConfigSchema.safeParse(config);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown validation error'],
    };
  }
}

export function validateStorageConfiguration(config: unknown): {
  success: boolean;
  data?: any;
  errors?: string[];
} {
  try {
    const result = storageConfigurationSchema.safeParse(config);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown validation error'],
    };
  }
}

/**
 * Sanitize sensitive data before logging
 */
export function sanitizeConfig(config: any): any {
  if (!config) return config;
  
  const sanitized = { ...config };
  
  if (sanitized.connection) {
    sanitized.connection = {
      ...sanitized.connection,
      password: '***REDACTED***',
      anonKey: sanitized.connection.anonKey ? '***REDACTED***' : undefined,
    };
  }
  
  return sanitized;
}

/**
 * Validate and sanitize table/column names to prevent SQL injection
 */
export function validateIdentifier(identifier: string): boolean {
  // Allow alphanumeric, underscores, and dots (for schema.table)
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/;
  return validPattern.test(identifier);
}

/**
 * Escape SQL identifiers
 */
export function escapeIdentifier(identifier: string): string {
  if (!validateIdentifier(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
  
  // PostgreSQL/MySQL identifier escaping
  return `"${identifier.replace(/"/g, '""')}"`;
}
