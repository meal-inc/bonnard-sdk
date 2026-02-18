/**
 * Bonnard SDK — Client for querying semantic layer
 */

import type {
  BonnardConfig,
  QueryOptions,
  QueryResult,
  SqlResult,
  CubeQuery,
  ExploreMeta,
  ExploreOptions,
} from './types.js';
import { buildCubeQuery, simplifyResult, isCubeNativeFormat } from './query.js';

/**
 * Parse JWT expiry from the payload (base64url-decoded middle segment).
 * Returns the `exp` claim as a millisecond timestamp, or 0 if unparseable.
 */
function parseJwtExpiry(token: string): number {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return 0;
    // base64url → base64 → decode
    const payload = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(payload));
    return typeof json.exp === 'number' ? json.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

const REFRESH_BUFFER_MS = 60_000; // refresh 60s before expiry

export function createClient(config: BonnardConfig) {
  const baseUrl = config.baseUrl || 'https://app.bonnard.dev';

  // Token cache for fetchToken mode
  let cachedToken: string | null = null;
  let cachedExpiry = 0;

  async function getToken(): Promise<string> {
    // Static API key — return directly
    if (config.apiKey) {
      return config.apiKey;
    }

    // Token callback — cache and refresh
    if (config.fetchToken) {
      const now = Date.now();
      if (cachedToken && cachedExpiry - REFRESH_BUFFER_MS > now) {
        return cachedToken;
      }

      const token = await config.fetchToken();
      cachedToken = token;
      cachedExpiry = parseJwtExpiry(token);
      return token;
    }

    throw new Error('BonnardConfig requires either apiKey or fetchToken');
  }

  async function request<T>(endpoint: string, body: unknown): Promise<T> {
    const token = await getToken();
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || 'Query failed');
    }

    return res.json();
  }

  async function requestGet<T>(endpoint: string): Promise<T> {
    const token = await getToken();
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || 'Request failed');
    }

    return res.json();
  }

  /**
   * Build a Cube-native query from QueryOptions that already use fully-qualified names.
   */
  function buildNativeQuery(options: QueryOptions): Record<string, unknown> {
    const cubeQuery: Record<string, unknown> = {};

    if (options.measures) {
      cubeQuery.measures = options.measures;
    }

    if (options.dimensions) {
      cubeQuery.dimensions = options.dimensions;
    }

    if (options.filters) {
      cubeQuery.filters = options.filters.map(f => ({
        member: f.dimension,
        operator: f.operator,
        values: f.values,
      }));
    }

    if (options.timeDimension) {
      cubeQuery.timeDimensions = [{
        dimension: options.timeDimension.dimension,
        granularity: options.timeDimension.granularity,
        dateRange: options.timeDimension.dateRange,
      }];
    }

    if (options.orderBy) {
      cubeQuery.order = Object.entries(options.orderBy).map(([key, dir]) => [key, dir]);
    }

    if (options.limit) {
      cubeQuery.limit = options.limit;
    }

    return cubeQuery;
  }

  return {
    /**
     * Execute a JSON query against the semantic layer.
     *
     * Supports two modes:
     * - **Short names**: provide `cube` and use unqualified field names (e.g. `"revenue"`)
     * - **Fully-qualified names**: omit `cube` and use dot notation (e.g. `"orders.revenue"`)
     */
    async query<T = Record<string, unknown>>(options: QueryOptions): Promise<QueryResult<T>> {
      let cubeQuery: Record<string, unknown>;

      if (isCubeNativeFormat(options)) {
        cubeQuery = buildNativeQuery(options);
      } else {
        if (!options.cube) {
          throw new Error(
            'QueryOptions requires "cube" when using short field names. ' +
            'Either set "cube" or use fully-qualified names (e.g. "orders.revenue").'
          );
        }
        cubeQuery = buildCubeQuery(options as QueryOptions & { cube: string });
      }

      const result = await request<{ data: T[]; annotation?: QueryResult['annotation'] }>(
        '/api/cube/query',
        { query: cubeQuery }
      );

      const simplifiedData = simplifyResult<T>(result.data as Record<string, unknown>[]);

      return { data: simplifiedData, annotation: result.annotation };
    },

    /**
     * Execute a raw Cube-native JSON query against the semantic layer.
     * Use this when you already have a Cube API query object.
     */
    async rawQuery<T = Record<string, unknown>>(cubeQuery: CubeQuery): Promise<QueryResult<T>> {
      const result = await request<{ data: T[]; annotation?: QueryResult['annotation'] }>(
        '/api/cube/query',
        { query: cubeQuery }
      );

      const simplifiedData = simplifyResult<T>(result.data as Record<string, unknown>[]);

      return { data: simplifiedData, annotation: result.annotation };
    },

    /**
     * Execute a SQL query against the semantic layer
     */
    async sql<T = Record<string, unknown>>(query: string): Promise<SqlResult<T>> {
      return request<SqlResult<T>>('/api/cube/query', { sql: query });
    },

    /**
     * Discover available cubes, measures, dimensions, and segments.
     * By default returns only views (viewsOnly: true).
     */
    async explore(options?: ExploreOptions): Promise<ExploreMeta> {
      const meta = await requestGet<{ cubes: ExploreMeta['cubes'] }>('/api/cube/meta');
      const viewsOnly = options?.viewsOnly ?? true;

      if (viewsOnly) {
        return { cubes: meta.cubes.filter(c => c.type === 'view') };
      }

      return meta;
    },
  };
}
