/**
 * Data Transformation Layer
 * Handles data transformation during migration
 */

export type TransformFunction = (value: any, row: any) => any;

export interface ColumnTransformation {
  sourceColumn: string;
  targetColumn: string;
  transform?: TransformFunction;
  defaultValue?: any;
  required?: boolean;
}

export interface TableTransformation {
  sourceTable: string;
  targetTable: string;
  columnMappings: ColumnTransformation[];
  rowFilter?: (row: any) => boolean;
  rowTransform?: (row: any) => any;
}

export interface TransformationConfig {
  transformations: TableTransformation[];
  globalTransforms?: {
    beforeTransform?: (data: any[]) => any[];
    afterTransform?: (data: any[]) => any[];
  };
}

/**
 * Built-in transformation functions
 */
export const TransformFunctions = {
  // String transformations
  uppercase: (value: any) => String(value).toUpperCase(),
  lowercase: (value: any) => String(value).toLowerCase(),
  trim: (value: any) => String(value).trim(),
  
  // Type conversions
  toString: (value: any) => String(value),
  toNumber: (value: any) => Number(value),
  toBoolean: (value: any) => Boolean(value),
  toDate: (value: any) => new Date(value),
  
  // Null handling
  nullToDefault: (defaultValue: any) => (value: any) => value ?? defaultValue,
  emptyToNull: (value: any) => (value === '' ? null : value),
  
  // Custom transformations
  concatenate: (...fields: string[]) => (value: any, row: any) => 
    fields.map(f => row[f]).filter(Boolean).join(' '),
  
  split: (delimiter: string, index: number) => (value: any) =>
    String(value).split(delimiter)[index],
  
  replace: (search: string | RegExp, replacement: string) => (value: any) =>
    String(value).replace(search, replacement),
  
  // Date transformations
  formatDate: (format: string) => (value: any) => {
    const date = new Date(value);
    // Simple format implementation
    return date.toISOString();
  },
  
  // Numeric transformations
  round: (decimals: number = 0) => (value: any) => {
    const num = Number(value);
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },
  
  multiply: (factor: number) => (value: any) => Number(value) * factor,
  add: (amount: number) => (value: any) => Number(value) + amount,
};

/**
 * Apply transformations to a batch of data
 */
export function applyTransformations(
  data: any[],
  config: TableTransformation
): any[] {
  let transformed = data;

  // Apply row filter
  if (config.rowFilter) {
    transformed = transformed.filter(config.rowFilter);
  }

  // Transform each row
  transformed = transformed.map(row => {
    const newRow: any = {};

    // Apply column mappings
    for (const mapping of config.columnMappings) {
      let value = row[mapping.sourceColumn];

      // Apply transformation if provided
      if (mapping.transform) {
        try {
          value = mapping.transform(value, row);
        } catch (error) {
          console.error(`Error transforming ${mapping.sourceColumn}:`, error);
          value = mapping.defaultValue;
        }
      }

      // Use default value if undefined/null and required
      if ((value === undefined || value === null) && mapping.required) {
        value = mapping.defaultValue;
      }

      newRow[mapping.targetColumn] = value;
    }

    // Apply row-level transformation
    if (config.rowTransform) {
      return config.rowTransform(newRow);
    }

    return newRow;
  });

  return transformed;
}

/**
 * Validate transformation configuration
 */
export function validateTransformationConfig(
  config: TransformationConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.transformations || config.transformations.length === 0) {
    errors.push('No transformations defined');
  }

  for (const transform of config.transformations) {
    if (!transform.sourceTable) {
      errors.push('Source table is required');
    }
    if (!transform.targetTable) {
      errors.push('Target table is required');
    }
    if (!transform.columnMappings || transform.columnMappings.length === 0) {
      errors.push(`No column mappings defined for ${transform.sourceTable}`);
    }

    for (const mapping of transform.columnMappings) {
      if (!mapping.sourceColumn) {
        errors.push('Source column is required in mapping');
      }
      if (!mapping.targetColumn) {
        errors.push('Target column is required in mapping');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create identity transformation (1:1 mapping)
 */
export function createIdentityTransformation(
  tableName: string,
  columns: string[]
): TableTransformation {
  return {
    sourceTable: tableName,
    targetTable: tableName,
    columnMappings: columns.map(col => ({
      sourceColumn: col,
      targetColumn: col,
    })),
  };
}

/**
 * Merge transformations
 */
export function mergeTransformations(
  base: TableTransformation,
  override: Partial<TableTransformation>
): TableTransformation {
  return {
    ...base,
    ...override,
    columnMappings: [
      ...base.columnMappings,
      ...(override.columnMappings || []),
    ],
  };
}
