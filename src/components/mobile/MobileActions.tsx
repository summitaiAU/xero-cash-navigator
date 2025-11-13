import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Edit, Undo, Lock, Loader2 } from 'lucide-react';
import { Invoice } from '@/types/invoice';
import { useToast } from '@/hooks/use-toast';

interface MobileActionsProps {
  invoice: Invoice;
  onStartEdit: () => void;
  onApprove: () => Promise<void>;
  onUndoApprove: () => Promise<void>;
  isEditing: boolean;
  isApproving: boolean;
  isLockedByOther: boolean;
  lockedByUser?: string;
}

export const MobileActions: React.FC<MobileActionsProps> = ({
  invoice,
  onStartEdit,
  onApprove,
  onUndoApprove,
  isEditing,
  isApproving,
  isLockedByOther,
  lockedByUser,
}) => {
  const { toast } = useToast();

  const handleLockedAction = () => {
    toast({
      title: 'Invoice Locked',
      description: lockedByUser 
        ? `This invoice is being edited by ${lockedByUser}`
        : 'This invoice is currently locked by another user',
      variant: 'destructive',
    });
  };

  // Don't show action buttons when editing (edit controls in XeroSection)
  if (isEditing) {
    return null;
  }

  return (
    <div className="mx-2 mt-3">
      <div className="flex gap-2">
        {/* Approve/Undo Button */}
        <Button
          onClick={invoice.approved ? onUndoApprove : onApprove}
          disabled={isApproving || isLockedByOther}
          variant={invoice.approved ? 'outline' : 'default'}
          className="flex-1 h-11"
          onTouchEnd={(e) => {
            if (isLockedByOther) {
              e.preventDefault();
              handleLockedAction();
            }
          }}
        >
          {isApproving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {invoice.approved ? 'Undoing...' : 'Approving...'}
            </>
          ) : isLockedByOther ? (
            <>
              <Lock className="mr-2 h-4 w-4" />
              {invoice.approved ? 'Undo Approval' : 'Approve Invoice'}
            </>
          ) : (
            <>
              {invoice.approved ? (
                <>
                  <Undo className="mr-2 h-4 w-4" />
                  Undo Approval
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Invoice
                </>
              )}
            </>
          )}
        </Button>

        {/* Edit Button */}
        <Button
          onClick={onStartEdit}
          disabled={isLockedByOther}
          variant="outline"
          className="flex-1 h-11"
          onTouchEnd={(e) => {
            if (isLockedByOther) {
              e.preventDefault();
              handleLockedAction();
            }
          }}
        >
          {isLockedByOther ? (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Edit Invoice
            </>
          ) : (
            <>
              <Edit className="mr-2 h-4 w-4" />
              Edit Invoice
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
