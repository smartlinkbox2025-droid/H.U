import { useLiveQuery } from 'dexie-react-hooks';

/**
 * Simple thin wrapper around Dexie's useLiveQuery.
 * This keeps components independent of the underlying reactive library.
 */
export function useAsyncQuery<T>(fn: () => T | Promise<T>, deps: unknown[] = []): T | undefined {
  return useLiveQuery(fn, deps);
}
