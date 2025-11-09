import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

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

interface AuthRequest {
  action: 'signup' | 'signin' | 'validate';
  email?: string;
  password?: string;
  token?: string;
  userData?: Record<string, any>;
}

let mysqlModule: any = null;

async function loadMySQLModule() {
  if (!mysqlModule) {
    mysqlModule = await import("https://deno.land/x/mysql@v2.12.1/mod.ts");
  }
  return mysqlModule;
}

async function getConnection(config: MySQLConnectionConfig) {
  const mysql = await loadMySQLModule();
  
  const client = await new mysql.Client().connect({
    hostname: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    db: config.database,
  });

  return client;
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, email, password, token, userData }: AuthRequest = await req.json();

    // Get MySQL connection config from localStorage (passed via request body)
    const storedConfig = localStorage.getItem('mysql_connection_config');
    const connectionConfig: MySQLConnectionConfig = storedConfig 
      ? JSON.parse(storedConfig)
      : {
          host: Deno.env.get('MYSQL_HOST') || 'localhost',
          port: parseInt(Deno.env.get('MYSQL_PORT') || '3306'),
          username: Deno.env.get('MYSQL_USERNAME') || 'root',
          password: Deno.env.get('MYSQL_PASSWORD') || '',
          database: Deno.env.get('MYSQL_DATABASE') || 'test',
        };

    const client = await getConnection(connectionConfig);

    try {
      if (action === 'signup') {
        if (!email || !password) {
          throw new Error('Email and password are required');
        }

        console.log('[MySQL Auth] Processing signup for:', email);

        // Check if user exists
        const existingUser = await client.execute(
          'SELECT id FROM users WHERE email = ?',
          [email]
        );

        if (existingUser.rows && existingUser.rows.length > 0) {
          throw new Error('User already exists');
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const userId = crypto.randomUUID();
        await client.execute(
          'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, NOW())',
          [userId, email, passwordHash]
        );

        // Create session
        const sessionToken = generateToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await client.execute(
          'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
          [sessionToken, userId, expiresAt]
        );

        console.log('[MySQL Auth] User created successfully:', userId);

        return new Response(
          JSON.stringify({
            user: {
              id: userId,
              email,
              ...userData,
            },
            session: {
              access_token: sessionToken,
              user: {
                id: userId,
                email,
                ...userData,
              },
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      if (action === 'signin') {
        if (!email || !password) {
          throw new Error('Email and password are required');
        }

        console.log('[MySQL Auth] Processing signin for:', email);

        // Get user
        const userResult = await client.execute(
          'SELECT id, email, password_hash FROM users WHERE email = ?',
          [email]
        );

        if (!userResult.rows || userResult.rows.length === 0) {
          throw new Error('Invalid credentials');
        }

        const user = userResult.rows[0];

        // Verify password
        const isValid = await verifyPassword(password, user.password_hash as string);
        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        // Create session
        const sessionToken = generateToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await client.execute(
          'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
          [sessionToken, user.id, expiresAt]
        );

        console.log('[MySQL Auth] User signed in successfully:', user.id);

        return new Response(
          JSON.stringify({
            user: {
              id: user.id,
              email: user.email,
            },
            session: {
              access_token: sessionToken,
              user: {
                id: user.id,
                email: user.email,
              },
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      if (action === 'validate') {
        if (!token) {
          throw new Error('Token is required');
        }

        // Validate session
        const sessionResult = await client.execute(
          `SELECT s.user_id, s.expires_at, u.email 
           FROM sessions s 
           JOIN users u ON u.id = s.user_id 
           WHERE s.token = ?`,
          [token]
        );

        if (!sessionResult.rows || sessionResult.rows.length === 0) {
          throw new Error('Invalid session');
        }

        const session = sessionResult.rows[0];

        // Check if expired
        if (new Date(session.expires_at as string) < new Date()) {
          throw new Error('Session expired');
        }

        return new Response(
          JSON.stringify({
            valid: true,
            user: {
              id: session.user_id,
              email: session.email,
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      throw new Error('Invalid action');
    } finally {
      await client.close();
    }
  } catch (error) {
    console.error('[MySQL Auth] Error:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Authentication failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
