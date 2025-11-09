import type { IStorageProvider, IQueryBuilder, ProviderConfig } from './types';

/**
 * Abstract Base Storage Provider
 * Provides common functionality for all storage providers
 */
export abstract class BaseStorageProvider implements IStorageProvider {
  abstract readonly config: ProviderConfig;
  abstract readonly name: string;
  abstract readonly auth: any;

  protected initialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.doInitialize();
    this.initialized = true;
  }

  protected abstract doInitialize(): Promise<void>;

  async disconnect(): Promise<void> {
    if (!this.initialized) return;
    await this.doDisconnect();
    this.initialized = false;
  }

  protected abstract doDisconnect(): Promise<void>;

  abstract healthCheck(): Promise<boolean>;
  abstract from(table: string): IQueryBuilder;

  // Validate if provider supports a feature
  protected requiresFeature(feature: keyof ProviderConfig['features'], methodName: string): void {
    if (!this.config.features[feature]) {
      throw new Error(
        `${this.name} provider does not support ${feature}. Cannot use ${methodName}().`
      );
    }
  }

  // Storage bucket operations (optional)
  storage?: any;

  // Real-time operations (optional)
  channel?(name: string): any {
    this.requiresFeature('realtime', 'channel');
    throw new Error(`${this.name} provider does not implement real-time channels`);
  }

  removeChannel?(channel: any): Promise<void> {
    this.requiresFeature('realtime', 'removeChannel');
    throw new Error(`${this.name} provider does not implement removeChannel`);
  }

  // RPC operations (optional)
  rpc?(functionName: string, params?: Record<string, any>): Promise<any> {
    this.requiresFeature('serverlessFunctions', 'rpc');
    throw new Error(`${this.name} provider does not implement RPC functions`);
  }

  // Edge Functions (optional)
  functions?: any;
}
