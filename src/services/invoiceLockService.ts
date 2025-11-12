import { supabase } from '@/integrations/supabase/client';
import { auditService } from './auditService';

export interface InvoiceLock {
  id: string;
  invoice_id: string;
  locked_by_user_id: string;
  locked_by_email: string;
  locked_at: string;
  lock_expires_at: string;
  force_taken: boolean;
  force_reason?: string;
}

class InvoiceLockService {
  // Acquire lock (hard lock)
  async acquireLock(invoiceId: string): Promise<{ success: boolean; lock?: InvoiceLock; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      // Try to insert lock
      const { data, error } = await supabase
        .from('invoice_locks')
        .insert({
          invoice_id: invoiceId,
          locked_by_user_id: user.id,
          locked_by_email: user.email || 'unknown',
          lock_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
        })
        .select()
        .single();

      if (error) {
        // Check if lock already exists
        const { data: existingLock, error: existingErr } = await supabase
          .from('invoice_locks')
          .select('*')
          .eq('invoice_id', invoiceId)
          .maybeSingle();

        if (existingErr) {
          console.warn('[invoiceLockService] lookup existing lock error:', existingErr);
        }
        
        if (existingLock) {
          return { 
            success: false, 
            error: `Invoice is locked by ${existingLock.locked_by_email}`,
            lock: existingLock as InvoiceLock
          };
        }
        return { success: false, error: error.message };
      }

      return { success: true, lock: data as InvoiceLock };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Release lock
  async releaseLock(invoiceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      const { error } = await supabase
        .from('invoice_locks')
        .delete()
        .eq('invoice_id', invoiceId)
        .eq('locked_by_user_id', user.id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Extend lock (heartbeat every 5 minutes)
  async extendLock(invoiceId: string): Promise<{ success: boolean }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false };

      const { error } = await supabase
        .from('invoice_locks')
        .update({
          lock_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        })
        .eq('invoice_id', invoiceId)
        .eq('locked_by_user_id', user.id);

      return { success: !error };
    } catch {
      return { success: false };
    }
  }

  // Force take lock (admin only)
  async forceTakeLock(invoiceId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      // Delete existing lock and create new one
      await supabase
        .from('invoice_locks')
        .delete()
        .eq('invoice_id', invoiceId);

      const { data, error } = await supabase
        .from('invoice_locks')
        .insert({
          invoice_id: invoiceId,
          locked_by_user_id: user.id,
          locked_by_email: user.email || 'unknown',
          force_taken: true,
          force_reason: reason,
          lock_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      // Log force takeover in audit
      await auditService.log({
        action_type: 'FORCE_TAKE_LOCK',
        entity_type: 'INVOICE',
        entity_id: invoiceId,
        details: { reason, force_taken: true }
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Get lock for invoice
  async getLock(invoiceId: string): Promise<InvoiceLock | null> {
    try {
      const { data, error } = await supabase
        .from('invoice_locks')
        .select('*')
        .eq('invoice_id', invoiceId)
        .maybeSingle();

      if (error) {
        console.warn('[invoiceLockService] getLock error:', error);
        return null;
      }

      return (data as InvoiceLock) ?? null;
    } catch {
      return null;
    }
  }

  // Subscribe to lock changes for an invoice
  subscribeLockChanges(invoiceId: string, callback: (lock: InvoiceLock | null) => void) {
    const channel = supabase
      .channel(`invoice-lock-${invoiceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoice_locks',
          filter: `invoice_id=eq.${invoiceId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            callback(payload.new as InvoiceLock);
          } else if (payload.eventType === 'DELETE') {
            callback(null);
          }
        }
      )
      .subscribe((status) => {
        console.log('[invoiceLockService] Subscription status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('[invoiceLockService] Channel error - check RLS policies and auth state');
        }
      });

    return () => supabase.removeChannel(channel);
  }
}

export const invoiceLockService = new InvoiceLockService();
