/**
 * Bonnard SDK — Client for querying semantic layer
 */

import type { BonnardConfig, QueryOptions, QueryResult, SqlResult } from './types.js';
import { buildCubeQuery, simplifyResult } from './query.js';

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
  const hasApiKey = !!config.apiKey;
  const hasFetchToken = !!config.fetchToken;

  if (!hasApiKey && !hasFetchToken) {
    throw new Error('BonnardConfig requires either apiKey or fetchToken');
  }
  if (hasApiKey && hasFetchToken) {
    throw new Error('BonnardConfig requires either apiKey or fetchToken, not both');
  }

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
    const now = Date.now();
    if (cachedToken && cachedExpiry - REFRESH_BUFFER_MS > now) {
      return cachedToken;
    }

    const token = await config.fetchToken!();
    cachedToken = token;
    cachedExpiry = parseJwtExpiry(token);
    return token;
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

  return {
    /**
     * Execute a JSON query against the semantic layer
     */
    async query<T = Record<string, unknown>>(options: QueryOptions): Promise<QueryResult<T>> {
      const cubeQuery = buildCubeQuery(options);

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
  };
}
