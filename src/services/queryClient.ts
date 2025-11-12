import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient singleton
 * Allows global access for cache clearing during navigation cleanup
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
    },
  },
});
