import React, { createContext, useContext, useEffect, useState } from 'react';
import type { IStorageProvider } from './types';
import { SupabaseProvider } from './providers/SupabaseProvider';
import { getStorageConfig } from './config';

/**
 * Storage Context
 * Provides the active storage provider to the application
 */

interface StorageContextType {
  provider: IStorageProvider;
  isInitialized: boolean;
}

const StorageContext = createContext<StorageContextType | null>(null);

export function StorageProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<IStorageProvider>(() => new SupabaseProvider() as IStorageProvider);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function initializeProvider() {
      const config = getStorageConfig();
      
      // For now, always use Supabase
      // Future: Load provider based on config.activeProvider
      const activeProvider = new SupabaseProvider() as IStorageProvider;
      
      await activeProvider.initialize();
      setProvider(activeProvider);
      setIsInitialized(true);
    }

    initializeProvider();
  }, []);

  return (
    <StorageContext.Provider value={{ provider, isInitialized }}>
      {children}
    </StorageContext.Provider>
  );
}

/**
 * Hook to access the storage provider
 */
export function useStorage(): StorageContextType {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}

/**
 * Hook to access the storage provider instance directly
 */
export function useStorageProvider(): IStorageProvider {
  const { provider } = useStorage();
  return provider;
}
