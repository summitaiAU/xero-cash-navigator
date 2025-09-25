import React, { useEffect } from 'react';
import { useRealtimeInvoices } from '@/hooks/useRealtimeInvoices';

interface RealtimeNotificationsProps {
  viewState: 'payable' | 'paid' | 'flagged';
  onInvoiceListUpdate?: () => void;
}

export const RealtimeNotifications: React.FC<RealtimeNotificationsProps> = ({ 
  viewState, 
  onInvoiceListUpdate 
}) => {
  const { realtimeUpdates } = useRealtimeInvoices({
    viewState,
    onInvoiceUpdate: (update) => {
      // Trigger invoice list refresh when changes occur
      if (onInvoiceListUpdate) {
        // Debounce the updates to avoid too many refreshes
        setTimeout(() => {
          onInvoiceListUpdate();
        }, 1000);
      }
    }
  });

  // This component doesn't render anything visible
  // It just manages real-time notifications and triggers updates
  return null;
};