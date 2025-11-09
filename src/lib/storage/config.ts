import type { ProviderConfig } from './types';

/**
 * Storage Configuration Manager
 * Handles storage provider configuration and credentials
 */

export interface StorageConfiguration {
  activeProvider: 'supabase' | 'postgres' | 'mysql' | 'custom';
  providers: {
    supabase?: ProviderConfig;
    postgres?: ProviderConfig;
    mysql?: ProviderConfig;
    custom?: ProviderConfig;
  };
}

// Default configuration
const DEFAULT_CONFIG: StorageConfiguration = {
  activeProvider: 'supabase',
  providers: {
    supabase: {
      type: 'supabase',
      connection: {
        url: import.meta.env.VITE_SUPABASE_URL,
      },
      features: {
        realtime: true,
        fileStorage: true,
        serverlessFunctions: true,
        fullTextSearch: true,
        transactions: true,
      },
    },
  },
};

/**
 * Get current storage configuration
 */
export function getStorageConfig(): StorageConfiguration {
  const stored = localStorage.getItem('storage_config');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}

/**
 * Save storage configuration
 */
export function setStorageConfig(config: StorageConfiguration): void {
  localStorage.setItem('storage_config', JSON.stringify(config));
}

/**
 * Get active provider configuration
 */
export function getActiveProviderConfig(): ProviderConfig | null {
  const config = getStorageConfig();
  return config.providers[config.activeProvider] || null;
}

/**
 * Update active provider
 */
export function setActiveProvider(provider: StorageConfiguration['activeProvider']): void {
  const config = getStorageConfig();
  config.activeProvider = provider;
  setStorageConfig(config);
}

/**
 * Test provider connection
 */
export async function testProviderConnection(
  providerConfig: ProviderConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    // This will be implemented per provider
    // For now, just validate config structure
    if (!providerConfig.connection.url && !providerConfig.connection.host) {
      return { success: false, error: 'Missing connection details' };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
