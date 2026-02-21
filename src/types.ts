/**
 * Bonnard SDK — Shared types
 */

export interface BonnardConfig {
  apiKey?: string;
  fetchToken?: () => Promise<string>;
  baseUrl?: string;
}

export interface QueryOptions {
  measures?: string[];
  dimensions?: string[];
  filters?: Filter[];
  timeDimension?: TimeDimension;
  orderBy?: Record<string, 'asc' | 'desc'>;
  limit?: number;
}

export interface CubeQuery {
  measures?: string[];
  dimensions?: string[];
  timeDimensions?: Array<{
    dimension: string;
    granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    dateRange?: string | [string, string];
  }>;
  filters?: Array<{
    member: string;
    operator: string;
    values?: (string | number)[];
  }>;
  segments?: string[];
  order?: Record<string, 'asc' | 'desc'> | Array<[string, 'asc' | 'desc']>;
  limit?: number;
  offset?: number;
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

export interface ExploreMeta {
  cubes: CubeMetaItem[];
}

export interface CubeMetaItem {
  name: string;
  title?: string;
  description?: string;
  type?: string;
  measures: CubeFieldMeta[];
  dimensions: CubeFieldMeta[];
  segments: CubeSegmentMeta[];
}

export interface CubeFieldMeta {
  name: string;
  title?: string;
  shortTitle?: string;
  description?: string;
  type: string;
}

export interface CubeSegmentMeta {
  name: string;
  title?: string;
  shortTitle?: string;
  description?: string;
}

export interface ExploreOptions {
  viewsOnly?: boolean;
}

/** Type helper for defining cube schemas */
export type InferQueryResult<C extends string, M extends string[], D extends string[]> = {
  [K in M[number] | D[number]]: K extends M[number] ? number : string;
};

export interface DashboardResult {
  dashboard: {
    slug: string;
    title: string;
    description: string | null;
    content: string;
    version: number;
    created_at: string;
    updated_at: string;
  };
}

export interface DashboardListResult {
  dashboards: Array<{
    slug: string;
    title: string;
    description: string | null;
    version: number;
    updated_at: string;
  }>;
}

export interface DocsOptions {
  topic?: string;
  category?: string;
}

export interface DocsTopicSummary {
  id: string;
  title: string;
  description: string | null;
  category: string;
}

export interface DocsTopicListResult {
  topics: DocsTopicSummary[];
}

export interface DocsTopicResult {
  topic: { id: string; title: string; content: string };
}
