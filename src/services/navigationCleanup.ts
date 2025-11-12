/**
 * Navigation Cleanup Service
 * 
 * Performs comprehensive cleanup before each invoice navigation:
 * - Aborts in-flight requests and timers
 * - Unloads PDF iframe
 * - Clears in-memory caches (attachments, paid invoices, react-query)
 * - Clears browser storage (sessionStorage, localStorage except auth, Cache Storage)
 * - Delays to allow browser GC to settle
 */

import { queryClient } from './queryClient';
import { attachmentCacheService } from './attachmentCache';
import { paidInvoicesCacheService } from './paidInvoicesCache';

interface CleanupHooks {
  abortRequests?: () => void;
  abortPdf?: () => void;
  clearTimers?: () => void;
}

class NavigationCleanupService {
  /**
   * Perform hard cleanup before navigating to next invoice
   */
  async hardCleanupBeforeInvoiceNavigation(hooks?: CleanupHooks): Promise<void> {
    const t0 = performance.now();
    console.info('[NavCleanup] Starting hard cleanup...');

    try {
      // 1. Abort PDF first to free renderer/GPU resources
      if (hooks?.abortPdf) {
        console.info('[NavCleanup] Aborting PDF...');
        hooks.abortPdf();
      }

      // 2. Abort in-flight requests
      if (hooks?.abortRequests) {
        console.info('[NavCleanup] Aborting requests...');
        hooks.abortRequests();
      }

      // 3. Clear timers
      if (hooks?.clearTimers) {
        console.info('[NavCleanup] Clearing timers...');
        hooks.clearTimers();
      }

      // 4. Clear in-memory caches
      console.info('[NavCleanup] Clearing in-memory caches...');
      attachmentCacheService.clear();
      paidInvoicesCacheService.invalidateAll();
      queryClient.clear();

      // 5. Clear browser storage (preserve Supabase auth keys)
      console.info('[NavCleanup] Clearing browser storage...');
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear localStorage except Supabase auth keys (sb-*)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('sb-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.info(`[NavCleanup] Removed ${keysToRemove.length} localStorage keys (preserved auth)`);

      // Clear Cache Storage if available
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          console.info(`[NavCleanup] Cleared ${cacheNames.length} cache storage entries`);
        } catch (err) {
          console.warn('[NavCleanup] Failed to clear Cache Storage:', err);
        }
      }

      // 6. Double rAF + small timeout to allow cleanup to settle
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 80));

      const elapsed = performance.now() - t0;
      console.info(`[NavCleanup] Cleanup complete in ${elapsed.toFixed(1)}ms`);
    } catch (err) {
      console.error('[NavCleanup] Cleanup error:', err);
      // Continue navigation even if cleanup partially fails
    }
  }
}

export const navigationCleanupService = new NavigationCleanupService();

// Export convenience function
export const hardCleanupBeforeInvoiceNavigation = (hooks?: CleanupHooks) =>
  navigationCleanupService.hardCleanupBeforeInvoiceNavigation(hooks);
