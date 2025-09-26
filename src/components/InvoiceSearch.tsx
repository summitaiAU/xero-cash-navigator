import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, X } from 'lucide-react';
import { Invoice } from '@/types/invoice';
import { cn } from '@/lib/utils';

interface InvoiceSearchProps {
  invoices: Invoice[];
  onInvoiceSelect: (invoice: Invoice) => void;
  placeholder?: string;
}

export const InvoiceSearch: React.FC<InvoiceSearchProps> = ({
  invoices,
  onInvoiceSelect,
  placeholder = "Search invoices..."
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter invoices based on search value
  useEffect(() => {
    if (!searchValue.trim()) {
      setFilteredInvoices([]);
      return;
    }

    const searchTerm = searchValue.toLowerCase().trim();
    
    const filtered = invoices.filter(invoice => {
      // Filter out deleted invoices
      if (invoice.status === 'DELETED') return false;

      const invoiceNumber = invoice.invoice_number?.toLowerCase() || '';
      const supplier = invoice.supplier?.toLowerCase() || '';
      
      // Handle INV prefix searching both ways
      const normalizeInvoiceNumber = (num: string) => {
        const cleaned = num.replace(/^inv/i, '');
        return cleaned;
      };
      
      const normalizedInvoiceNumber = normalizeInvoiceNumber(invoiceNumber);
      const normalizedSearchTerm = normalizeInvoiceNumber(searchTerm);
      
      // Check if search matches invoice number (with or without INV prefix)
      const matchesInvoiceNumber = 
        invoiceNumber.includes(searchTerm) ||
        normalizedInvoiceNumber.includes(normalizedSearchTerm) ||
        (`inv${normalizedInvoiceNumber}`).includes(searchTerm);
      
      // Check if search matches supplier
      const matchesSupplier = supplier.includes(searchTerm);
      
      return matchesInvoiceNumber || matchesSupplier;
    });

    setFilteredInvoices(filtered.slice(0, 10)); // Limit to 10 results
  }, [searchValue, invoices]);

  const handleInvoiceSelect = (invoice: Invoice) => {
    setSearchValue("");
    setOpen(false);
    onInvoiceSelect(invoice);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setSearchValue("");
    setFilteredInvoices([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Paid</span>;
      case 'FLAGGED':
        return <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Flagged</span>;
      default:
        return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Payable</span>;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="pl-10 pr-10"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandList>
            {filteredInvoices.length === 0 && searchValue.trim() ? (
              <CommandEmpty>No invoices found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredInvoices.map((invoice) => (
                  <CommandItem
                    key={invoice.id}
                    value={invoice.id}
                    onSelect={() => handleInvoiceSelect(invoice)}
                    className="flex items-center justify-between p-3 cursor-pointer"
                  >
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {invoice.invoice_number}
                        </span>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate">{invoice.supplier}</span>
                        <span className="font-medium whitespace-nowrap ml-2">
                          {formatCurrency(invoice.amount)}
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};