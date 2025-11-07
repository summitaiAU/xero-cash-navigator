import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UserPresence {
  user_email: string;
  user_id: string;
  current_invoice_id?: string;
  last_activity: string;
  status: 'viewing' | 'editing' | 'idle';
}

interface RealtimeContextType {
  activeUsers: UserPresence[];
  currentChannel: RealtimeChannel | null;
  updatePresence: (invoiceId?: string, status?: 'viewing' | 'editing' | 'idle') => void;
  getUsersOnInvoice: (invoiceId: string) => UserPresence[];
  isInvoiceBeingEdited: (invoiceId: string) => boolean;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

interface RealtimeProviderProps {
  children: React.ReactNode;
  enabled?: boolean; // Default true for backward compatibility
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ 
  children, 
  enabled = true 
}) => {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const currentUserId = user?.id;

  // Refs for stable subscription lifecycle
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userRef = useRef<{ id: string; email: string } | null>(null);
  const lastPresenceRef = useRef<{ invoiceId?: string; status?: 'viewing' | 'editing' | 'idle' }>({});
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Keep user ref in sync
  useEffect(() => {
    userRef.current = user ? { id: user.id, email: user.email ?? '' } : null;
  }, [user?.id, user?.email]);

  // Stable presence channel subscription (only re-subscribes when user.id or enabled changes)
  useEffect(() => {
    if (!enabled || !user?.id) return;

    // Only create if not already created
    if (!channelRef.current) {
      const channel = supabase.channel('user-presence', {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          const users: UserPresence[] = [];
          
          Object.keys(presenceState).forEach((key) => {
            const presences = presenceState[key] as any[];
            presences.forEach((presence) => {
              users.push(presence);
            });
          });
          
          setActiveUsers(users);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          // Reduced logging - only log when significant
          if (newPresences.length > 0) {
            console.log('[presence] user joined', { count: newPresences.length, t: new Date().toISOString() });
          }
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          if (leftPresences.length > 0) {
            console.log('[presence] user left', { count: leftPresences.length, t: new Date().toISOString() });
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && userRef.current) {
            await channel.track({
              user_email: userRef.current.email,
              user_id: userRef.current.id,
              last_activity: new Date().toISOString(),
              status: 'idle'
            });
            console.log('[presence] subscribed', { userId: user.id, t: new Date().toISOString() });
          }
        });

      channelRef.current = channel;
    }

    return () => {
      // Cleanup only when user.id or enabled changes (or unmount)
      if (channelRef.current) {
        console.log('[presence] unsubscribing', { userId: user?.id, t: new Date().toISOString() });
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [user?.id, enabled]);

  const updatePresence = useCallback(async (invoiceId?: string, status: 'viewing' | 'editing' | 'idle' = 'viewing') => {
    const channel = channelRef.current;
    const usr = userRef.current;
    if (!channel || !usr) return;

    // Only track when something changed
    const changed = lastPresenceRef.current.invoiceId !== invoiceId || lastPresenceRef.current.status !== status;
    if (!changed) return;

    lastPresenceRef.current = { invoiceId, status };

    // Debounce to batch rapid calls during navigation
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      await channel.track({
        user_email: usr.email,
        user_id: usr.id,
        current_invoice_id: invoiceId,
        last_activity: new Date().toISOString(),
        status,
      });
      console.log('[presence] track', { invoiceId, status, t: new Date().toISOString() });
    }, 100);
  }, []);

  const getUsersOnInvoice = React.useCallback((invoiceId: string) => {
    return activeUsers.filter(u => 
      u.current_invoice_id === invoiceId && 
      u.user_id !== currentUserId // Exclude current user
    );
  }, [activeUsers, currentUserId]);

  const isInvoiceBeingEdited = React.useCallback((invoiceId: string) => {
    return activeUsers.some(u => 
      u.current_invoice_id === invoiceId && 
      u.status === 'editing' &&
      u.user_id !== currentUserId // Exclude current user
    );
  }, [activeUsers, currentUserId]);

  const value: RealtimeContextType = {
    activeUsers,
    currentChannel: channelRef.current,
    updatePresence,
    getUsersOnInvoice,
    isInvoiceBeingEdited
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};