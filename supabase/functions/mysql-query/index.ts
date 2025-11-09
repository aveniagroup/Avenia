import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MySQLConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean;
}

interface QueryRequest {
  sql: string;
  params?: any[];
  connectionConfig?: MySQLConnectionConfig;
}

// MySQL connection using deno-mysql
let mysqlModule: any = null;

async function loadMySQLModule() {
  if (!mysqlModule) {
    mysqlModule = await import("https://deno.land/x/mysql@v2.12.1/mod.ts");
  }
  return mysqlModule;
}

async function executeQuery(
  config: MySQLConnectionConfig,
  sql: string,
  params: any[] = []
) {
  const mysql = await loadMySQLModule();
  
  console.log('[MySQL] Connecting to database:', {
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
  });

  const client = await new mysql.Client().connect({
    hostname: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    db: config.database,
  });

  try {
    console.log('[MySQL] Executing query:', sql.substring(0, 100));
    
    // Execute query
    const result = await client.execute(sql, params);
    
    console.log('[MySQL] Query executed successfully');
    
    return {
      data: result.rows || [],
      affectedRows: result.affectedRows,
    };
  } finally {
    await client.close();
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sql, params = [], connectionConfig }: QueryRequest = await req.json();

    if (!sql) {
      throw new Error('SQL query is required');
    }

    // Get connection config from request or environment
    const config: MySQLConnectionConfig = connectionConfig || {
      host: Deno.env.get('MYSQL_HOST') || 'localhost',
      port: parseInt(Deno.env.get('MYSQL_PORT') || '3306'),
      username: Deno.env.get('MYSQL_USERNAME') || 'root',
      password: Deno.env.get('MYSQL_PASSWORD') || '',
      database: Deno.env.get('MYSQL_DATABASE') || 'test',
      ssl: Deno.env.get('MYSQL_SSL') === 'true',
    };

    if (!config.host || !config.database) {
      throw new Error('MySQL connection configuration is incomplete');
    }

    // Security: Validate SQL to prevent dangerous operations
    const sqlLower = sql.toLowerCase().trim();
    const dangerousPatterns = [
      'drop database',
      'drop schema',
      'drop table',
      'truncate table',
      'grant',
      'revoke',
      'create user',
      'drop user',
    ];

    const isDangerous = dangerousPatterns.some(pattern => 
      sqlLower.includes(pattern)
    );

    if (isDangerous) {
      console.error('[MySQL] Blocked dangerous query:', sql);
      throw new Error('Query contains potentially dangerous operations');
    }

    // Execute query
    const result = await executeQuery(config, sql, params);

    return new Response(
      JSON.stringify({
        success: true,
        data: result.data,
        affectedRows: result.affectedRows,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[MySQL] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
