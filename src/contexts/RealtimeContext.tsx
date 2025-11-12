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
  connectionStatus: 'live' | 'reconnecting' | 'offline';
  lastSyncTime: Date | null;
  retryConnection: () => void;
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
  const [connectionStatus, setConnectionStatus] = useState<'live' | 'reconnecting' | 'offline'>('live');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const currentUserId = user?.id;

  // Detect Safari browser
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  // Disable presence for Safari to prevent infinite loops
  const presenceEnabled = enabled && !isSafari;

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
    if (!presenceEnabled || !user?.id) {
      if (isSafari && user?.id) {
        console.warn('[presence] Disabled for Safari to prevent connection loops');
      }
      return;
    }

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
          setConnectionStatus('live');
          setLastSyncTime(new Date());
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
            setConnectionStatus('live');
            setLastSyncTime(new Date());
            await channel.track({
              user_email: userRef.current.email,
              user_id: userRef.current.id,
              last_activity: new Date().toISOString(),
              status: 'idle'
            });
            console.log('[presence] subscribed', { userId: user.id, t: new Date().toISOString() });
          } else if (status === 'CHANNEL_ERROR') {
            setConnectionStatus('offline');
          } else if (status === 'TIMED_OUT') {
            setConnectionStatus('reconnecting');
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
  }, [user?.id, presenceEnabled, isSafari]);

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
    const now = new Date().getTime();
    const FIVE_MINUTES = 5 * 60 * 1000;
    
    return activeUsers.filter(u => {
      // Must have matching invoice ID
      if (u.current_invoice_id !== invoiceId) return false;
      
      // Must not be the current user
      if (u.user_id === currentUserId) return false;
      
      // Must be actively viewing or editing (not idle)
      if (u.status === 'idle') return false;
      
      // Must have recent activity (within last 5 minutes)
      const lastActivity = new Date(u.last_activity).getTime();
      if (now - lastActivity > FIVE_MINUTES) return false;
      
      return true;
    });
  }, [activeUsers, currentUserId]);

  const isInvoiceBeingEdited = React.useCallback((invoiceId: string) => {
    return activeUsers.some(u => 
      u.current_invoice_id === invoiceId && 
      u.status === 'editing' &&
      u.user_id !== currentUserId // Exclude current user
    );
  }, [activeUsers, currentUserId]);

  const retryConnection = useCallback(async () => {
    setConnectionStatus('reconnecting');
    const channel = channelRef.current;
    if (channel) {
      await channel.unsubscribe();
      await channel.subscribe();
    }
  }, []);

  const value: RealtimeContextType = {
    activeUsers,
    currentChannel: channelRef.current,
    updatePresence,
    getUsersOnInvoice,
    isInvoiceBeingEdited,
    connectionStatus,
    lastSyncTime,
    retryConnection,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};