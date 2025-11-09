import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

interface QueryRequest {
  operation: 'select' | 'insert' | 'update' | 'delete' | 'health_check';
  connectionConfig?: PostgresConfig;
  table?: string;
  select?: string;
  insertData?: any | any[];
  updateData?: any;
  filters?: Array<{ column: string; operator: string; value: any }>;
  order?: Array<{ column: string; ascending: boolean }>;
  limit?: number;
  range?: { from: number; to: number };
  single?: boolean;
  maybeSingle?: boolean;
}

/**
 * Connection Pool Manager
 * Reuses connections for better performance
 */
class ConnectionPool {
  private connections: Map<string, Client> = new Map();

  private getPoolKey(config: PostgresConfig): string {
    return `${config.host}:${config.port}:${config.database}:${config.username}`;
  }

  async getConnection(config: PostgresConfig): Promise<Client> {
    const key = this.getPoolKey(config);
    
    if (this.connections.has(key)) {
      const client = this.connections.get(key)!;
      try {
        // Test if connection is still alive
        await client.queryArray('SELECT 1');
        return client;
      } catch {
        // Connection dead, remove and create new
        this.connections.delete(key);
      }
    }

    // Create new connection
    const client = new Client({
      hostname: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      tls: config.ssl ? { enabled: true } : undefined,
    });

    await client.connect();
    this.connections.set(key, client);
    return client;
  }

