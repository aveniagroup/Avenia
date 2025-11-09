# Storage Provider Admin UI Guide

## Overview

The Storage Provider Configuration UI allows administrators to manage and switch between different database backends directly from the application settings.

## Accessing the UI

1. Navigate to **Settings** page
2. Click on the **Storage Provider** tab
3. You'll see the storage configuration interface

## Features

### 1. Provider Selection

Choose from available providers:
- **Supabase (Default)**: No configuration required, fully managed
- **PostgreSQL (Custom)**: Connect to your own PostgreSQL database
- **MySQL (Custom)**: Coming soon in Phase 3

### 2. Current Provider Status

At the top of the page, you'll see:
- Which provider is currently active
- A reminder that switching providers requires a page reload

### 3. Connection Configuration

#### PostgreSQL Configuration

When selecting PostgreSQL, you'll need to provide:

**Required Fields:**
- **Host**: Your PostgreSQL server hostname (e.g., `db.example.com`)
- **Port**: Database port (default: `5432`)
- **Database Name**: Name of your database
- **Username**: Database user with appropriate permissions
- **Password**: User's password

**Optional:**
- **Use SSL/TLS**: Toggle to enable encrypted connections (recommended for production)

**Example Configuration:**
```
Host: my-db.aws-region.rds.amazonaws.com
Port: 5432
Database: production_db
Username: app_user
Password: [secure password]
SSL: ✓ Enabled
```

### 4. Test Connection

Before saving, test your database connection:

1. Fill in all required fields
2. Click **Test Connection** button
3. Wait for the test result
4. Fix any connection issues before saving

**Success Indicators:**
- ✅ Green toast notification: "Connection successful"
- Database is accessible and credentials are valid

**Failure Indicators:**
- ❌ Red toast notification with error details
- Check hostname, credentials, firewall rules, SSL settings

### 5. Feature Capabilities Matrix

The matrix shows what each provider supports:

| Feature | Supabase | PostgreSQL | MySQL |
|---------|----------|------------|-------|
| CRUD Operations | ✅ | ✅ | ⏳ |
| Real-time Updates | ✅ | ⚠️ Polling | ⏳ |
| File Storage | ✅ | ❌ | ⏳ |
| Authentication | ✅ | ✅ | ⏳ |
| Edge Functions | ✅ | ❌ | ⏳ |
| Full-Text Search | ✅ | ✅ | ⏳ |
| Transactions | ✅ | ✅ | ⏳ |
| Connection Pooling | ✅ | ✅ | ⏳ |

**Legend:**
- ✅ Fully supported
- ⚠️ Limited support (e.g., polling instead of real-time)
- ❌ Not supported
- ⏳ Coming soon

### 6. Important Notes Section

Key warnings and considerations:
- PostgreSQL uses polling (5-second intervals) instead of true real-time
- Custom providers need separate file storage (S3, Azure Blob, etc.)
- Credentials stored locally in browser localStorage (development only)
- Page reload required after changing providers
- See documentation for schema migration

### 7. Save Configuration

After configuring and testing:

1. Click **Save Configuration** button
2. Configuration saved to localStorage
3. You'll see two toast notifications:
   - "Configuration saved"
   - "Reload required" - reminder to refresh the page
4. Reload the page to activate the new provider

## Common Workflows

### Workflow 1: Switch from Supabase to PostgreSQL

```
1. Go to Settings → Storage Provider tab
2. Select "PostgreSQL (Custom)" from dropdown
3. Enter your database connection details:
   - Host, Port, Database, Username, Password
4. Enable SSL/TLS
5. Click "Test Connection"
6. Wait for success confirmation
7. Click "Save Configuration"
8. Refresh the page (F5 or Cmd+R)
9. Application now uses your PostgreSQL database
```

### Workflow 2: Verify Current Provider

```
1. Go to Settings → Storage Provider tab
2. Check the alert at the top:
   "Current Provider: [Provider Name]"
3. Review feature capabilities matrix
```

### Workflow 3: Test Existing Configuration

