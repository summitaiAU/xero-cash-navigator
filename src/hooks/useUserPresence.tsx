import { useEffect } from 'react';
import { useRealtime } from '@/contexts/RealtimeContext';

interface UseUserPresenceProps {
  currentInvoiceId?: string;
  isEditing?: boolean;
  disabled?: boolean;
}

export const useUserPresence = ({ currentInvoiceId, isEditing = false, disabled = false }: UseUserPresenceProps) => {
  const { updatePresence, getUsersOnInvoice, isInvoiceBeingEdited } = useRealtime();

  // Update presence when invoice or editing status changes
  useEffect(() => {
    if (disabled) return;
    
    if (currentInvoiceId) {
      const status = isEditing ? 'editing' : 'viewing';
      updatePresence(currentInvoiceId, status);
    } else {
      updatePresence(undefined, 'idle');
    }
  }, [currentInvoiceId, isEditing, updatePresence, disabled]);

  // Update presence on page visibility change
  useEffect(() => {
    if (disabled) return;
    
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
  }, [currentInvoiceId, isEditing, updatePresence, disabled]);

  // Update presence on window unload
  useEffect(() => {
    if (disabled) return;
    
    const handleBeforeUnload = () => {
      updatePresence(undefined, 'idle');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [updatePresence, disabled]);

  // Heartbeat to keep presence fresh
  useEffect(() => {
    if (disabled || !currentInvoiceId) return;
    
    const heartbeat = setInterval(() => {
      const status = isEditing ? 'editing' : 'viewing';
      updatePresence(currentInvoiceId, status);
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(heartbeat);
  }, [currentInvoiceId, isEditing, updatePresence, disabled]);

  return {
    usersOnCurrentInvoice: disabled || !currentInvoiceId ? [] : getUsersOnInvoice(currentInvoiceId),
    isCurrentInvoiceBeingEdited: disabled || !currentInvoiceId ? false : isInvoiceBeingEdited(currentInvoiceId)
  };
};