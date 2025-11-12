import { useEffect } from 'react';
import { useRealtime } from '@/contexts/RealtimeContext';

interface UseUserPresenceProps {
  currentInvoiceId?: string;
  isEditing?: boolean;
}

export const useUserPresence = ({ currentInvoiceId, isEditing = false }: UseUserPresenceProps) => {
  const { updatePresence, getUsersOnInvoice, isInvoiceBeingEdited } = useRealtime();

  // Update presence when invoice or editing status changes
  useEffect(() => {
    if (currentInvoiceId) {
      const status = isEditing ? 'editing' : 'viewing';
      updatePresence(currentInvoiceId, status);
    } else {
      updatePresence(undefined, 'idle');
    }
  }, [currentInvoiceId, isEditing, updatePresence]);

  // Update presence on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence(undefined, 'idle');
      } else if (currentInvoiceId) {
        const status = isEditing ? 'editing' : 'viewing';
        updatePresence(currentInvoiceId, status);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentInvoiceId, isEditing, updatePresence]);

  // Update presence on window unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      updatePresence(undefined, 'idle');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [updatePresence]);

  // Heartbeat to keep presence fresh
  useEffect(() => {
    if (!currentInvoiceId) return;
    
    const heartbeat = setInterval(() => {
      const status = isEditing ? 'editing' : 'viewing';
      updatePresence(currentInvoiceId, status);
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(heartbeat);
  }, [currentInvoiceId, isEditing, updatePresence]);

  return {
    usersOnCurrentInvoice: currentInvoiceId ? getUsersOnInvoice(currentInvoiceId) : [],
    isCurrentInvoiceBeingEdited: currentInvoiceId ? isInvoiceBeingEdited(currentInvoiceId) : false
  };
};