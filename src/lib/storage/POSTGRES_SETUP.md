# PostgreSQL Provider Setup Guide

## Overview

The PostgreSQL provider allows customers to use their own PostgreSQL databases instead of the default Supabase database. This guide covers setup, configuration, and limitations.

## Architecture

```
┌─────────────────┐
│  React App      │
│  (Frontend)     │
└────────┬────────┘
         │
         │ HTTPS
         ▼
┌─────────────────┐
│  Edge Function  │
│ postgres-query  │
│ (Connection     │
│  Pooling)       │
└────────┬────────┘
         │
         │ TCP/SSL
         ▼
┌─────────────────┐
│  Customer's     │
│  PostgreSQL     │
│  Database       │
└─────────────────┘
```

## Prerequisites

### Customer Database Requirements

1. **PostgreSQL Version**: 12.0 or higher
2. **Network Access**: Database must be accessible from Supabase Edge Functions
3. **SSL/TLS**: Highly recommended for production
4. **Schema**: Compatible with application schema (see schema migration)

### Required PostgreSQL Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

## Setup Steps

### 1. Configure Database Connection

Add PostgreSQL connection details to your storage configuration:

```typescript
import { PostgresProvider } from '@/lib/storage';

const provider = new PostgresProvider({
  connection: {
    host: 'your-db-host.com',
    port: 5432,
    database: 'your_database',
    username: 'your_username',
    password: 'your_password',
    ssl: true,
  },
});
```

### 2. Set Environment Variables

For security, store credentials in Edge Function secrets:

```bash
# In Supabase dashboard: Settings → Edge Functions → Secrets
POSTGRES_HOST=your-db-host.com
POSTGRES_PORT=5432
POSTGRES_DB=your_database
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
POSTGRES_SSL=true
```

### 3. Deploy Edge Function

The `postgres-query` edge function handles all database operations.

Edge functions are deployed automatically with your application.

### 4. Run Schema Migration

Apply the application schema to your PostgreSQL database:

```sql
-- Copy schema from Supabase database
-- Or run migration scripts
-- See: SCHEMA_MIGRATION.md
```

### 5. Configure RLS Rules

Since PostgreSQL doesn't have built-in RLS like Supabase, we implement application-level security:

```typescript
import { addRLSRule } from '@/lib/storage';

// Add custom RLS rule for your table
addRLSRule('custom_table', {
  orgColumn: 'organization_id',
  userColumn: 'user_id',
});
```

## Features & Limitations

### ✅ Supported Features

- **CRUD Operations**: Full support
- **Transactions**: Native PostgreSQL transactions
- **Full-Text Search**: PostgreSQL native FTS
- **Complex Queries**: Joins, aggregations, CTEs
- **Connection Pooling**: Automatic via edge function
- **Application-Level RLS**: Security filters applied in code

### ❌ Unsupported Features

- **Real-time Updates**: Uses polling instead (5-second interval)
- **File Storage**: Requires separate solution (S3, etc.)
- **Edge Functions**: Not available
- **Native RLS**: Must use application-level security
- **Supabase Auth**: Uses JWT-based auth instead

### ⚠️ Limitations

1. **Latency**: Edge function adds ~100-200ms overhead
2. **Connection Limits**: Default pool size is 10 connections
3. **Polling Delay**: Real-time updates have 5-second lag
4. **Security**: Application-level RLS less robust than database-level

## Connection Pooling

The edge function maintains a connection pool for performance:

- **Pool Size**: 10 connections (configurable)
- **Idle Timeout**: 30 seconds
- **Connection Reuse**: Automatic
- **Health Checks**: Every query tests connection

## Security Considerations

### Database User Permissions

Create a dedicated user with limited permissions:

```sql
CREATE USER app_user WITH PASSWORD 'secure_password';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE your_database TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

### Network Security

1. **Firewall Rules**: Whitelist Supabase Edge Function IPs
2. **SSL/TLS**: Always use encrypted connections
3. **VPN**: Consider VPN for extra security
4. **IP Whitelisting**: Restrict access to known IPs

### Credential Storage

- **Never** store credentials in code
- Use environment variables
- Rotate credentials regularly
- Use strong passwords

## Performance Optimization

### Indexes

Add indexes for frequently queried columns:

```sql
-- Common indexes
CREATE INDEX idx_tickets_org_id ON tickets(organization_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
```

### Query Optimization

- Use `select` to fetch only needed columns
- Add `limit` to large queries
- Use pagination with `range`
- Avoid N+1 queries

### Connection Management

- Edge function pools connections automatically
- Max 10 concurrent connections per instance
- Connections reused across requests
- Failed connections auto-recreate

## Monitoring

### Health Checks

```typescript
import { useStorageProvider } from '@/lib/storage';

const provider = useStorageProvider();
const healthy = await provider.healthCheck();

if (!healthy) {
  console.error('Database connection failed!');
}
```

### Query Logging

Enable query logging in edge function:

```typescript
// In postgres-query edge function
console.log('Query:', query, 'Params:', params);
```

### Performance Metrics

- Monitor query execution time
- Track connection pool usage
- Alert on connection failures

## Troubleshooting

### Connection Failures

**Issue**: Cannot connect to database

**Solutions**:
1. Check firewall rules
2. Verify credentials
3. Ensure database is running
4. Check SSL configuration
5. Review network connectivity

### Slow Queries

**Issue**: Queries taking too long

**Solutions**:
1. Add appropriate indexes
2. Optimize query structure
3. Use `EXPLAIN ANALYZE`
4. Consider connection pooling settings

### RLS Not Working

**Issue**: Users can see data they shouldn't

**Solutions**:
1. Verify RLS rules configured correctly
2. Check user/org ID filters
3. Review `applyRLSFilters` logic
4. Test with different users

## Migration from Supabase

### Step 1: Export Supabase Schema

```bash
# Use Supabase CLI or pg_dump
pg_dump -h db.xxx.supabase.co -U postgres -s > schema.sql
```

### Step 2: Apply to PostgreSQL

```bash
psql -h your-db-host.com -U your_username -d your_database -f schema.sql
```

### Step 3: Export Data

```bash
pg_dump -h db.xxx.supabase.co -U postgres -a > data.sql
```

### Step 4: Import Data

```bash
psql -h your-db-host.com -U your_username -d your_database -f data.sql
```

### Step 5: Update Application Config

```typescript
import { setActiveProvider, setStorageConfig } from '@/lib/storage';

setActiveProvider('postgres');
```

## Cost Comparison

### Supabase (Current)
- Free tier: 500MB database
- Pro: $25/month (8GB)
- Pay as you grow

### Self-Hosted PostgreSQL
- AWS RDS: ~$15-50/month
- DigitalOcean: ~$15/month
- Self-managed: Server costs only

### Considerations
- Edge function costs: ~$2/million requests
- Data transfer: Varies by provider
- Management overhead
- Backup costs

## Support

For issues or questions:
1. Check this documentation
2. Review edge function logs
3. Test database connectivity
4. Contact support team

## Next Steps

1. **Test in Development**: Set up test database first
2. **Schema Migration**: Apply full schema
3. **Configure RLS**: Add security rules
4. **Performance Testing**: Benchmark queries
5. **Production Rollout**: Gradual migration

---

**Last Updated**: Phase 2 Implementation  
**Version**: 1.0.0
