import React from 'react';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ViewerPresenceChipsProps {
  invoiceId: string;
  maxVisible?: number;
}

export const ViewerPresenceChips: React.FC<ViewerPresenceChipsProps> = ({ 
  invoiceId, 
  maxVisible = 3 
}) => {
  const { getUsersOnInvoice } = useRealtime();
  const viewers = getUsersOnInvoice(invoiceId);

  if (viewers.length === 0) return null;

  const visibleViewers = viewers.slice(0, maxVisible);
  const remainingCount = viewers.length - maxVisible;

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (status: string) => {
    switch (status) {
      case 'editing': return 'bg-orange-500';
      case 'viewing': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {visibleViewers.map((viewer) => (
          <Tooltip key={viewer.user_id}>
            <TooltipTrigger>
              <div className="relative">
                <Avatar className="h-7 w-7 border-2 border-background">
                  <AvatarFallback className="text-xs bg-muted">
                    {getInitials(viewer.user_email)}
                  </AvatarFallback>
                </Avatar>
                <div 
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${getAvatarColor(viewer.status)}`}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                {viewer.user_email} is {viewer.status}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
        
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger>
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                <span className="text-xs font-medium text-muted-foreground">+{remainingCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1">
                {viewers.slice(maxVisible).map((v) => (
                  <div key={v.user_id}>{v.user_email}</div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
