/**
 * PostgreSQL Provider Usage Examples
 * Shows how to use custom PostgreSQL databases
 */

import { PostgresProvider, createStorageInstance } from '@/lib/storage';
import { useEffect, useState } from 'react';

/**
 * Example 1: Basic Setup
 */
export function BasicPostgresSetup() {
  useEffect(() => {
    async function setup() {
      // Create PostgreSQL provider instance
      const provider = new PostgresProvider({
        connection: {
          host: 'your-db.example.com',
          port: 5432,
          database: 'production_db',
          username: 'app_user',
          password: process.env.POSTGRES_PASSWORD || '',
          ssl: true,
        },
      });

      // Initialize connection
      await provider.initialize();

      // Test health
      const healthy = await provider.healthCheck();
      console.log('Database healthy:', healthy);

      // Use provider
      const tickets = await provider.from('tickets').select('*').execute();
      console.log('Tickets:', tickets.data);
    }

    setup();
  }, []);

  return <div>PostgreSQL Setup</div>;
}

/**
 * Example 2: CRUD Operations
 */
export function PostgresCRUD() {
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const provider = new PostgresProvider();
      await provider.initialize();

      // SELECT
      const result = await provider
        .from('tickets')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(10)
        .execute();

      setTickets(result.data || []);

      // INSERT
      const newTicket = await provider
        .from('tickets')
        .insert({
          title: 'New Ticket',
          description: 'Test ticket',
          status: 'open',
          priority: 'medium',
        })
        .execute();

      console.log('Created:', newTicket.data);

      // UPDATE
      const updated = await provider
        .from('tickets')
        .update({ status: 'closed' })
        .eq('id', newTicket.data.id)
        .execute();

      console.log('Updated:', updated.data);

      // DELETE
      const deleted = await provider
        .from('tickets')
        .delete()
        .eq('id', newTicket.data.id)
        .execute();

      console.log('Deleted:', deleted.data);
    }

    loadData();
  }, []);

  return (
    <div>
      <h2>Tickets from PostgreSQL</h2>
      <ul>
        {tickets.map(ticket => (
          <li key={ticket.id}>{ticket.title}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Example 3: Authentication
 */
export function PostgresAuth() {
  const [user, setUser] = useState<any>(null);

  async function handleSignUp(email: string, password: string) {
    const provider = new PostgresProvider();
    await provider.initialize();

    const result = await provider.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: 'John Doe' },
      },
    });

    if (result.user) {
      setUser(result.user);
      console.log('Signed up:', result.user);
    } else {
      console.error('Sign up error:', result.error);
    }
  }

  async function handleSignIn(email: string, password: string) {
    const provider = new PostgresProvider();
    await provider.initialize();

    const result = await provider.auth.signIn({ email, password });

    if (result.user) {
      setUser(result.user);
      console.log('Signed in:', result.user);
    } else {
      console.error('Sign in error:', result.error);
    }
  }

  async function handleSignOut() {
    const provider = new PostgresProvider();
    await provider.initialize();

    await provider.auth.signOut();
    setUser(null);
    console.log('Signed out');
  }

  return (
    <div>
      {user ? (
        <div>
          <p>Logged in as: {user.email}</p>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      ) : (
        <div>
          <button onClick={() => handleSignUp('test@example.com', 'password123')}>
            Sign Up
          </button>
          <button onClick={() => handleSignIn('test@example.com', 'password123')}>
            Sign In
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Example 4: Polling-based Realtime
 */
export function PostgresRealtime() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    let provider: PostgresProvider;

    async function setupRealtime() {
      provider = new PostgresProvider();
      await provider.initialize();

      // Subscribe to ticket changes
      const channel = provider.channel('tickets_channel');
      
      channel
        .on('INSERT', 'public', 'tickets', (payload) => {
          console.log('New ticket:', payload.new);
          // Update UI with new ticket
        })
        .on('UPDATE', 'public', 'tickets', (payload) => {
          console.log('Ticket updated:', payload.new);
          // Update UI with changed ticket
        })
        .subscribe((status) => {
          console.log('Subscription status:', status);
        });
    }

    setupRealtime();

    return () => {
      // Cleanup
      if (provider) {
        provider.disconnect();
      }
    };
  }, []);

  return (
    <div>
      <h2>Real-time Tickets (Polling)</h2>
      <p>⚠️ Note: Updates detected every 5 seconds</p>
      <ul>
        {messages.map((msg, i) => (
          <li key={i}>{JSON.stringify(msg)}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Example 5: Advanced Queries
 */
export function PostgresAdvanced() {
  useEffect(() => {
    async function advancedQueries() {
      const provider = new PostgresProvider();
      await provider.initialize();

      // Complex filters
      const filtered = await provider
        .from('tickets')
        .select('id, title, status, priority')
        .gte('created_at', '2024-01-01')
        .in('status', ['open', 'in_progress'])
        .ilike('title', '%urgent%')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(20)
        .execute();

      console.log('Filtered tickets:', filtered.data);

      // Pagination with range
      const page1 = await provider
        .from('tickets')
        .select('*')
        .range(0, 9) // First 10 items
        .execute();

      const page2 = await provider
        .from('tickets')
        .select('*')
        .range(10, 19) // Next 10 items
        .execute();

      console.log('Page 1:', page1.data);
      console.log('Page 2:', page2.data);

      // Single record
      const single = await provider
        .from('tickets')
        .select('*')
        .eq('id', 'some-uuid')
        .maybeSingle() // Returns null if not found
        .execute();

      console.log('Single ticket:', single.data);
    }

    advancedQueries();
  }, []);

  return <div>Advanced PostgreSQL Queries</div>;
}

/**
 * Example 6: Error Handling
 */
export function PostgresErrorHandling() {
  useEffect(() => {
    async function withErrorHandling() {
      try {
        const provider = new PostgresProvider({
          connection: {
            host: 'invalid-host.example.com',
            port: 5432,
            database: 'test_db',
            username: 'user',
            password: 'pass',
          },
        });

        await provider.initialize();
      } catch (error) {
        console.error('Initialization failed:', error);
        // Show error to user
      }

      // Query-level error handling
      const provider = new PostgresProvider();
      await provider.initialize();

      const result = await provider
        .from('non_existent_table')
        .select('*')
        .execute();

      if (result.error) {
        console.error('Query error:', result.error.message);
        // Handle error gracefully
      } else {
        console.log('Data:', result.data);
      }
    }

    withErrorHandling();
  }, []);

  return <div>Error Handling Examples</div>;
}

/**
 * Example 7: Custom RLS Rules
 */
export function CustomRLSRules() {
  useEffect(() => {
    // Import RLS utilities
    const { addRLSRule } = require('@/lib/storage');

    // Add custom RLS rule for a table
    addRLSRule('custom_table', {
      userColumn: 'created_by',
      orgColumn: 'organization_id',
    });

    // Make table publicly readable
    addRLSRule('public_data', {
      publicRead: true,
    });

    console.log('RLS rules configured');
  }, []);

  return <div>Custom RLS Rules Configured</div>;
}

/**
 * Example 8: Migration from Supabase
 */
export function MigrationExample() {
  async function migrateToPostgres() {
    const { setActiveProvider, setStorageConfig } = await import('@/lib/storage');

    // Update configuration
    setStorageConfig({
      activeProvider: 'postgres',
      providers: {
        postgres: {
          type: 'postgres',
          connection: {
            host: 'your-db.example.com',
            port: 5432,
            database: 'production',
            username: 'app_user',
            password: process.env.POSTGRES_PASSWORD || '',
            ssl: true,
          },
          features: {
            realtime: false,
            fileStorage: false,
            serverlessFunctions: false,
            fullTextSearch: true,
            transactions: true,
          },
        },
      },
    });

    // Set active provider
    setActiveProvider('postgres');

    console.log('Migrated to PostgreSQL provider');
  }

  return (
    <div>
      <button onClick={migrateToPostgres}>
        Migrate to PostgreSQL
      </button>
    </div>
  );
}
