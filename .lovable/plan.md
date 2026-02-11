
# Plan: Add "Unmark as Paid" Button to All Invoices Viewer

## Overview
Add an "Unmark as Paid" button to both the desktop (`PaidInvoiceViewer.tsx`) and mobile (`MobilePaidInvoiceViewer.tsx`) invoice viewers on the All Invoices page, so users can revert accidentally paid invoices without needing to navigate to the Payable page.

---

## Technical Details

### 1. Desktop - PaidInvoiceViewer.tsx

Add an "Unmark as Paid" button below the RemittanceSection (after line 253), visible only when the invoice status is PAID or PARTIALLY_PAID.

```tsx
{(invoice.status === 'PAID' || invoice.status === 'PARTIALLY_PAID') && (
  <div className="border-t pt-4">
    <Button
      variant="outline"
      size="sm"
      className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
      onClick={async () => {
        const { unmarkInvoiceAsPaid } = await import('@/services/invoiceService');
        try {
          await unmarkInvoiceAsPaid(invoice.id);
          toast.success("Invoice unmarked as paid and moved back to payable.");
          onInvoiceUpdated?.({ ...invoice, status: 'READY', paid_date: null, amount_paid: null });
          onOpenChange(false);
        } catch (error: any) {
          toast.error(error.message || "Failed to unmark invoice as paid");
        }
      }}
    >
      Unmark as Paid
    </Button>
  </div>
)}
```

**Imports needed:** `Button` from `@/components/ui/button` (already used via XeroSection but needs direct import).

### 2. Mobile - MobilePaidInvoiceViewer.tsx

Add an "Unmark as Paid" button below the existing action buttons row (after the Edit button, around line 270), visible only for PAID or PARTIALLY_PAID invoices.

```tsx
{(invoice.status === 'PAID' || invoice.status === 'PARTIALLY_PAID') && (
  <div className="mx-2 mt-2">
    <Button
      variant="outline"
      className="w-full h-11 text-destructive border-destructive/30 hover:bg-destructive/10"
      onClick={async () => {
        const { unmarkInvoiceAsPaid } = await import('@/services/invoiceService');
        try {
          await unmarkInvoiceAsPaid(invoice.id);
          toast.success("Invoice unmarked as paid and moved back to payable.");
          onUpdate({ ...invoice, status: 'READY', paid_date: null, amount_paid: null });
          onBack();
        } catch (error: any) {
          toast.error(error.message || "Failed to unmark invoice as paid");
        }
      }}
    >
      Unmark as Paid
    </Button>
  </div>
)}
```

---

## Files to Modify

| File | Changes |
|------|--------|
| `src/components/paid/PaidInvoiceViewer.tsx` | Add "Unmark as Paid" button below RemittanceSection, add Button import |
| `src/components/mobile/MobilePaidInvoiceViewer.tsx` | Add "Unmark as Paid" button below action buttons row |

---

## Behavior

- Button uses the existing `unmarkInvoiceAsPaid()` from `invoiceService.ts` (same function used on the Payable page)
- Resets invoice status to "READY" and clears payment fields
- Creates an audit log entry automatically
- On desktop: closes the viewer dialog after unmarking
- On mobile: navigates back to the list after unmarking
- Button styled with red outline to indicate a destructive/reversal action
- Only visible for invoices with status PAID or PARTIALLY_PAID
