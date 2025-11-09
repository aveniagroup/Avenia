import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { providerRegistry, type IStorageProvider } from '@/lib/storage';
import { getStorageConfig } from '@/lib/storage/config';

interface StorageContextType {
  storage: IStorageProvider | null;
  isReady: boolean;
  error: Error | null;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export function StorageProviderWrapper({ children }: { children: ReactNode }) {
  const [storage, setStorage] = useState<IStorageProvider | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeStorage = async () => {
      try {
        // Get the active provider from registry or configuration
        let provider = providerRegistry.getActiveProvider();
        
        if (!provider) {
          // Try to get from config
          const config = getStorageConfig();
          const providerConfig = config.providers[config.activeProvider];
          
          if (providerConfig) {
            provider = await providerRegistry.getInstance(providerConfig);
          }
        }

        if (!provider) {
          throw new Error('No storage provider configured');
        }

        setStorage(provider);
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize storage'));
        setIsReady(false);
      }
    };

    initializeStorage();
  }, []);

  return (
    <StorageContext.Provider value={{ storage, isReady, error }}>
      {children}
    </StorageContext.Provider>
  );
}

/**
 * Hook to access the storage provider
 * 
 * @example
 * ```typescript
 * const { storage } = useStorageProvider();
 * 
 * // Query data
 * const { data } = await storage.from('tickets')
 *   .select('*')
 *   .eq('status', 'open')
 *   .execute();
 * 
 * // Insert data
 * await storage.from('tickets')
 *   .insert({ title: 'New ticket' })
 *   .execute();
 * ```
 */
export function useStorageProvider() {
  const context = useContext(StorageContext);
  
  if (context === undefined) {
    throw new Error('useStorageProvider must be used within StorageProviderWrapper');
  }

  if (!context.isReady) {
    console.warn('Storage provider not ready yet');
  }

  if (context.error) {
    console.error('Storage provider error:', context.error);
  }

  return context;
}

/**
 * Convenience hook that throws if storage is not ready
 * Use this in components that require storage to be initialized
 */
export function useStorage(): IStorageProvider {
  const { storage, isReady, error } = useStorageProvider();

  if (error) {
    throw error;
  }

  if (!isReady || !storage) {
    throw new Error('Storage provider not initialized');
  }

  return storage;
}
