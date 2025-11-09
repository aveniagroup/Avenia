import type { IStorageProvider, ProviderConfig } from './types';
import { SupabaseProvider } from './providers/SupabaseProvider';
import { PostgresProvider } from './providers/PostgresProvider';
import { MySQLProvider } from './providers/MySQLProvider';
import { validateProviderConfig, sanitizeConfig } from './validation';

/**
 * Provider Factory and Registry
 * Manages provider instances and lifecycle
 */

export interface ProviderMetadata {
  name: string;
  version: string;
  description: string;
  supportedFeatures: string[];
  factory: (config: ProviderConfig) => Promise<IStorageProvider>;
}

class ProviderRegistry {
  private providers = new Map<string, ProviderMetadata>();
  private instances = new Map<string, IStorageProvider>();
  private activeProviderId: string | null = null;

  constructor() {
    this.registerDefaultProviders();
  }

  /**
   * Register default providers
   */
  private registerDefaultProviders() {
    // Supabase
    this.register('supabase', {
      name: 'Supabase',
      version: '1.0.0',
      description: 'Full-featured Supabase backend with real-time, storage, and auth',
      supportedFeatures: [
        'realtime',
        'fileStorage',
        'serverlessFunctions',
        'authentication',
        'fullTextSearch',
        'transactions',
      ],
      factory: async (config: ProviderConfig) => {
        const provider = new SupabaseProvider();
        await provider.initialize();
        return provider;
      },
    });

    // PostgreSQL
    this.register('postgres', {
      name: 'PostgreSQL',
      version: '1.0.0',
      description: 'Customer-hosted PostgreSQL with application-level RLS',
      supportedFeatures: [
        'fullTextSearch',
        'transactions',
        'connectionPooling',
      ],
      factory: async (config: ProviderConfig) => {
        if (config.type !== 'postgres') {
          throw new Error('Invalid config type for PostgreSQL provider');
        }
        const provider = new PostgresProvider(config.connection as any);
        await provider.initialize();
        return provider;
      },
    });

    // MySQL
    this.register('mysql', {
      name: 'MySQL',
      version: '1.0.0',
      description: 'Customer-hosted MySQL with application-level RLS',
      supportedFeatures: [
        'fullTextSearch',
        'transactions',
        'connectionPooling',
      ],
      factory: async (config: ProviderConfig) => {
        if (config.type !== 'mysql') {
          throw new Error('Invalid config type for MySQL provider');
        }
        const provider = new MySQLProvider(config.connection as any);
        await provider.initialize();
        return provider;
      },
    });

    console.log('[ProviderRegistry] Registered default providers:', [
      ...this.providers.keys(),
    ]);
  }

  /**
   * Register a new provider
   */
  register(id: string, metadata: ProviderMetadata): void {
    if (this.providers.has(id)) {
      console.warn(`[ProviderRegistry] Provider "${id}" is already registered`);
    }
    
    this.providers.set(id, metadata);
    console.log(`[ProviderRegistry] Registered provider: ${id}`);
  }

  /**
   * Unregister a provider
   */
  unregister(id: string): void {
    this.providers.delete(id);
    console.log(`[ProviderRegistry] Unregistered provider: ${id}`);
  }

  /**
   * Get provider metadata
   */
  getMetadata(id: string): ProviderMetadata | undefined {
    return this.providers.get(id);
  }

  /**
   * List all registered providers
   */
  listProviders(): Map<string, ProviderMetadata> {
    return new Map(this.providers);
  }

  /**
   * Create provider instance from config
   */
  async createProvider(config: ProviderConfig): Promise<IStorageProvider> {
    // Validate config
    const validation = validateProviderConfig(config);
    if (!validation.success) {
      console.error('[ProviderRegistry] Invalid config:', validation.errors);
      throw new Error(`Invalid provider configuration: ${validation.errors?.join(', ')}`);
    }

    const providerId = config.type;
    const metadata = this.providers.get(providerId);

    if (!metadata) {
      throw new Error(`Provider "${providerId}" is not registered`);
    }

    console.log(`[ProviderRegistry] Creating provider: ${providerId}`, sanitizeConfig(validation.data));

    try {
      const provider = await metadata.factory(config);
      this.instances.set(providerId, provider);
      return provider;
    } catch (error) {
      console.error(`[ProviderRegistry] Failed to create provider "${providerId}":`, error);
      throw error;
    }
  }

  /**
   * Get or create provider instance
   */
  async getInstance(config: ProviderConfig): Promise<IStorageProvider> {
    const providerId = config.type;
    const existing = this.instances.get(providerId);

    if (existing) {
      // Check if config has changed
      const currentConfig = sanitizeConfig(existing.config);
      const newConfig = sanitizeConfig(config);
      
      if (JSON.stringify(currentConfig) === JSON.stringify(newConfig)) {
        console.log(`[ProviderRegistry] Reusing existing provider: ${providerId}`);
        return existing;
      } else {
        console.log(`[ProviderRegistry] Config changed, recreating provider: ${providerId}`);
        await this.destroyProvider(providerId);
      }
    }

    return this.createProvider(config);
  }

  /**
   * Set active provider
   */
  setActiveProvider(providerId: string): void {
    if (!this.instances.has(providerId)) {
      throw new Error(`Provider "${providerId}" is not initialized`);
    }
    
    this.activeProviderId = providerId;
    console.log(`[ProviderRegistry] Active provider set to: ${providerId}`);
  }

  /**
   * Get active provider
   */
  getActiveProvider(): IStorageProvider | null {
    if (!this.activeProviderId) {
      return null;
    }
    
    return this.instances.get(this.activeProviderId) || null;
  }

  /**
   * Destroy provider instance
   */
  async destroyProvider(providerId: string): Promise<void> {
    const provider = this.instances.get(providerId);
    
    if (provider) {
      try {
        await provider.disconnect();
        this.instances.delete(providerId);
        console.log(`[ProviderRegistry] Destroyed provider: ${providerId}`);
      } catch (error) {
        console.error(`[ProviderRegistry] Error destroying provider "${providerId}":`, error);
        throw error;
      }
    }
  }

  /**
   * Destroy all provider instances
   */
  async destroyAll(): Promise<void> {
    const promises = Array.from(this.instances.keys()).map(id => 
      this.destroyProvider(id)
    );
    
    await Promise.all(promises);
    this.activeProviderId = null;
    console.log('[ProviderRegistry] All providers destroyed');
  }

  /**
   * Check if provider supports a feature
   */
  supportsFeature(providerId: string, feature: string): boolean {
    const metadata = this.providers.get(providerId);
    return metadata?.supportedFeatures.includes(feature) || false;
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();
