import React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Invoice } from '@/types/invoice';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface InvoiceDropdownProps {
  invoices: Invoice[];
  currentInvoice: Invoice | null;
  onInvoiceSelect: (invoice: Invoice) => void;
}

export const InvoiceDropdown: React.FC<InvoiceDropdownProps> = ({
  invoices,
  currentInvoice,
  onInvoiceSelect,
}) => {
  const [open, setOpen] = React.useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const handleSelect = (invoice: Invoice) => {
    onInvoiceSelect(invoice);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 px-3 text-xs justify-between min-w-[140px] bg-background"
        >
          <span className="truncate">
            {currentInvoice ? currentInvoice.invoice_number : 'Select invoice'}
          </span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 z-50 bg-background border border-border shadow-lg" align="end">
        <Command>
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No invoices found.</CommandEmpty>
            <CommandGroup>
              {invoices.map((invoice) => (
                <CommandItem
                  key={invoice.id}
                  value={invoice.id}
                  onSelect={() => handleSelect(invoice)}
                  className={cn(
                    'flex items-center justify-between gap-3 py-2 px-3 cursor-pointer',
                    currentInvoice?.id === invoice.id && 'bg-muted'
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Check
                      className={cn(
                        'h-4 w-4 flex-shrink-0',
                        currentInvoice?.id === invoice.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="font-medium text-sm whitespace-nowrap">
                        {invoice.invoice_number}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {invoice.supplier}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {formatCurrency(invoice.amount)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
