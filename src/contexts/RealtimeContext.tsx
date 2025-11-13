import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

// Module-scoped singleton to prevent duplicate channels
let sharedPresenceChannel: RealtimeChannel | null = null;
let sharedPresenceSubscribers = 0;
let sharedPresenceReady = false;
let disabledForSession = false;
let reconnectTimestamps: number[] = [];
let handlersAttached = false;

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
  
  // Presence enabled by default
  const presenceEnabled = enabled;

  // Refs for stable subscription lifecycle
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userRef = useRef<{ id: string; email: string } | null>(null);
  const lastPresenceRef = useRef<{ invoiceId?: string; status?: 'viewing' | 'editing' | 'idle' }>({});
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Keep user ref in sync
  useEffect(() => {
    userRef.current = user ? { id: user.id, email: user.email ?? '' } : null;
  }, [user?.id, user?.email]);

  // Stable presence channel subscription (singleton pattern)
  useEffect(() => {
    if (!presenceEnabled || !user?.id) {
      return;
    }

    // Reuse existing channel or create new one
    if (sharedPresenceChannel && !channelRef.current) {
      channelRef.current = sharedPresenceChannel;
      sharedPresenceSubscribers++;
      console.log('[presence] Reusing existing channel', { subscribers: sharedPresenceSubscribers });
    } else if (!sharedPresenceChannel) {
      const channel = supabase.channel('user-presence', {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      // Attach handlers only once
      if (!handlersAttached) {
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
          .on('presence', { event: 'join' }, () => {
            // Silenced to reduce noise
          })
          .on('presence', { event: 'leave' }, () => {
            // Silenced to reduce noise
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && userRef.current) {
              setConnectionStatus('live');
              setLastSyncTime(new Date());
              
              // Initial join - use track only once
              if (!sharedPresenceReady) {
                await channel.track({
                  user_email: userRef.current.email,
                  user_id: userRef.current.id,
                  last_activity: new Date().toISOString(),
                  status: 'idle'
                });
                sharedPresenceReady = true;
                console.log('[presence] track (join)', { userId: userRef.current.id });
              }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              // Track reconnection attempts
              const now = Date.now();
              reconnectTimestamps.push(now);
              reconnectTimestamps = reconnectTimestamps.filter(t => now - t < 10000); // Keep last 10 seconds
              
              if (reconnectTimestamps.length >= 5) {
                console.warn('[presence] Excessive reconnects; disabling presence this session');
                disabledForSession = true;
                channel.unsubscribe();
                sharedPresenceChannel = null;
                sharedPresenceReady = false;
                handlersAttached = false;
                setConnectionStatus('offline');
                return;
              }
              
              setConnectionStatus(status === 'TIMED_OUT' ? 'reconnecting' : 'offline');
            }
          });

        handlersAttached = true;
      }

      sharedPresenceChannel = channel;
      channelRef.current = channel;
      sharedPresenceSubscribers = 1;
      console.log('[presence] Created new channel', { userId: user.id });
    }

    return () => {
      // Only unsubscribe when all subscribers are gone
      sharedPresenceSubscribers--;
      
      if (sharedPresenceSubscribers <= 0 && sharedPresenceChannel) {
        console.log('[presence] Last subscriber - unsubscribing');
        sharedPresenceChannel.unsubscribe();
        sharedPresenceChannel = null;
        channelRef.current = null;
        sharedPresenceReady = false;
        handlersAttached = false;
        disabledForSession = false;
        reconnectTimestamps = [];
      }
    };
  }, [user?.id, presenceEnabled]);

  const updatePresence = useCallback(async (invoiceId?: string, status: 'viewing' | 'editing' | 'idle' = 'viewing') => {
    if (disabledForSession) return;
    
    const channel = channelRef.current;
    const usr = userRef.current;
    if (!channel || !usr || !sharedPresenceReady) return;

    // Only update when something changed
    const changed = lastPresenceRef.current.invoiceId !== invoiceId || lastPresenceRef.current.status !== status;
    if (!changed) return;

    lastPresenceRef.current = { invoiceId, status };

    // Debounce to batch rapid calls during navigation
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      // Use track to update presence (Supabase handles update vs join internally)
      await channel.track({
        user_email: usr.email,
        user_id: usr.id,
        current_invoice_id: invoiceId,
        last_activity: new Date().toISOString(),
        status,
      });
    }, 100);
  }, []);

  const getUsersOnInvoice = React.useCallback((invoiceId: string) => {
    const now = new Date().getTime();
    const TEN_MINUTES = 10 * 60 * 1000; // Increased from 5 to 10 minutes
    
    const filtered = activeUsers.filter(u => {
      // Must have matching invoice ID
      if (u.current_invoice_id !== invoiceId) {
        return false;
      }
      
      // Must not be the current user
      if (u.user_id === currentUserId) {
        return false;
      }
      
      // Must be actively viewing or editing (not idle)
      if (u.status === 'idle') {
        return false;
      }
      
      // Must have recent activity (within last 10 minutes)
      const lastActivity = new Date(u.last_activity).getTime();
      if (now - lastActivity > TEN_MINUTES) {
        return false;
      }
      
      return true;
    });
    
    console.log('[presence] getUsersOnInvoice:', { 
      invoiceId, 
      totalActive: activeUsers.length, 
      filtered: filtered.length,
      users: filtered.map(u => ({ email: u.user_email, status: u.status }))
    });
    
    return filtered;
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