import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Search, X } from 'lucide-react';
import { Invoice } from '@/types/invoice';

interface InvoiceSearchProps {
  invoices: Invoice[];
  onInvoiceSelect: (invoice: Invoice) => void;
}

export const InvoiceSearch: React.FC<InvoiceSearchProps> = ({
  invoices,
  onInvoiceSelect
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);

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
    setFilteredInvoices([]);
    setOpen(false);
    onInvoiceSelect(invoice);
  };

  const handleClear = () => {
    setSearchValue("");
    setFilteredInvoices([]);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Search invoices">
          <Search className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-background border border-border shadow-lg z-50">
        <DialogHeader>
          <DialogTitle>Search Invoices</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number or supplier..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
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

          <div className="max-h-80 overflow-y-auto bg-background border border-border rounded-md">
            <Command>
              <CommandList>
                {filteredInvoices.length === 0 && searchValue.trim() ? (
                  <CommandEmpty className="py-6 text-center text-muted-foreground">
                    No invoices found.
                  </CommandEmpty>
                ) : filteredInvoices.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground text-sm">
                    Start typing to search invoices...
                  </div>
                ) : (
                  <CommandGroup>
                    {filteredInvoices.map((invoice) => (
                      <CommandItem
                        key={invoice.id}
                        value={invoice.id}
                        onSelect={() => handleInvoiceSelect(invoice)}
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted"
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};