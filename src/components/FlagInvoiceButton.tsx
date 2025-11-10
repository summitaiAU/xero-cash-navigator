import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Flag } from 'lucide-react';
import { FlagInvoiceModal } from './FlagInvoiceModal';
import { Invoice } from '@/types/invoice';

interface FlagInvoiceButtonProps {
  invoice: Invoice;
  onFlag: (invoiceId: string) => void;
}

export const FlagInvoiceButton: React.FC<FlagInvoiceButtonProps> = ({
  invoice,
  onFlag
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleFlagComplete = () => {
    onFlag(invoice.id);
    setShowModal(false);
  };

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        variant="outline"
        className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
      >
        <Flag className="h-4 w-4 mr-2" />
        Flag Invoice
      </Button>

      {showModal && (
        <FlagInvoiceModal
          invoice={invoice}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onComplete={handleFlagComplete}
        />
      )}
    </>
  );
};