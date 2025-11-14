import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { formatDateTimeSydney } from '@/lib/dateUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InvoiceEditInfoProps {
  lastEditedAt?: string;
  lastEditedByEmail?: string;
  className?: string;
}

export const InvoiceEditInfo: React.FC<InvoiceEditInfoProps> = ({
  lastEditedAt,
  lastEditedByEmail,
  className = ''
}) => {
  if (!lastEditedAt || !lastEditedByEmail) {
    return null;
  }

  const relativeTime = formatDistanceToNow(new Date(lastEditedAt), { addSuffix: true });
  const absoluteTime = formatDateTimeSydney(lastEditedAt);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`text-xs text-muted-foreground ${className}`}>
            Last edited by <span className="font-medium">{lastEditedByEmail}</span> {relativeTime}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{absoluteTime} Sydney time</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
