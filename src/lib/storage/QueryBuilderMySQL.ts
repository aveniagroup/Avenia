import { BaseQueryBuilder } from './QueryBuilder';
import type { QueryResult, QueryResultList } from './types';

/**
 * MySQL Query Builder
 * Handles MySQL-specific syntax differences
 */
export class MySQLQueryBuilder extends BaseQueryBuilder {
  private edgeFunctionUrl: string;

  constructor(tableName: string, edgeFunctionUrl: string) {
    super(tableName);
    this.edgeFunctionUrl = edgeFunctionUrl;
  }

  async execute(): Promise<QueryResult | QueryResultList> {
    const state = this.getQueryState();
    const sql = this.buildSQL(state);
    
    console.log('[MySQL] Executing query:', sql);

    try {
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
        body: JSON.stringify({ sql, params: [] }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'MySQL query failed');
      }

      const result = await response.json();
      
      // Transform result to match expected format
      if (!state.isDelete && state.selectColumns) {
        return {
          data: result.data || [],
          error: null,
          count: result.data?.length || 0,
        };
      }

      return {
        data: result.data || null,
        error: null,
      };
    } catch (error) {
      console.error('[MySQL] Query error:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  private buildSQL(state: any): string {
    const { tableName, selectColumns, insertData, updateData, isDelete, filters, orderClauses, limitValue, rangeValue } = state;

    if (isDelete) {
      return this.buildDeleteSQL(tableName, filters);
    } else if (updateData) {
      return this.buildUpdateSQL(tableName, updateData, filters);
    } else if (insertData) {
      return this.buildInsertSQL(tableName, insertData);
    } else {
      return this.buildSelectSQL(tableName, selectColumns, filters, orderClauses, limitValue, rangeValue?.start, rangeValue?.end);
    }
  }

  private buildSelectSQL(
    table: string,
    columns: string,
    filters: any[],
    orderBy: any[],
    limit?: number,
    rangeStart?: number,
    rangeEnd?: number
  ): string {
    let sql = `SELECT ${columns} FROM ${table}`;

    if (filters.length > 0) {
      sql += ' WHERE ' + filters.map(f => this.buildFilter(f)).join(' AND ');
    }

    if (orderBy.length > 0) {
      sql += ' ORDER BY ' + orderBy.map(o => `${o.column} ${o.ascending ? 'ASC' : 'DESC'}`).join(', ');
    }

    // MySQL LIMIT/OFFSET syntax
    if (limit !== undefined) {
      sql += ` LIMIT ${limit}`;
    } else if (rangeStart !== undefined && rangeEnd !== undefined) {
      const limitValue = rangeEnd - rangeStart + 1;
      sql += ` LIMIT ${limitValue} OFFSET ${rangeStart}`;
    }

    return sql;
  }

  private buildInsertSQL(table: string, data: any | any[]): string {
    const records = Array.isArray(data) ? data : [data];
    const columns = Object.keys(records[0]);
    
    const values = records.map(record => {
      const vals = columns.map(col => this.escapeValue(record[col]));
      return `(${vals.join(', ')})`;
    }).join(', ');

    return `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values}`;
  }

  private buildUpdateSQL(table: string, data: any, filters: any[]): string {
    const setClauses = Object.keys(data).map(key => 
      `${key} = ${this.escapeValue(data[key])}`
    ).join(', ');

    let sql = `UPDATE ${table} SET ${setClauses}`;

    if (filters.length > 0) {
      sql += ' WHERE ' + filters.map(f => this.buildFilter(f)).join(' AND ');
    }

    return sql;
  }

  private buildDeleteSQL(table: string, filters: any[]): string {
    let sql = `DELETE FROM ${table}`;

    if (filters.length > 0) {
      sql += ' WHERE ' + filters.map(f => this.buildFilter(f)).join(' AND ');
    }

    return sql;
  }

  private buildFilter(filter: any): string {
    const { column, operator, value } = filter;

    switch (operator) {
      case 'eq':
        return `${column} = ${this.escapeValue(value)}`;
      case 'neq':
        return `${column} != ${this.escapeValue(value)}`;
      case 'gt':
        return `${column} > ${this.escapeValue(value)}`;
      case 'gte':
        return `${column} >= ${this.escapeValue(value)}`;
      case 'lt':
        return `${column} < ${this.escapeValue(value)}`;
      case 'lte':
        return `${column} <= ${this.escapeValue(value)}`;
      case 'like':
      case 'ilike': // MySQL LIKE is case-insensitive by default with utf8_general_ci
        return `${column} LIKE ${this.escapeValue(value)}`;
      case 'is':
        return value === null ? `${column} IS NULL` : `${column} IS NOT NULL`;
      case 'in':
        const inValues = Array.isArray(value) ? value : [value];
        return `${column} IN (${inValues.map(v => this.escapeValue(v)).join(', ')})`;
      case 'contains':
        // MySQL JSON contains using JSON_CONTAINS
        return `JSON_CONTAINS(${column}, ${this.escapeValue(JSON.stringify(value))})`;
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  private escapeValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }
    // Escape single quotes for strings
    return `'${String(value).replace(/'/g, "''")}'`;
  }
}
