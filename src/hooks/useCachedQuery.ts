import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

const CACHE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cache-service`;

// Whitelist of allowed tables for caching (security: prevents cache key manipulation)
const ALLOWED_CACHE_TABLES = ['categories', 'services', 'cities', 'districts'] as const;
type AllowedCacheTable = typeof ALLOWED_CACHE_TABLES[number];

// Derive valid public table names from DB types
type PublicTableName = keyof Database["public"]["Tables"];

interface CachedQueryOptions<T> {
  queryKey: string[];
  table: PublicTableName;
  select?: string;
  filters?: Record<string, unknown>;
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Sanitize filter value to prevent injection attacks
 */
const sanitizeFilterValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // Allow UUID format
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stringValue)) {
    return stringValue;
  }
  
  // Allow only alphanumeric, underscore, hyphen (max 100 chars)
  return stringValue.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 100);
};

/**
 * Validate and sanitize filter key names
 */
const sanitizeFilterKey = (key: string): string => {
  return key.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 50);
};

/**
 * Hook for cached queries with Edge Function fallback
 * Includes input validation to prevent cache key injection attacks
 */
export function useCachedQuery<T>({
  queryKey,
  table,
  select = '*',
  filters = {},
  enabled = true,
  staleTime = 5 * 60 * 1000,
}: CachedQueryOptions<T>) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      // Security: Only allow whitelisted tables for caching
      const isAllowedTable = ALLOWED_CACHE_TABLES.includes(table as AllowedCacheTable);
      
      if (isAllowedTable) {
        try {
          const sanitizedFilters = Object.entries(filters)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${sanitizeFilterKey(key)}=${sanitizeFilterValue(value)}`)
            .join('&');
          
          const cacheKey = `${table}:${sanitizedFilters}`;
          
          const response = await fetch(
            `${CACHE_FUNCTION_URL}?action=get&key=${encodeURIComponent(cacheKey)}`
          );
          
          if (response.ok) {
            const result = await response.json();
            if (result && typeof result === 'object' && 'data' in result && result.data) {
              return result.data as T;
            }
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('Cache fetch failed, falling back to database:', error);
          }
        }
      }

      // Fallback to direct database query (RLS will handle security)
      // Using type assertion here because table name is validated at compile time via PublicTableName
      let query = (supabase as any).from(table).select(select);

      // Apply sanitized filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const sanitizedKey = sanitizeFilterKey(key);
          if (sanitizedKey) {
            query = query.eq(sanitizedKey, value as string);
          }
        }
      });

      const { data, error } = await query;
      
      if (error) throw error;
      return data as T;
    },
    enabled,
    staleTime,
    gcTime: staleTime * 2,
  });
}
