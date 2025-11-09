import { supabase } from '@/integrations/supabase/client';
import { BaseStorageProvider } from '../BaseStorageProvider';
import { MySQLQueryBuilder } from '../QueryBuilderMySQL';
import type { 
  IQueryBuilder, 
  ProviderConfig, 
  AuthUser, 
  AuthSession,
  IAuthProvider,
  SignUpCredentials,
  SignInCredentials,
  AuthResponse,
} from '../types';

/**
 * MySQL Auth Provider
 * Uses JWT-based authentication with MySQL backend
 */
class MySQLAuthProvider implements IAuthProvider {
  async signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('mysql-auth', {
        body: {
          action: 'signup',
          email: credentials.email,
          password: credentials.password,
          userData: credentials.options?.data,
        },
      });

      if (error) {
        return { user: null, session: null, error: new Error(error.message) };
      }

      // Store session in localStorage
      if (data.session) {
        localStorage.setItem('mysql_session', JSON.stringify(data.session));
        localStorage.setItem('mysql_user', JSON.stringify(data.user));
      }

      return {
        user: data.user,
        session: data.session,
        error: null,
      };
    } catch (error) {
      return { user: null, session: null, error: error as Error };
    }
  }

  async signIn(credentials: SignInCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('mysql-auth', {
        body: {
          action: 'signin',
          email: credentials.email,
          password: credentials.password,
        },
      });

      if (error) {
        return { user: null, session: null, error: new Error(error.message) };
      }

      // Store session in localStorage
      if (data.session) {
        localStorage.setItem('mysql_session', JSON.stringify(data.session));
        localStorage.setItem('mysql_user', JSON.stringify(data.user));
      }

      return {
        user: data.user,
        session: data.session,
        error: null,
      };
    } catch (error) {
      return { user: null, session: null, error: error as Error };
    }
  }

  async signOut(): Promise<{ error: Error | null }> {
    localStorage.removeItem('mysql_session');
    localStorage.removeItem('mysql_user');
    return { error: null };
  }

  async getUser() {
    const userStr = localStorage.getItem('mysql_user');
    if (!userStr) {
      return { data: { user: null }, error: null };
    }

    try {
      const user = JSON.parse(userStr);
      return { data: { user }, error: null };
    } catch {
      return { data: { user: null }, error: null };
    }
  }

  async getSession() {
    const sessionStr = localStorage.getItem('mysql_session');
    if (!sessionStr) {
      return { data: { session: null }, error: null };
    }

    try {
      const session = JSON.parse(sessionStr);
      return { data: { session }, error: null };
    } catch {
      return { data: { session: null }, error: null };
    }
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    // Listen to storage events for auth state changes
    const handler = (e: StorageEvent) => {
      if (e.key === 'mysql_session') {
        const session = e.newValue ? JSON.parse(e.newValue) : null;
        callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      }
    };

    window.addEventListener('storage', handler);

    return {
      data: {
        subscription: {
          unsubscribe: () => window.removeEventListener('storage', handler),
        },
      },
    };
  }
}

/**
 * MySQL Storage Provider
 * Connects to customer-hosted MySQL databases
 */
export class MySQLProvider extends BaseStorageProvider {
  readonly name = 'MySQL';
  private connectionConfig: any;
  private edgeFunctionUrl: string;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private currentUserId: string | null = null;

  // Internal config matching base requirements
  private _config: {
    type: 'mysql';
    connection: any;
    features: {
      realtime: boolean;
      fileStorage: boolean;
      serverlessFunctions: boolean;
      fullTextSearch: boolean;
      transactions: boolean;
    };
  };

  get config() {
    return this._config;
  }

  readonly auth: IAuthProvider = new MySQLAuthProvider();

