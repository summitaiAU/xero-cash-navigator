import { useState, useEffect } from 'react';
import { invoiceLockService, InvoiceLock } from '@/services/invoiceLockService';
import { useAuth } from '@/hooks/useAuth';

export const useInvoiceLock = (invoiceId: string | undefined) => {
  const { user } = useAuth();
  const [lock, setLock] = useState<InvoiceLock | null>(null);

  useEffect(() => {
    if (!invoiceId || !user?.id) {
      setLock(null);
      return;
    }

    // Subscribe to lock changes
    const unsubscribe = invoiceLockService.subscribeLockChanges(invoiceId, (newLock) => {
      setLock(newLock);
    });

    // Fetch initial lock
    invoiceLockService.getLock(invoiceId).then(setLock);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [invoiceId, user?.id]);

  const isLockedByOther = lock !== null && lock.locked_by_user_id !== user?.id;
  const lockedByUser = isLockedByOther ? lock?.locked_by_email : undefined;

  return { isLockedByOther, lockedByUser, lock };
};
