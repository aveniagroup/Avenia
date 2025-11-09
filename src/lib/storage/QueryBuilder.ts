import type { IQueryBuilder, QueryResult, QueryResultList, QueryFilter, FilterOperator } from './types';

/**
 * Base Query Builder
 * Provides a unified interface for building queries across different providers
 */
export abstract class BaseQueryBuilder implements IQueryBuilder {
  protected tableName: string;
  protected selectColumns: string = '*';
  protected insertData: any | any[] | null = null;
  protected updateData: any | null = null;
  protected isDelete: boolean = false;
  protected filters: QueryFilter[] = [];
  protected orderClauses: { column: string; ascending: boolean }[] = [];
  protected limitValue?: number;
  protected rangeValue?: { from: number; to: number };
  protected singleMode: boolean = false;
  protected maybeSingleMode: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*'): this {
    this.selectColumns = columns;
    return this;
  }

  insert(data: any | any[]): this {
    this.insertData = data;
    return this;
  }

  update(data: any): this {
    this.updateData = data;
    return this;
  }

  delete(): this {
    this.isDelete = true;
    return this;
  }

  // Filter methods
  protected addFilter(column: string, operator: FilterOperator, value: any): this {
    this.filters.push({ column, operator, value });
    return this;
  }

  eq(column: string, value: any): this {
    return this.addFilter(column, 'eq', value);
  }

  neq(column: string, value: any): this {
    return this.addFilter(column, 'neq', value);
  }

  gt(column: string, value: any): this {
    return this.addFilter(column, 'gt', value);
  }

  gte(column: string, value: any): this {
    return this.addFilter(column, 'gte', value);
  }

  lt(column: string, value: any): this {
    return this.addFilter(column, 'lt', value);
  }

  lte(column: string, value: any): this {
    return this.addFilter(column, 'lte', value);
  }

  like(column: string, pattern: string): this {
    return this.addFilter(column, 'like', pattern);
  }

  ilike(column: string, pattern: string): this {
    return this.addFilter(column, 'ilike', pattern);
  }

  is(column: string, value: any): this {
    return this.addFilter(column, 'is', value);
  }

  in(column: string, values: any[]): this {
    return this.addFilter(column, 'in', values);
  }

  contains(column: string, value: any): this {
    return this.addFilter(column, 'contains', value);
  }

  // Modifiers
  order(column: string, options: { ascending?: boolean } = {}): this {
    this.orderClauses.push({
      column,
      ascending: options.ascending !== false,
    });
    return this;
  }

  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  range(from: number, to: number): this {
    this.rangeValue = { from, to };
    return this;
  }

  single(): this {
    this.singleMode = true;
    return this;
  }

  maybeSingle(): this {
    this.maybeSingleMode = true;
    return this;
  }

  // Abstract method - each provider implements their own execution
  abstract execute(): Promise<QueryResult | QueryResultList>;

  // Helper method to get current query state
  protected getQueryState() {
    return {
      tableName: this.tableName,
      selectColumns: this.selectColumns,
      insertData: this.insertData,
      updateData: this.updateData,
      isDelete: this.isDelete,
      filters: this.filters,
      orderClauses: this.orderClauses,
      limitValue: this.limitValue,
      rangeValue: this.rangeValue,
      singleMode: this.singleMode,
      maybeSingleMode: this.maybeSingleMode,
    };
  }
}
