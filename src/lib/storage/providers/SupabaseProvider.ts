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
  RealtimeChannel
} from '../types';

/**
 * Supabase Query Builder
 * Wraps Supabase client query operations
 */
class SupabaseQueryBuilder extends BaseQueryBuilder {
  private supabaseQuery: any;

  constructor(tableName: string) {
    super(tableName);
    this.supabaseQuery = (supabase.from as any)(tableName);
  }

  async execute(): Promise<QueryResult | QueryResultList> {
    try {
      let query: any = this.supabaseQuery;

      // Handle different operation types
      if (this.insertData !== null) {
        query = query.insert(this.insertData);
      } else if (this.updateData !== null) {
        query = query.update(this.updateData);
      } else if (this.isDelete) {
        query = query.delete();
      } else {
        query = query.select(this.selectColumns);
      }

      // Apply filters
      for (const filter of this.filters) {
        query = query[filter.operator](filter.column, filter.value);
      }

      // Apply order
      for (const order of this.orderClauses) {
        query = query.order(order.column, { ascending: order.ascending });
      }

      // Apply limit
      if (this.limitValue !== undefined) {
        query = query.limit(this.limitValue);
      }

      // Apply range
      if (this.rangeValue) {
        query = query.range(this.rangeValue.from, this.rangeValue.to);
      }

      // Apply single/maybeSingle
      if (this.singleMode) {
        query = query.single();
      } else if (this.maybeSingleMode) {
        query = query.maybeSingle();
      }

      const result = await query;

      return {
        data: result.data,
        error: result.error,
        count: result.count,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
      };
    }
  }
}

/**
 * Supabase Auth Provider
 */
class SupabaseAuthProvider implements IAuthProvider {
  async signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
    const result = await supabase.auth.signUp(credentials);
    return {
      user: result.data.user,
      session: result.data.session,
      error: result.error,
    };
  }

  async signIn(credentials: SignInCredentials): Promise<AuthResponse> {
    const result = await supabase.auth.signInWithPassword(credentials);
    return {
      user: result.data.user,
      session: result.data.session,
      error: result.error,
    };
  }

  async signOut(): Promise<{ error: Error | null }> {
    const result = await supabase.auth.signOut();
    return { error: result.error };
  }

  async getUser() {
    return await supabase.auth.getUser();
  }

  async getSession() {
    return await supabase.auth.getSession();
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

/**
 * Supabase Storage Provider
 * Wraps existing Supabase client as a provider
 */
export class SupabaseProvider extends BaseStorageProvider {
  readonly name = 'Supabase';
  readonly config: ProviderConfig = {
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
  };

  readonly auth: IAuthProvider = new SupabaseAuthProvider();

  // Storage operations
  readonly storage = {
    from: (bucket: string) => supabase.storage.from(bucket),
  };

  // Edge Functions
  readonly functions = {
    invoke: async (
      functionName: string,
      options?: { body?: Record<string, any>; headers?: Record<string, string> }
    ) => {
      return await supabase.functions.invoke(functionName, options);
    },
  };

  protected async doInitialize(): Promise<void> {
    // Supabase client is already initialized
    return;
  }

  protected async doDisconnect(): Promise<void> {
    // Supabase handles connection management
    return;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  from(table: string): IQueryBuilder {
    return new SupabaseQueryBuilder(table);
  }

  // Real-time support
  channel(name: string): RealtimeChannel {
    const supabaseChannel = supabase.channel(name);
    
    return {
      on: (event: any, schema: string, table: string, callback: any) => {
        supabaseChannel.on('postgres_changes', { event, schema, table }, callback);
        return this.channel(name);
      },
      subscribe: (callback?: (status: string) => void) => {
        supabaseChannel.subscribe(callback);
        return this.channel(name);
      },
      unsubscribe: async () => {
        await supabase.removeChannel(supabaseChannel);
      },
    };
  }

  async removeChannel(channel: RealtimeChannel): Promise<void> {
    await channel.unsubscribe();
  }

  // RPC support
  async rpc(functionName: string, params?: Record<string, any>): Promise<QueryResult> {
    const result = await (supabase.rpc as any)(functionName, params);
    return {
      data: result.data,
      error: result.error,
    };
  }
}
