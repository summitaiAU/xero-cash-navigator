import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { invoiceLockService, InvoiceLock } from '@/services/invoiceLockService';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface InvoiceLockBannerProps {
  invoiceId: string;
  isCurrentUserEditing: boolean;
}

export const InvoiceLockBanner: React.FC<InvoiceLockBannerProps> = ({ 
  invoiceId, 
  isCurrentUserEditing 
}) => {
  const { user } = useAuth();
  const [lock, setLock] = useState<InvoiceLock | null>(null);
  const [showForceDialog, setShowForceDialog] = useState(false);
  const [forceReason, setForceReason] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.email) return;
      const { data } = await supabase
        .from('allowed_users')
        .select('role')
        .eq('email', user.email)
        .single();
      setIsAdmin(data?.role === 'admin');
    };
    checkAdmin();
  }, [user?.email]);

  // Subscribe to lock changes
  useEffect(() => {
    // Don't subscribe until user is authenticated
    if (!user?.id) {
      console.log('[InvoiceLockBanner] Waiting for authentication...');
      return;
    }

    console.log('[InvoiceLockBanner] Setting up lock subscription for invoice:', invoiceId);
    
    let unsubscribe: (() => void) | undefined;
    
    const setupSubscription = () => {
      unsubscribe = invoiceLockService.subscribeLockChanges(invoiceId, (newLock) => {
        setLock(newLock);
      });
    };

    setupSubscription();

    // Fetch initial lock
    invoiceLockService.getLock(invoiceId).then(setLock);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [invoiceId, user?.id]);

  // Don't show banner if no lock or current user is the locker
  if (!lock || lock.locked_by_user_id === user?.id) return null;

  const handleForceTake = async () => {
    if (!forceReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    const result = await invoiceLockService.forceTakeLock(invoiceId, forceReason);
    if (result.success) {
      toast.success('Lock taken over');
      setShowForceDialog(false);
      setForceReason('');
    } else {
      toast.error(result.error || 'Failed to take over lock');
    }
  };

  return (
    <>
      <Alert className="mb-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
        <Lock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <div className="font-medium text-orange-800 dark:text-orange-300 mb-1">
              Invoice Locked
            </div>
            <div className="text-sm text-orange-700 dark:text-orange-400">
              {lock.locked_by_email} is currently editing this invoice
              {' '}({formatDistanceToNow(new Date(lock.locked_at), { addSuffix: true })})
            </div>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForceDialog(true)}
              className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900"
            >
              Take Over
            </Button>
          )}
        </AlertDescription>
      </Alert>

      <AlertDialog open={showForceDialog} onOpenChange={setShowForceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Take Over Lock?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You're about to take over the lock from <strong>{lock.locked_by_email}</strong>. 
                This will immediately unlock the invoice for you and prevent them from saving changes.
              </p>
              <div>
                <label className="text-sm font-medium mb-1 block">Reason (required):</label>
                <Textarea
                  value={forceReason}
                  onChange={(e) => setForceReason(e.target.value)}
                  placeholder="Explain why you need to take over this lock..."
                  className="min-h-[80px]"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceTake}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Take Over
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
