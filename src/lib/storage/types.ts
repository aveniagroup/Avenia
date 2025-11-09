/**
 * Storage Provider Abstraction Layer
 * Defines interfaces for pluggable storage backends
 */

// Core query result types
export interface QueryResult<T = any> {
  data: T | null;
  error: Error | null;
  count?: number | null;
}

export interface QueryResultList<T = any> {
  data: T[] | null;
  error: Error | null;
  count?: number | null;
}

// Filter operators
export type FilterOperator = 
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'like' | 'ilike' | 'is' | 'in' | 'contains'
  | 'containedBy' | 'overlaps';

export interface QueryFilter {
  column: string;
  operator: FilterOperator;
  value: any;
}

export interface QueryOptions {
  select?: string;
  filters?: QueryFilter[];
  order?: { column: string; ascending?: boolean }[];
  limit?: number;
  offset?: number;
  single?: boolean;
  maybeSingle?: boolean;
}

// Authentication types
export interface AuthUser {
  id: string;
  email?: string;
  [key: string]: any;
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

export interface AuthResponse {
  user: AuthUser | null;
  session: AuthSession | null;
  error: Error | null;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  options?: {
    data?: Record<string, any>;
    emailRedirectTo?: string;
  };
}

export interface SignInCredentials {
  email: string;
  password: string;
}

// File storage types
export interface StorageFile {
  name: string;
  id: string;
  updated_at?: string;
  created_at?: string;
  last_accessed_at?: string;
  metadata?: Record<string, any>;
}

export interface UploadOptions {
  cacheControl?: string;
  contentType?: string;
  upsert?: boolean;
}

export interface StorageResponse {
  data: { path: string } | null;
  error: Error | null;
}

export interface DownloadResponse {
  data: Blob | null;
  error: Error | null;
}

// Real-time subscription types
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface RealtimePayload<T = any> {
  eventType: RealtimeEvent;
  new: T | null;
  old: T | null;
  schema: string;
  table: string;
}

export interface RealtimeSubscription {
  unsubscribe: () => void;
}

export interface RealtimeChannel {
  on(
    event: RealtimeEvent,
    schema: string,
    table: string,
    callback: (payload: RealtimePayload) => void
  ): RealtimeChannel;
  subscribe(callback?: (status: string) => void): RealtimeChannel;
  unsubscribe(): Promise<void>;
}

// Provider configuration
export interface ProviderConfig {
  type: 'supabase' | 'postgres' | 'mysql' | 'custom';
  connection: {
    url?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    ssl?: boolean;
  };
  features: {
    realtime: boolean;
    fileStorage: boolean;
    serverlessFunctions: boolean;
    fullTextSearch: boolean;
    transactions: boolean;
  };
}

// Auth Provider Interface
export interface IAuthProvider {
  signUp(credentials: SignUpCredentials): Promise<AuthResponse>;
  signIn(credentials: SignInCredentials): Promise<AuthResponse>;
  signOut(): Promise<{ error: Error | null }>;
  getUser(): Promise<{ data: { user: AuthUser | null }; error: Error | null }>;
  getSession(): Promise<{ data: { session: AuthSession | null }; error: Error | null }>;
  onAuthStateChange(callback: (event: string, session: AuthSession | null) => void): {
    data: { subscription: { unsubscribe: () => void } };
  };
}

// Storage Provider Interface
export interface IStorageProvider {
  // Configuration
  readonly config: ProviderConfig;
  readonly name: string;
  
  // Connection
  initialize(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
  
  // Query operations
  from(table: string): IQueryBuilder;
  
  // Authentication
  readonly auth: IAuthProvider;
  
  // File storage (optional)
  storage?: any;
  
  // Real-time (optional)
  channel?(name: string): RealtimeChannel;
  removeChannel?(channel: RealtimeChannel): Promise<void>;
  
  // RPC/Functions
  rpc?(functionName: string, params?: Record<string, any>): Promise<QueryResult>;
  
  // Edge Functions
  functions?: {
    invoke(
      functionName: string,
      options?: { body?: Record<string, any>; headers?: Record<string, string> }
    ): Promise<{ data: any; error: Error | null }>;
  };
}

// Query Builder Interface
export interface IQueryBuilder {
  select(columns?: string): IQueryBuilder;
  insert(data: any | any[]): IQueryBuilder;
  update(data: any): IQueryBuilder;
  delete(): IQueryBuilder;
  
  // Filters
  eq(column: string, value: any): IQueryBuilder;
  neq(column: string, value: any): IQueryBuilder;
  gt(column: string, value: any): IQueryBuilder;
  gte(column: string, value: any): IQueryBuilder;
  lt(column: string, value: any): IQueryBuilder;
  lte(column: string, value: any): IQueryBuilder;
  like(column: string, pattern: string): IQueryBuilder;
  ilike(column: string, pattern: string): IQueryBuilder;
  is(column: string, value: any): IQueryBuilder;
  in(column: string, values: any[]): IQueryBuilder;
  contains(column: string, value: any): IQueryBuilder;
  
  // Modifiers
  order(column: string, options?: { ascending?: boolean }): IQueryBuilder;
  limit(count: number): IQueryBuilder;
  range(from: number, to: number): IQueryBuilder;
  single(): IQueryBuilder;
  maybeSingle(): IQueryBuilder;
  
  // Execution
  execute(): Promise<QueryResult | QueryResultList>;
}
