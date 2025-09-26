import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Filter, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { auditService } from '@/services/auditService';
import { useAccessControl } from '@/hooks/useAccessControl';
import { toast } from '@/components/ui/use-toast';

interface AuditLog {
  id: string;
  user_email: string;
  action_type: string;
  entity_type: string;
  entity_id?: string;
  details: any;
  ip_address?: string;
  created_at: string;
  invoice_number?: string;
}

export const AuditLogViewer: React.FC = () => {
  const { role } = useAccessControl();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    user_email: '',
    action_type: '',
    entity_type: '',
    start_date: '',
    end_date: '',
    limit: 100
  });

  const isAdmin = role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [isAdmin]);

  const fetchLogs = async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      const { data, error } = await auditService.getAuditLogs(filters);
      if (error) throw error;
      setLogs((data || []) as AuditLog[]);
    } catch (error: any) {
      toast({
        title: "Failed to fetch audit logs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Entity', 'Entity ID', 'Invoice Number', 'Details', 'IP Address'],
      ...logs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.user_email,
        log.action_type,
        log.entity_type,
        log.entity_id || '',
        log.invoice_number || '',
        JSON.stringify(log.details),
        log.ip_address || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('PAID') || action.includes('APPROVED')) return 'default';
    if (action.includes('FLAGGED') || action.includes('DELETED')) return 'destructive';
    if (action.includes('SIGN_IN') || action.includes('SIGN_OUT')) return 'secondary';
    return 'outline';
  };

  const formatDetails = (details: Record<string, any>) => {
    const relevant = Object.entries(details)
      .filter(([key]) => !['timestamp'].includes(key))
      .slice(0, 3);
    
    return relevant.map(([key, value]) => 
      `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`
    ).join(', ');
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            Only administrators can view audit logs.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Audit Log Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Input
              placeholder="User email"
              value={filters.user_email}
              onChange={(e) => setFilters(prev => ({ ...prev, user_email: e.target.value }))}
            />
            <Select
              value={filters.action_type}
              onValueChange={(value) => setFilters(prev => ({ ...prev, action_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                <SelectItem value="SIGN_IN">Sign In</SelectItem>
                <SelectItem value="SIGN_OUT">Sign Out</SelectItem>
                <SelectItem value="INVOICE_MARKED_PAID">Marked Paid</SelectItem>
                <SelectItem value="INVOICE_FLAGGED">Flagged</SelectItem>
                <SelectItem value="INVOICE_PARTIAL_PAYMENT">Partial Payment</SelectItem>
                <SelectItem value="INVOICE_DATA_UPDATE">Data Update</SelectItem>
                <SelectItem value="INVOICE_SOFT_DELETED">Soft Deleted</SelectItem>
                <SelectItem value="API_ERROR">API Error</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.entity_type}
              onValueChange={(value) => setFilters(prev => ({ ...prev, entity_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Entities</SelectItem>
                <SelectItem value="AUTH">Authentication</SelectItem>
                <SelectItem value="INVOICE">Invoice</SelectItem>
                <SelectItem value="DOCUMENT">Document</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Start date"
              value={filters.start_date}
              onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
            />
            <Input
              type="date"
              placeholder="End date"
              value={filters.end_date}
              onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button onClick={fetchLogs} disabled={loading} className="flex-1">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={exportLogs} disabled={logs.length === 0}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Logs ({logs.length})</CardTitle>
          <CardDescription>
            Comprehensive log of all user actions in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading audit logs...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No audit logs found</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={getActionBadgeVariant(log.action_type)}>
                        {log.action_type.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {log.entity_type}
                      </span>
                      {log.invoice_number && (
                        <span className="text-sm font-semibold bg-primary/10 text-primary px-2 py-1 rounded">
                          #{log.invoice_number}
                        </span>
                      )}
                      {log.entity_id && (
                        <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {log.entity_id.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">User:</span> {log.user_email}
                    </div>
                    {log.ip_address && (
                      <div>
                        <span className="font-medium">IP:</span> {log.ip_address}
                      </div>
                    )}
                  </div>
                  {Object.keys(log.details).length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Details:</span> {formatDetails(log.details)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};