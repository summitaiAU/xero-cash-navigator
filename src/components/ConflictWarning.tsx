import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Users } from 'lucide-react';
import { useRealtime } from '@/contexts/RealtimeContext';

interface ConflictWarningProps {
  invoiceId: string;
  isEditing: boolean;
  onEditingChange?: (editing: boolean) => void;
}

export const ConflictWarning: React.FC<ConflictWarningProps> = ({ 
  invoiceId, 
  isEditing, 
  onEditingChange 
}) => {
  const { getUsersOnInvoice, isInvoiceBeingEdited } = useRealtime();
  
  const usersOnInvoice = getUsersOnInvoice(invoiceId);
  const isBeingEditedByOthers = isInvoiceBeingEdited(invoiceId);
  const otherEditors = usersOnInvoice.filter(user => user.status === 'editing');
  const otherViewers = usersOnInvoice.filter(user => user.status === 'viewing');

  // Don't show warning if no other users
  if (usersOnInvoice.length === 0) {
    return null;
  }

  // Show conflict warning if trying to edit while others are editing
  if (isEditing && isBeingEditedByOthers) {
    return (
      <Alert className="mb-4 border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <div className="font-medium mb-1">Editing Conflict Detected</div>
          <div className="text-sm">
            {otherEditors.map(user => user.user_email).join(', ')} {otherEditors.length === 1 ? 'is' : 'are'} currently editing this invoice. 
            Changes may conflict with each other.
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show warning if others are editing when user wants to edit
  if (!isEditing && isBeingEditedByOthers) {
    return (
      <Alert className="mb-4 border-yellow-200 bg-yellow-50">
        <Users className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <div className="font-medium mb-1">Invoice Being Edited</div>
          <div className="text-sm">
            {otherEditors.map(user => user.user_email).join(', ')} {otherEditors.length === 1 ? 'is' : 'are'} currently editing this invoice.
            You may want to wait before making changes.
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show info if others are viewing
  if (otherViewers.length > 0) {
    return (
      <Alert className="mb-4 border-blue-200 bg-blue-50">
        <Users className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <div className="text-sm">
            {otherViewers.length} other {otherViewers.length === 1 ? 'user is' : 'users are'} viewing this invoice: {' '}
            {otherViewers.map(user => user.user_email).join(', ')}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};