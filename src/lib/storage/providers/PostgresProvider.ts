import { supabase } from '@/integrations/supabase/client';
import { BaseStorageProvider } from '../BaseStorageProvider';
import { BaseQueryBuilder } from '../QueryBuilder';
import type { 
  IQueryBuilder, 
  ProviderConfig, 
  QueryResult, 
  QueryResultList,
  IAuthProvider,
  SignUpCredentials,
  SignInCredentials,
  AuthResponse,
} from '../types';
import { applyRLSFilters } from '../rls';

/**
 * PostgreSQL Query Builder
 * Sends queries to edge function for execution
 */
class PostgresQueryBuilder extends BaseQueryBuilder {
  private currentUserId: string | null = null;

  constructor(tableName: string, userId: string | null) {
    super(tableName);
    this.currentUserId = userId;
  }

  async execute(): Promise<QueryResult | QueryResultList> {
    try {
      const queryState = this.getQueryState();

      // Apply RLS filters based on user
      const rlsQuery = applyRLSFilters(queryState, this.currentUserId);

      // Send to edge function for execution
      const { data, error } = await supabase.functions.invoke('postgres-query', {
        body: {
          operation: this.determineOperation(),
          table: rlsQuery.tableName,
          select: rlsQuery.selectColumns,
          insertData: rlsQuery.insertData,
          updateData: rlsQuery.updateData,
          filters: rlsQuery.filters,
          order: rlsQuery.orderClauses,
          limit: rlsQuery.limitValue,
          range: rlsQuery.rangeValue,
          single: rlsQuery.singleMode,
          maybeSingle: rlsQuery.maybeSingleMode,
        },
      });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return {
        data: data.result,
        error: data.error ? new Error(data.error) : null,
        count: data.count,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
      };
    }
  }

  private determineOperation(): 'select' | 'insert' | 'update' | 'delete' {
    if (this.insertData !== null) return 'insert';
    if (this.updateData !== null) return 'update';
    if (this.isDelete) return 'delete';
    return 'select';
  }
}

/**
 * PostgreSQL Auth Provider
 * Uses JWT-based authentication
 */
class PostgresAuthProvider implements IAuthProvider {
  async signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('postgres-auth', {
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
      const { data, error } = await supabase.functions.invoke('postgres-auth', {
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
        localStorage.setItem('postgres_session', JSON.stringify(data.session));
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
    localStorage.removeItem('postgres_session');
    return { error: null };
  }

  async getUser() {
    const sessionStr = localStorage.getItem('postgres_session');
    if (!sessionStr) {
      return { data: { user: null }, error: null };
    }

    try {
      const session = JSON.parse(sessionStr);
      return { data: { user: session.user }, error: null };
    } catch {
      return { data: { user: null }, error: null };
    }
  }

  async getSession() {
    const sessionStr = localStorage.getItem('postgres_session');
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
    // Simple implementation - listen to storage events
    const handler = (e: StorageEvent) => {
      if (e.key === 'postgres_session') {
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
 * PostgreSQL Storage Provider
 * Connects to customer-hosted PostgreSQL databases via edge functions
 */
export class PostgresProvider extends BaseStorageProvider {
  readonly name = 'PostgreSQL';
  readonly config: ProviderConfig;
  readonly auth: IAuthProvider = new PostgresAuthProvider();

  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private currentUserId: string | null = null;

  constructor(config?: Partial<ProviderConfig>) {
    super();
    this.config = {
      type: 'postgres',
      connection: {
        host: config?.connection?.host || '',
        port: config?.connection?.port || 5432,
        database: config?.connection?.database || '',
        username: config?.connection?.username || '',
        password: config?.connection?.password || '',
        ssl: config?.connection?.ssl ?? true,
      },
      features: {
        realtime: false, // Polling-based instead
        fileStorage: false, // Requires separate solution
        serverlessFunctions: false,
        fullTextSearch: true,
        transactions: true,
      },
    };
  }

  protected async doInitialize(): Promise<void> {
    // Test connection via edge function
    const testResult = await this.testConnection();
    if (!testResult.success) {
      throw new Error(`Failed to initialize PostgreSQL provider: ${testResult.error}`);
    }

    // Get current user
    const { data } = await this.auth.getUser();
    this.currentUserId = data.user?.id || null;
  }

  protected async doDisconnect(): Promise<void> {
    // Stop all polling intervals
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals.clear();
  }

  async healthCheck(): Promise<boolean> {
    const result = await this.testConnection();
    return result.success;
  }

  private async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('postgres-query', {
        body: {
          operation: 'health_check',
          connectionConfig: this.config.connection,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: data.healthy, error: data.error };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  from(table: string): IQueryBuilder {
    return new PostgresQueryBuilder(table, this.currentUserId);
  }

  /**
   * Polling-based pseudo-realtime
   * Note: This is NOT true real-time like Supabase
   */
  channel(name: string): any {
    const subscribers: Map<string, (payload: any) => void> = new Map();

    return {
      on: (event: any, schema: string, table: string, callback: any) => {
        const key = `${event}_${schema}_${table}`;
        subscribers.set(key, callback);
        return this.channel(name);
      },
      subscribe: (statusCallback?: (status: string) => void) => {
        // Start polling for changes
        const interval = setInterval(async () => {
          for (const [key, callback] of subscribers) {
            const [event, schema, table] = key.split('_');
            
            // Poll for new records (simplified - real implementation needs timestamps)
            try {
              const result = await this.from(table)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10)
                .execute();

              if (result.data) {
                // Simulate real-time events
                callback({
                  eventType: event,
                  new: result.data,
                  old: null,
                  schema,
                  table,
                });
              }
            } catch (error) {
              console.error('Polling error:', error);
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

  // RPC operations not supported for custom PostgreSQL
  async rpc(functionName: string, params?: Record<string, any>): Promise<QueryResult> {
    throw new Error('RPC functions are not supported for custom PostgreSQL providers');
  }

  // No edge functions support
  functions = undefined;

  // No storage support - requires separate solution
  storage = undefined;
}
