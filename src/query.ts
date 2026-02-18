/**
 * Bonnard SDK — Pure query-building functions (zero IO)
 */

import type { QueryOptions } from './types.js';

/**
 * Convert SDK QueryOptions into a Cube-native query object.
 * Handles cube-name prefixing for all field references.
 */
export function buildCubeQuery(options: QueryOptions): Record<string, unknown> {
  const cubeQuery: Record<string, unknown> = {};

  if (options.measures) {
    cubeQuery.measures = options.measures.map(m =>
      m.includes('.') ? m : `${options.cube}.${m}`
    );
  }

  if (options.dimensions) {
    cubeQuery.dimensions = options.dimensions.map(d =>
      d.includes('.') ? d : `${options.cube}.${d}`
    );
  }

  if (options.filters) {
    cubeQuery.filters = options.filters.map(f => ({
      dimension: f.dimension.includes('.') ? f.dimension : `${options.cube}.${f.dimension}`,
      operator: f.operator,
      values: f.values,
    }));
  }

  if (options.timeDimension) {
    cubeQuery.timeDimensions = [{
      dimension: options.timeDimension.dimension.includes('.')
        ? options.timeDimension.dimension
        : `${options.cube}.${options.timeDimension.dimension}`,
      granularity: options.timeDimension.granularity,
      dateRange: options.timeDimension.dateRange,
    }];
  }

  if (options.orderBy) {
    cubeQuery.order = Object.entries(options.orderBy).map(([key, dir]) => [
      key.includes('.') ? key : `${options.cube}.${key}`,
      dir,
    ]);
  }

  if (options.limit) {
    cubeQuery.limit = options.limit;
  }

  return cubeQuery;
}

/**
 * Simplify Cube response keys by removing the cube prefix.
 * e.g. { "orders.revenue": 100 } → { "revenue": 100 }
 */
export function simplifyResult<T = Record<string, unknown>>(
  data: Record<string, unknown>[]
): T[] {
  return data.map(row => {
    const simplified: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const simpleName = key.includes('.') ? key.split('.').pop()! : key;
      simplified[simpleName] = value;
    }
    return simplified as T;
  });
}
