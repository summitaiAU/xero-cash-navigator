import React, { createContext, useContext, useEffect, useState } from 'react';
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
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [currentChannel, setCurrentChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;

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
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_email: user.email,
            user_id: user.id,
            last_activity: new Date().toISOString(),
            status: 'idle'
          });
        }
      });

    setCurrentChannel(channel);

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const updatePresence = async (invoiceId?: string, status: 'viewing' | 'editing' | 'idle' = 'viewing') => {
    if (!currentChannel || !user) return;

    await currentChannel.track({
      user_email: user.email,
      user_id: user.id,
      current_invoice_id: invoiceId,
      last_activity: new Date().toISOString(),
      status
    });
  };

  const getUsersOnInvoice = (invoiceId: string) => {
    return activeUsers.filter(user => 
      user.current_invoice_id === invoiceId && 
      user.user_id !== user.user_id // Exclude current user
    );
  };

  const isInvoiceBeingEdited = (invoiceId: string) => {
    return activeUsers.some(user => 
      user.current_invoice_id === invoiceId && 
      user.status === 'editing' &&
      user.user_id !== user.user_id // Exclude current user
    );
  };

  const value: RealtimeContextType = {
    activeUsers,
    currentChannel,
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