/**
 * Application-Level Row Level Security (RLS)
 * Applies security filters for non-Supabase providers
 */

import type { QueryFilter } from './types';

interface QueryState {
  tableName: string;
  selectColumns: string;
  insertData: any | any[] | null;
  updateData: any | null;
  isDelete: boolean;
  filters: QueryFilter[];
  orderClauses: { column: string; ascending: boolean }[];
  limitValue?: number;
  rangeValue?: { from: number; to: number };
  singleMode: boolean;
  maybeSingleMode: boolean;
}

/**
 * RLS Rules per table
 * Defines which columns to filter by for each table
 */
const RLS_RULES: Record<string, {
  userColumn?: string; // Column that references user ID
  orgColumn?: string;  // Column that references organization ID
  publicRead?: boolean; // Allow anyone to read
}> = {
  tickets: {
    orgColumn: 'organization_id',
  },
  ticket_messages: {
    // Access via parent ticket's org
    userColumn: 'sender_id',
  },
  profiles: {
    orgColumn: 'organization_id',
  },
  organizations: {
    // Users can only see their own org
    userColumn: 'id', // Special case: org ID = user's org
  },
  audit_logs: {
    orgColumn: 'organization_id',
  },
  consent_records: {
    orgColumn: 'organization_id',
  },
  response_templates: {
    orgColumn: 'organization_id',
  },
  team_invitations: {
    orgColumn: 'organization_id',
  },
  // Add more tables as needed
};

/**
 * Get user's organization ID
 * In a real implementation, this would query the database
 * For now, assumes it's stored in the session
 */
async function getUserOrganizationId(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  
  // In production, query profiles table:
  // SELECT organization_id FROM profiles WHERE id = userId
  
  // For now, check localStorage for demo
  const session = localStorage.getItem('postgres_session');
  if (session) {
    try {
      const parsed = JSON.parse(session);
      return parsed.user?.organization_id || null;
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Apply RLS filters to query
 * Adds filters based on user's permissions
 */
export function applyRLSFilters(
  queryState: QueryState,
  userId: string | null
): QueryState {
  const { tableName, filters } = queryState;
  
  // Get RLS rules for this table
  const rules = RLS_RULES[tableName];
  
  // If no rules or public read, return as-is
  if (!rules || rules.publicRead) {
    return queryState;
  }

  // If no user, block access (unless public read)
  if (!userId) {
    // Add impossible filter to return no results
    return {
      ...queryState,
      filters: [
        ...filters,
        { column: 'id', operator: 'eq', value: '00000000-0000-0000-0000-000000000000' },
      ],
    };
  }

  const newFilters = [...filters];

  // Add user column filter if defined
  if (rules.userColumn) {
    newFilters.push({
      column: rules.userColumn,
      operator: 'eq',
      value: userId,
    });
  }

  // Add organization column filter if defined
  if (rules.orgColumn) {
    // In production, get user's org ID from database
    // For now, use a placeholder
    const orgId = '{{USER_ORG_ID}}'; // Edge function will replace this
    newFilters.push({
      column: rules.orgColumn,
      operator: 'eq',
      value: orgId,
    });
  }

  return {
    ...queryState,
    filters: newFilters,
  };
}

/**
 * Check if user can insert data
 */
export function canInsert(
  tableName: string,
  data: any,
  userId: string | null
): boolean {
  if (!userId) return false;

  const rules = RLS_RULES[tableName];
  if (!rules) return false;

  // Verify user/org columns match
  if (rules.userColumn && data[rules.userColumn] !== userId) {
    return false;
  }

  // In production, verify org ID as well
  return true;
}

/**
 * Check if user can update data
 */
export function canUpdate(
  tableName: string,
  userId: string | null
): boolean {
  // Same logic as canInsert
  return canInsert(tableName, {}, userId);
}

/**
 * Check if user can delete data
 */
export function canDelete(
  tableName: string,
  userId: string | null
): boolean {
  // Same logic as canInsert
  return canInsert(tableName, {}, userId);
}

/**
 * Add RLS rule for a table
 */
export function addRLSRule(
  tableName: string,
  rule: {
    userColumn?: string;
    orgColumn?: string;
    publicRead?: boolean;
  }
): void {
  RLS_RULES[tableName] = rule;
}

/**
 * Get all RLS rules
 */
export function getRLSRules(): typeof RLS_RULES {
  return { ...RLS_RULES };
}
