import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, Edit, Clock } from 'lucide-react';
import { useRealtime } from '@/contexts/RealtimeContext';

interface UserPresenceIndicatorProps {
  invoiceId?: string;
  className?: string;
}

export const UserPresenceIndicator: React.FC<UserPresenceIndicatorProps> = ({ 
  invoiceId, 
  className = "" 
}) => {
  const { activeUsers, getUsersOnInvoice } = useRealtime();

  const usersOnInvoice = invoiceId ? getUsersOnInvoice(invoiceId) : [];
  const totalActiveUsers = activeUsers.length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'editing':
        return <Edit className="h-3 w-3 text-orange-500" />;
      case 'viewing':
        return <Eye className="h-3 w-3 text-blue-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'editing':
        return 'bg-orange-500';
      case 'viewing':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  if (totalActiveUsers === 0 && usersOnInvoice.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Users on current invoice */}
      {usersOnInvoice.length > 0 && (
        <div className="flex items-center gap-1">
          <TooltipProvider>
            {usersOnInvoice.slice(0, 3).map((user, index) => (
              <Tooltip key={user.user_id}>
                <TooltipTrigger>
                  <div className="relative">
                    <Avatar className="h-6 w-6 border-2 border-background">
                      <AvatarFallback className="text-xs">
                        {getInitials(user.user_email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-background ${getStatusColor(user.status)}`} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(user.status)}
                    <span className="text-xs">
                      {user.user_email} is {user.status} this invoice
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
            {usersOnInvoice.length > 3 && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="secondary" className="h-6 w-6 rounded-full text-xs p-0">
                    +{usersOnInvoice.length - 3}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    {usersOnInvoice.length - 3} more users viewing this invoice
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      )}

      {/* Total active users indicator */}
      {totalActiveUsers > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="text-xs">
                <div className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                {totalActiveUsers} online
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1">
                <div className="font-medium">Active Users:</div>
                {activeUsers.slice(0, 5).map((user) => (
                  <div key={user.user_id} className="flex items-center gap-2">
                    {getStatusIcon(user.status)}
                    <span>{user.user_email}</span>
                  </div>
                ))}
                {activeUsers.length > 5 && (
                  <div className="text-muted-foreground">
                    and {activeUsers.length - 5} more...
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};