  async closeAll() {
    for (const client of this.connections.values()) {
      try {
        await client.end();
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }
    this.connections.clear();
  }
}

const pool = new ConnectionPool();

/**
 * Build WHERE clause from filters
 */
function buildWhereClause(filters: Array<{ column: string; operator: string; value: any }>): {
  clause: string;
  params: any[];
} {
  if (!filters || filters.length === 0) {
    return { clause: '', params: [] };
  }

  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  for (const filter of filters) {
    const { column, operator, value } = filter;

    switch (operator) {
      case 'eq':
        conditions.push(`${column} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
        break;
      case 'neq':
        conditions.push(`${column} != $${paramIndex}`);
        params.push(value);
        paramIndex++;
        break;
      case 'gt':
        conditions.push(`${column} > $${paramIndex}`);
        params.push(value);
        paramIndex++;
        break;
      case 'gte':
        conditions.push(`${column} >= $${paramIndex}`);
        params.push(value);
        paramIndex++;
        break;
      case 'lt':
        conditions.push(`${column} < $${paramIndex}`);
        params.push(value);
        paramIndex++;
        break;
      case 'lte':
        conditions.push(`${column} <= $${paramIndex}`);
        params.push(value);
        paramIndex++;
        break;
      case 'like':
        conditions.push(`${column} LIKE $${paramIndex}`);
        params.push(value);
        paramIndex++;
        break;
      case 'ilike':
        conditions.push(`${column} ILIKE $${paramIndex}`);
        params.push(value);
        paramIndex++;
        break;
      case 'is':
        if (value === null) {
          conditions.push(`${column} IS NULL`);
        } else {
          conditions.push(`${column} IS $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
        break;
      case 'in':
        conditions.push(`${column} = ANY($${paramIndex})`);
        params.push(value);
        paramIndex++;
        break;
      default:
        console.warn(`Unsupported operator: ${operator}`);
    }
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

/**
 * Execute SELECT query
 */
async function executeSelect(client: Client, request: QueryRequest) {
  const { table, select = '*', filters = [], order = [], limit, range } = request;

  const { clause, params } = buildWhereClause(filters);

  let orderClause = '';
  if (order.length > 0) {
    const orderParts = order.map(o => `${o.column} ${o.ascending ? 'ASC' : 'DESC'}`);
    orderClause = `ORDER BY ${orderParts.join(', ')}`;
  }

  let limitClause = '';
  if (range) {
    limitClause = `LIMIT ${range.to - range.from + 1} OFFSET ${range.from}`;
  } else if (limit) {
    limitClause = `LIMIT ${limit}`;
  }

  const query = `SELECT ${select} FROM ${table} ${clause} ${orderClause} ${limitClause}`;
  
  const result = await client.queryObject(query, params);

  if (request.single && result.rows.length === 0) {
    throw new Error('No rows returned for single query');
  }

  if (request.maybeSingle) {
    return { result: result.rows[0] || null, count: result.rowCount };
  }

  if (request.single) {
    return { result: result.rows[0], count: 1 };
  }

  return { result: result.rows, count: result.rowCount };
}

/**
 * Execute INSERT query
 */
async function executeInsert(client: Client, request: QueryRequest) {
  const { table, insertData } = request;

  const isArray = Array.isArray(insertData);
  const records = isArray ? insertData : [insertData];

  if (records.length === 0) {
    return { result: [], count: 0 };
  }

  const columns = Object.keys(records[0]);
  const columnsList = columns.join(', ');

  const values: any[][] = records.map(record => columns.map(col => record[col]));

  const valuePlaceholders = records.map((_, recordIndex) => {
    const placeholders = columns.map((_, colIndex) => 
      `$${recordIndex * columns.length + colIndex + 1}`
    );
    return `(${placeholders.join(', ')})`;
  }).join(', ');

  const flatValues = values.flat();

  const query = `INSERT INTO ${table} (${columnsList}) VALUES ${valuePlaceholders} RETURNING *`;
  
  const result = await client.queryObject(query, flatValues);

  return {
    result: isArray ? result.rows : result.rows[0],
    count: result.rowCount,
  };
}

/**
 * Execute UPDATE query
 */
async function executeUpdate(client: Client, request: QueryRequest) {
  const { table, updateData, filters = [] } = request;

  const columns = Object.keys(updateData);
  const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
  const setParams = columns.map(col => updateData[col]);

  const { clause: whereClause, params: whereParams } = buildWhereClause(filters);
  
  // Adjust parameter indices for WHERE clause
  const adjustedWhereClause = whereClause.replace(/\$(\d+)/g, (_, num) => 
    `$${parseInt(num) + columns.length}`
  );

  const query = `UPDATE ${table} SET ${setClause} ${adjustedWhereClause} RETURNING *`;
  
  const result = await client.queryObject(query, [...setParams, ...whereParams]);

  return { result: result.rows, count: result.rowCount };
}

/**
 * Execute DELETE query
 */
async function executeDelete(client: Client, request: QueryRequest) {
  const { table, filters = [] } = request;

  const { clause, params } = buildWhereClause(filters);

  const query = `DELETE FROM ${table} ${clause} RETURNING *`;
  
  const result = await client.queryObject(query, params);

  return { result: result.rows, count: result.rowCount };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: QueryRequest = await req.json();

    // Health check
    if (request.operation === 'health_check') {
      if (!request.connectionConfig) {
        return new Response(
          JSON.stringify({ healthy: false, error: 'No connection config provided' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const client = await pool.getConnection(request.connectionConfig);
        await client.queryArray('SELECT 1');
        return new Response(
          JSON.stringify({ healthy: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ healthy: false, error: (error as Error).message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get connection from environment or request
    const connectionConfig: PostgresConfig = request.connectionConfig || {
      host: Deno.env.get('POSTGRES_HOST') || '',
      port: parseInt(Deno.env.get('POSTGRES_PORT') || '5432'),
      database: Deno.env.get('POSTGRES_DB') || '',
      username: Deno.env.get('POSTGRES_USER') || '',
      password: Deno.env.get('POSTGRES_PASSWORD') || '',
      ssl: Deno.env.get('POSTGRES_SSL') === 'true',
    };

    const client = await pool.getConnection(connectionConfig);

    let result;
    switch (request.operation) {
      case 'select':
        result = await executeSelect(client, request);
        break;
      case 'insert':
        result = await executeInsert(client, request);
        break;
      case 'update':
        result = await executeUpdate(client, request);
        break;
      case 'delete':
        result = await executeDelete(client, request);
        break;
      default:
        throw new Error(`Unsupported operation: ${request.operation}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Query execution error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
