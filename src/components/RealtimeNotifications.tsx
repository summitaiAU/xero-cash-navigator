import React, { useEffect, useRef } from 'react';
import { useRealtimeInvoices } from '@/hooks/useRealtimeInvoices';

interface RealtimeNotificationsProps {
  viewState: 'payable' | 'paid' | 'flagged';
  onInvoiceListUpdate?: () => void;
}

export const RealtimeNotifications: React.FC<RealtimeNotificationsProps> = ({ 
  viewState, 
  onInvoiceListUpdate 
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { realtimeUpdates } = useRealtimeInvoices({
    viewState,
    onInvoiceUpdate: (update) => {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Trigger invoice list refresh when changes occur
      if (onInvoiceListUpdate) {
        // Debounce the updates to avoid too many refreshes
        timeoutRef.current = setTimeout(() => {
          onInvoiceListUpdate();
        }, 1000);
      }
    }
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // This component doesn't render anything visible
  // It just manages real-time notifications and triggers updates
  return null;
};