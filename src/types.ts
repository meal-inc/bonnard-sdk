/**
 * Bonnard SDK — Shared types
 */

export interface BonnardConfig {
  apiKey?: string;
  fetchToken?: () => Promise<string>;
  baseUrl?: string;
}

export interface QueryOptions {
  cube: string;
  measures?: string[];
  dimensions?: string[];
  filters?: Filter[];
  timeDimension?: TimeDimension;
  orderBy?: Record<string, 'asc' | 'desc'>;
  limit?: number;
}

export interface Filter {
  dimension: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte';
  values: (string | number)[];
}

export interface TimeDimension {
  dimension: string;
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  dateRange?: string | [string, string];
}

export interface QueryResult<T = Record<string, unknown>> {
  data: T[];
  annotation?: {
    measures: Record<string, { title: string; type: string }>;
    dimensions: Record<string, { title: string; type: string }>;
  };
}

export interface SqlResult<T = Record<string, unknown>> {
  data: T[];
  schema?: Array<{ name: string; type: string }>;
}

/** Type helper for defining cube schemas */
export type InferQueryResult<C extends string, M extends string[], D extends string[]> = {
  [K in M[number] | D[number]]: K extends M[number] ? number : string;
};