```
1. Go to Settings → Storage Provider tab
2. Provider should be pre-selected
3. Connection details pre-filled
4. Click "Test Connection"
5. Verify connection still works
```

## Troubleshooting

### Connection Test Fails

**Problem**: "Connection failed" error

**Solutions:**
1. **Check hostname**: Ensure database is accessible
   - Ping the host
   - Try connecting with psql/mysql CLI
   - Check DNS resolution

2. **Verify credentials**: 
   - Test username/password manually
   - Check for password special characters
   - Ensure user has proper permissions

3. **Firewall rules**:
   - Whitelist Edge Function IPs
   - Check security group settings
   - Verify network ACLs

4. **SSL issues**:
   - Try disabling SSL temporarily
   - Check if server requires SSL
   - Verify SSL certificate validity

5. **Network**:
   - Check VPC/subnet settings
   - Verify database is public-facing (if needed)
   - Test from different network

### Configuration Not Saving

**Problem**: Changes don't persist after reload

**Solutions:**
1. Check browser console for errors
2. Verify localStorage is enabled
3. Clear browser cache and retry
4. Check for browser extensions blocking storage

### Provider Not Switching

**Problem**: Still using old provider after reload

**Solutions:**
1. Ensure you clicked "Save Configuration"
2. Verify you reloaded the page (not just navigated)
3. Check browser console for initialization errors
4. Clear localStorage and reconfigure:
   ```javascript
   // In browser console
   localStorage.removeItem('storage_config')
   ```

### Performance Issues

**Problem**: Queries are slow with custom provider

**Solutions:**
1. Check database indexes
2. Review query execution plans
3. Monitor connection pool usage
4. Consider upgrading database instance
5. Optimize RLS filters

## Security Best Practices

### Development

- ✅ Credentials in localStorage acceptable
- ✅ Use SSL/TLS for connections
- ✅ Test with development database first

### Production

- ❌ Never store credentials in localStorage
- ✅ Use environment variables
- ✅ Store credentials encrypted in backend
- ✅ Rotate credentials regularly
- ✅ Use dedicated database user with minimal permissions
- ✅ Enable SSL/TLS always
- ✅ Implement IP whitelisting
- ✅ Monitor failed connection attempts

### Recommended Database User Permissions

For PostgreSQL:
```sql
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE your_database TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

## UI Screenshots Description

### Main Configuration Screen
- Header with current provider alert
- Provider selection dropdown
- Configuration form based on selected provider
- Test connection button
- Feature capabilities table
- Important notes section
- Save button

### After Successful Test
- Green success toast at top-right
- "Connection successful" message
- Ready to save configuration

### After Save
- Two toast notifications
- Configuration saved confirmation
- Reload required reminder
- Page needs refresh to activate

## Advanced Configuration

### Custom Ports

Common ports:
- PostgreSQL: `5432`
- MySQL: `3306`
- Custom: Use your server's configured port

### SSL/TLS Configuration

**When to enable:**
- Production environments (always)
- Public databases
- Compliance requirements (GDPR, HIPAA)

**When optional:**
- Local development
- Private networks
- Docker containers on localhost

### Connection Pooling

Handled automatically by edge function:
- Default: 10 connections per pool
- Reuses connections across requests
- Automatic cleanup of dead connections
- Health checks on each query

## Migration Tips

### Before Switching Providers

1. **Backup data** from current provider
2. **Run schema migration** on new database
3. **Test connection** in UI
4. **Verify RLS rules** are configured
5. **Test with sample data** first
6. **Monitor performance** after switch

### After Switching

1. **Verify all features work**
2. **Check query performance**
3. **Monitor connection pool**
4. **Test file uploads** (if using storage)
5. **Validate authentication** flow
6. **Check real-time/polling** updates

## Getting Help

For issues or questions:

1. Check **POSTGRES_SETUP.md** for detailed PostgreSQL setup
2. Review **README.md** for architecture overview
3. Check browser console for errors
4. Review edge function logs
5. Contact support team

---

**Last Updated**: Phase 4 Implementation  
**Version**: 1.0.0