  constructor(connectionConfig?: any) {
    super();
    this.connectionConfig = connectionConfig;
    
    this._config = {
      type: 'mysql',
      connection: connectionConfig || {},
      features: {
        realtime: true, // Polling-based real-time
        fileStorage: false,
        serverlessFunctions: false,
        fullTextSearch: true,
        transactions: true,
      },
    };
    
    // Use environment variable or fallback to Supabase function URL
    const projectUrl = import.meta.env.VITE_SUPABASE_URL;
    this.edgeFunctionUrl = `${projectUrl}/functions/v1/mysql-query`;
  }

  protected async doInitialize(): Promise<void> {
    console.log('[MySQL] Initializing MySQL provider');
    
    if (!this.connectionConfig) {
      const stored = localStorage.getItem('mysql_connection_config');
      if (stored) {
        this.connectionConfig = JSON.parse(stored);
      } else {
        throw new Error('MySQL connection configuration not found');
      }
    }

    // Test connection
    const isHealthy = await this.healthCheck();
    if (!isHealthy) {
      throw new Error('MySQL connection health check failed');
    }

    // Get current user
    const { data } = await this.auth.getUser();
    this.currentUserId = data.user?.id || null;

    console.log('[MySQL] Provider initialized successfully');
  }

  protected async doDisconnect(): Promise<void> {
    console.log('[MySQL] Disconnecting from MySQL');
    
    // Stop all polling intervals
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals.clear();
    
    this.connectionConfig = null;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: 'SELECT 1 as health',
          params: [],
          connectionConfig: this.connectionConfig,
        }),
      });

      if (!response.ok) {
        console.error('[MySQL] Health check failed:', await response.text());
        return false;
      }

      const result = await response.json();
      return result.data && result.data.length > 0;
    } catch (error) {
      console.error('[MySQL] Health check error:', error);
      return false;
    }
  }

  from(table: string): IQueryBuilder {
    return new MySQLQueryBuilder(table, this.edgeFunctionUrl);
  }

  /**
   * Set connection configuration
   */
  setConnectionConfig(config: any): void {
    this.connectionConfig = config;
    localStorage.setItem('mysql_connection_config', JSON.stringify(config));
  }

  /**
   * Get current connection configuration (without sensitive data)
   */
  getConnectionInfo(): any {
    if (!this.connectionConfig) return null;
    
    return {
      host: this.connectionConfig.host,
      port: this.connectionConfig.port,
      database: this.connectionConfig.database,
      username: this.connectionConfig.username,
      ssl: this.connectionConfig.ssl,
    };
  }

  /**
   * Polling-based pseudo-realtime
   * Note: This is NOT true real-time like Supabase
   */
  channel(name: string): any {
    const subscribers: Map<string, (payload: any) => void> = new Map();

    return {
      on: (event: any, filter: any, callback: any) => {
        const table = filter.table || filter.event;
        const key = `${event}_${table}`;
        subscribers.set(key, callback);
        return this.channel(name);
      },
      subscribe: (statusCallback?: (status: string) => void) => {
        // Start polling for changes every 5 seconds
        const interval = setInterval(async () => {
          for (const [key, callback] of subscribers) {
            const [event, table] = key.split('_');
            
            try {
              // Poll for recent records (simplified implementation)
              const result = await this.from(table)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10)
                .execute();

              if (result.data && Array.isArray(result.data)) {
                // Simulate real-time events
                result.data.forEach((row: any) => {
                  callback({
                    eventType: event,
                    new: row,
                    old: null,
                    schema: 'public',
                    table,
                  });
                });
              }
            } catch (error) {
              console.error('[MySQL] Polling error:', error);
            }
          }
        }, 5000); // Poll every 5 seconds

        this.pollingIntervals.set(name, interval);
        
        if (statusCallback) {
          statusCallback('SUBSCRIBED');
        }
        
        return this.channel(name);
      },
      unsubscribe: async () => {
        const interval = this.pollingIntervals.get(name);
        if (interval) {
          clearInterval(interval);
          this.pollingIntervals.delete(name);
        }
      },
    };
  }

  async removeChannel(channel: any): Promise<void> {
    await channel.unsubscribe();
  }
}
