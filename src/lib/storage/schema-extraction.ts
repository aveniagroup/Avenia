import type { IStorageProvider } from './types';
import type { TableSchema, ColumnDefinition, IndexDefinition, ConstraintDefinition } from './migrations';

/**
 * Schema Extraction Implementation
 * Extracts database schema from different providers
 */

export interface SchemaExtractionOptions {
  includeTriggers?: boolean;
  includeIndexes?: boolean;
  includeConstraints?: boolean;
  tableFilter?: (tableName: string) => boolean;
}

/**
 * Extract schema from Postgres provider
 */
async function extractPostgresSchema(
  provider: IStorageProvider,
  tables: string[],
  options: SchemaExtractionOptions = {}
): Promise<TableSchema[]> {
  const schemas: TableSchema[] = [];

  for (const tableName of tables) {
    try {
      // Get columns
      const { data: columns } = await provider
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', tableName)
        .eq('table_schema', 'public')
        .execute();

      if (!columns || columns.length === 0) continue;

      const columnDefs: ColumnDefinition[] = columns.map((col: any) => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        defaultValue: col.column_default,
        isPrimaryKey: false,
        isForeignKey: false,
      }));

      // Get primary keys
      const { data: pkData } = await provider
        .from('information_schema.table_constraints')
        .select('constraint_name')
        .eq('table_name', tableName)
        .eq('constraint_type', 'PRIMARY KEY')
        .execute();

      if (pkData && pkData.length > 0) {
        const { data: pkColumns } = await provider
          .from('information_schema.key_column_usage')
          .select('column_name')
          .eq('constraint_name', pkData[0].constraint_name)
          .execute();

        if (pkColumns) {
          pkColumns.forEach((pk: any) => {
            const col = columnDefs.find(c => c.name === pk.column_name);
            if (col) col.isPrimaryKey = true;
          });
        }
      }

      // Get foreign keys
      const { data: fkData } = await provider
        .from('information_schema.table_constraints')
        .select('constraint_name')
        .eq('table_name', tableName)
        .eq('constraint_type', 'FOREIGN KEY')
        .execute();

      if (fkData && fkData.length > 0) {
        for (const fk of fkData) {
          const { data: fkColumns } = await provider
            .from('information_schema.key_column_usage')
            .select('column_name, referenced_table_name, referenced_column_name')
            .eq('constraint_name', fk.constraint_name)
            .execute();

          if (fkColumns) {
            fkColumns.forEach((fkCol: any) => {
              const col = columnDefs.find(c => c.name === fkCol.column_name);
              if (col) {
                col.isForeignKey = true;
                col.foreignKeyRef = {
                  table: fkCol.referenced_table_name,
                  column: fkCol.referenced_column_name,
                };
              }
            });
          }
        }
      }

      const schema: TableSchema = {
        tableName,
        columns: columnDefs,
      };

      // Get indexes if requested
      if (options.includeIndexes) {
        const { data: indexes } = await provider
          .from('pg_indexes')
          .select('indexname, indexdef')
          .eq('tablename', tableName)
          .execute();

        if (indexes) {
          schema.indexes = indexes.map((idx: any) => ({
            name: idx.indexname,
            columns: [], // Would need to parse indexdef
            unique: idx.indexdef.includes('UNIQUE'),
          }));
        }
      }

      schemas.push(schema);
    } catch (error) {
      console.error(`Error extracting schema for ${tableName}:`, error);
    }
  }

  return schemas;
}

/**
 * Extract schema from MySQL provider
 */
async function extractMySQLSchema(
  provider: IStorageProvider,
  tables: string[],
  options: SchemaExtractionOptions = {}
): Promise<TableSchema[]> {
  const schemas: TableSchema[] = [];

  for (const tableName of tables) {
    try {
      // Get table structure
      const { data: columns } = await provider
        .from('information_schema.columns')
        .select('COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY')
        .eq('TABLE_NAME', tableName)
        .execute();

      if (!columns || columns.length === 0) continue;

      const columnDefs: ColumnDefinition[] = columns.map((col: any) => ({
        name: col.COLUMN_NAME,
        type: col.DATA_TYPE,
        nullable: col.IS_NULLABLE === 'YES',
        defaultValue: col.COLUMN_DEFAULT,
        isPrimaryKey: col.COLUMN_KEY === 'PRI',
        isForeignKey: col.COLUMN_KEY === 'MUL',
      }));

      const schema: TableSchema = {
        tableName,
        columns: columnDefs,
      };

      schemas.push(schema);
    } catch (error) {
      console.error(`Error extracting schema for ${tableName}:`, error);
    }
  }

  return schemas;
}

/**
 * Extract schema from any provider
 */
export async function extractSchema(
  provider: IStorageProvider,
  tables: string[],
  options: SchemaExtractionOptions = {}
): Promise<TableSchema[]> {
  const providerName = provider.name.toLowerCase();

  // Apply table filter if provided
  const filteredTables = options.tableFilter
    ? tables.filter(options.tableFilter)
    : tables;

  if (providerName.includes('postgres') || providerName.includes('supabase')) {
    return extractPostgresSchema(provider, filteredTables, options);
  } else if (providerName.includes('mysql')) {
    return extractMySQLSchema(provider, filteredTables, options);
  }

  throw new Error(`Schema extraction not implemented for provider: ${providerName}`);
}

/**
 * Get list of tables from provider
 */
export async function getTableList(provider: IStorageProvider): Promise<string[]> {
  const providerName = provider.name.toLowerCase();

  try {
    if (providerName.includes('postgres') || providerName.includes('supabase')) {
      const { data } = await provider
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE')
        .execute();

      return data?.map((t: any) => t.table_name) || [];
    } else if (providerName.includes('mysql')) {
      const { data } = await provider
        .from('information_schema.tables')
        .select('TABLE_NAME')
        .eq('TABLE_SCHEMA', 'DATABASE()')
        .eq('TABLE_TYPE', 'BASE TABLE')
        .execute();

      return data?.map((t: any) => t.TABLE_NAME) || [];
    }
  } catch (error) {
    console.error('Error getting table list:', error);
  }

  return [];
}

/**
 * Validate table exists
 */
export async function tableExists(
  provider: IStorageProvider,
  tableName: string
): Promise<boolean> {
  const tables = await getTableList(provider);
  return tables.includes(tableName);
}
