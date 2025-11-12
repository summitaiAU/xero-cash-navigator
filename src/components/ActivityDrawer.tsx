import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Clock, User, DollarSign, FileText, Flag, Upload } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
}

interface ActivityEntry {
  id: string;
  user_email: string;
  action_type: string;
  created_at: string;
  details: any;
}

export const ActivityDrawer: React.FC<ActivityDrawerProps> = ({ 
  open, 
  onOpenChange, 
  invoiceId 
}) => {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'status' | 'amounts' | 'notes' | 'files'>('all');

  useEffect(() => {
    if (!open) return;

    const fetchActivities = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_id', invoiceId)
        .eq('entity_type', 'INVOICE')
        .order('created_at', { ascending: false })
        .limit(100);

      setActivities((data || []) as ActivityEntry[]);
      setLoading(false);
    };

    fetchActivities();
  }, [open, invoiceId]);

  const filteredActivities = React.useMemo(() => {
    if (filter === 'all') return activities;
    
    const filterMap: Record<string, string[]> = {
      status: ['PAYMENT_STATUS_CHANGE', 'INVOICE_STATUS_CHANGE', 'INVOICE_FLAGGED', 'INVOICE_UNFLAGGED'],
      amounts: ['INVOICE_AMOUNT_CHANGE', 'PARTIAL_PAYMENT', 'PAYMENT_MADE'],
      notes: ['INVOICE_NOTE_ADDED', 'INVOICE_NOTE_UPDATED', 'INVOICE_DATA_CHANGE'],
      files: ['DOCUMENT_UPLOAD', 'PAYMENT_PROOF_UPLOAD', 'INVOICE_CREATED'],
    };

    return activities.filter(a => filterMap[filter]?.includes(a.action_type));
  }, [activities, filter]);

  const getActivityIcon = (actionType: string) => {
    if (actionType.includes('AMOUNT') || actionType.includes('PAYMENT')) return DollarSign;
    if (actionType.includes('FLAG')) return Flag;
    if (actionType.includes('UPLOAD') || actionType.includes('DOCUMENT')) return Upload;
    if (actionType.includes('NOTE') || actionType.includes('DATA')) return FileText;
    return User;
  };

  const formatActivityMessage = (activity: ActivityEntry) => {
    const details = activity.details;
    switch (activity.action_type) {
      case 'PAYMENT_STATUS_CHANGE':
        return `Changed status from ${details.status_from} to ${details.status_to}`;
      case 'INVOICE_AMOUNT_CHANGE':
        return `Updated amount from $${details.old_value} to $${details.new_value}`;
      case 'DOCUMENT_UPLOAD':
        return `Uploaded payment proof`;
      case 'FORCE_TAKE_LOCK':
        return `Force took lock: ${details.reason}`;
      case 'INVOICE_FLAGGED':
        return `Flagged invoice: ${details.flag_type}`;
      case 'INVOICE_UNFLAGGED':
        return `Removed flag from invoice`;
      case 'PAYMENT_MADE':
        return `Marked invoice as paid`;
      case 'PARTIAL_PAYMENT':
        return `Recorded partial payment of $${details.amount_paid}`;
      default:
        return activity.action_type.replace(/_/g, ' ').toLowerCase();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[500px]">
        <SheetHeader>
          <SheetTitle>Activity History</SheetTitle>
        </SheetHeader>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="amounts">Amounts</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-4">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No activity found
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredActivities.map((activity) => {
                    const Icon = getActivityIcon(activity.action_type);
                    return (
                      <div key={activity.id} className="flex gap-3 pb-4 border-b border-border last:border-0">
                        <div className="mt-1">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">
                            {formatActivityMessage(activity)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{activity.user_email}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
