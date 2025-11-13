import { useState, useEffect, useRef } from 'react';
import { invoiceLockService, InvoiceLock } from '@/services/invoiceLockService';
import { useAuth } from '@/hooks/useAuth';

export const useInvoiceLock = (invoiceId: string | undefined) => {
  const { user } = useAuth();
  const [lock, setLock] = useState<InvoiceLock | null>(null);
  const lastEventAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!invoiceId || !user?.id) {
      setLock(null);
      return;
    }

    console.log('[useInvoiceLock] Setting up lock monitoring for invoice:', invoiceId);

    // Subscribe to lock changes
    const unsubscribe = invoiceLockService.subscribeLockChanges(invoiceId, (newLock) => {
      console.log('[useInvoiceLock] Received realtime lock update:', newLock);
      lastEventAtRef.current = Date.now();
      setLock(newLock);
    });

    // Fetch initial lock
    invoiceLockService.getLock(invoiceId).then((initialLock) => {
      console.log('[useInvoiceLock] Initial lock fetch:', initialLock);
      setLock(initialLock);
    });

    // Fallback polling: poll every 5s if no realtime event for 10s OR if lock is null
    const pollInterval = setInterval(async () => {
      const timeSinceLastEvent = Date.now() - lastEventAtRef.current;
      const shouldPoll = timeSinceLastEvent > 10000 || lock === null;
      
      if (shouldPoll) {
        console.log('[useInvoiceLock] Fallback poll triggered (no event for', Math.round(timeSinceLastEvent / 1000), 's or lock is null)');
        const currentLock = await invoiceLockService.getLock(invoiceId);
        setLock(currentLock);
        lastEventAtRef.current = Date.now(); // Reset timer after successful poll
      }
    }, 5000);

    return () => {
      console.log('[useInvoiceLock] Cleaning up lock monitoring for invoice:', invoiceId);
      if (unsubscribe) unsubscribe();
      clearInterval(pollInterval);
    };
  }, [invoiceId, user?.id, lock]);

  const isLockedByOther = lock !== null && lock.locked_by_user_id !== user?.id;
  const lockedByUser = isLockedByOther ? lock?.locked_by_email : undefined;

  return { isLockedByOther, lockedByUser, lock };
};
