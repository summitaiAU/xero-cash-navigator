
# Plan: Add "Enter Invoice Manually" Feature

## Overview
Add a text button "Enter invoice manually" below the Cancel/Submit Invoice buttons in the existing AddInvoiceButton dialog. When clicked, this opens a new modal with a full invoice entry form (matching the AddInvoiceWorkspace from the Review page), with an additional file upload section at the end. Upon saving, the data is stored in Supabase and a webhook is triggered with the file data and new invoice ID.

---

## Technical Details

### 1. Modify AddInvoiceButton.tsx
Add a new state and text button below the action buttons:

**New State:**
```tsx
const [manualEntryOpen, setManualEntryOpen] = useState(false);
```

**Add Button (after line 366, inside the space-y-4 div):**
```tsx
{/* Enter Manually Option */}
<div className="text-center">
  <button
    type="button"
    onClick={() => {
      setOpen(false); // Close current dialog
      setManualEntryOpen(true); // Open manual entry modal
    }}
    className="text-sm text-muted-foreground hover:text-primary underline transition-colors"
  >
    Enter invoice manually
  </button>
</div>
```

**Add Manual Entry Modal after the Dialog:**
```tsx
<ManualInvoiceModal
  open={manualEntryOpen}
  onClose={() => setManualEntryOpen(false)}
  onSuccess={onSuccess}
/>
```

---

### 2. Create New ManualInvoiceModal.tsx Component

**Location:** `src/components/ManualInvoiceModal.tsx`

**Core Structure:**
- Full-screen modal (similar to AddInvoiceWorkspace)
- Same form fields as AddInvoiceWorkspace
- File upload section at the bottom (accepts PDF/JPEG only)
- Save triggers Supabase insert + webhook

**Form Fields (matching AddInvoiceWorkspace exactly):**

| Section | Field | Type | Required | Notes |
|---------|-------|------|----------|-------|
| Supplier & Entity | supplier_name | Text Input | Yes | Free text |
| | entity | Text Input | Yes | Free text |
| | project | Text Input | No | Optional |
| Invoice Details | invoice_no | Text Input | Yes | Duplicate check |
| | invoice_date | Date Input | Yes | Format: YYYY-MM-DD |
| | due_date | Date Input | No | Optional |
| | currency | Select | Yes | AUD/USD only |
| Line Items | description | Text Input | Yes | Per line |
| | quantity | Number Input | No | Default 1 |
| | unit_price | Number Input | No | Default 0 |
| | gst_included | Checkbox | No | Default checked |
| | gst_exempt | Checkbox | No | Default unchecked |
| Amounts | subtotal | Read-only | N/A | Calculated from lines |
| | gst | Read-only | N/A | Calculated from lines |
| | total_amount | Read-only | N/A | Calculated from lines |
| Additional Info | payment_ref | Text Input | No | Optional |
| | supplier_email_on_invoice | Email Input | No | Optional |
| | supplier_abn | Text Input | No | Optional |
| **File Upload** | file | File Input | Yes | PDF or JPEG only |

**Line Item Actions:**
- "Add Line" button - adds new line item
- "GST Exempt All" toggle - marks all lines as GST exempt
- Trash icon - removes line item (disabled if only 1 line)

**GST Calculation Logic (same as AddInvoiceWorkspace):**
```tsx
const calculateLineItem = (item: Partial<LineItem>): LineItem => {
  const quantity = item.quantity || 0;
  const unitPrice = item.unit_price || 0;
  const gstIncluded = item.gst_included ?? true;
  const gstExempt = item.gst_exempt ?? false;

  let line_total_inc_gst = quantity * unitPrice;
  let line_gst = 0;
  let line_total_ex_gst = 0;

  // Priority 1: GST Exempt (no GST)
  if (gstExempt) {
    line_gst = 0;
    line_total_ex_gst = line_total_inc_gst;
  }
  // Priority 2: GST Included (extract 1/11th)
  else if (gstIncluded) {
    line_gst = line_total_inc_gst / 11;
    line_total_ex_gst = line_total_inc_gst - line_gst;
  }
  // Priority 3: GST Not Included (add 10%)
  else {
    line_total_ex_gst = line_total_inc_gst;
    line_gst = line_total_ex_gst * 0.1;
    line_total_inc_gst = line_total_ex_gst + line_gst;
  }

  return {
    id: item.id || genLineItemId(),
    description: item.description || "",
    quantity,
    unit_price: unitPrice,
    gst_included: gstIncluded,
    gst_exempt: gstExempt,
    account_code: item.account_code || "",
    line_total_ex_gst: Math.round(line_total_ex_gst * 100) / 100,
    line_gst: Math.round(line_gst * 100) / 100,
    line_total_inc_gst: Math.round(line_total_inc_gst * 100) / 100,
  };
};
```

**Calculated Amounts (using useMemo):**
```tsx
const calculatedAmounts = useMemo(() => {
  if (!draftInvoice) return { subtotal: 0, gst: 0, total: 0 };

  const subtotal = draftInvoice.list_items.reduce((sum, item) => sum + item.line_total_ex_gst, 0);
  const gst = draftInvoice.list_items.reduce((sum, item) => sum + item.line_gst, 0);
  const total = draftInvoice.list_items.reduce((sum, item) => sum + item.line_total_inc_gst, 0);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}, [draftInvoice?.list_items]);
```

---

### 3. File Upload Section

**UI Design:**
```tsx
<div className="space-y-4">
  <h3 className="text-sm font-semibold border-b pb-2">Invoice Document *</h3>
  <div 
    className={`upload-area ${dragOver ? 'dragover' : ''} ${fileData ? 'border-success' : ''}`}
    onDrop={handleDrop}
    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
    onDragLeave={() => setDragOver(false)}
    onClick={() => !fileData && fileInputRef.current?.click()}
  >
    {/* Similar to AddInvoiceButton upload UI */}
    {!fileData ? (
      <div className="space-y-4 text-center p-6">
        <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
        <div>
          <p className="text-sm font-medium">Drop PDF or JPEG here</p>
          <p className="text-xs text-muted-foreground">or click to browse</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/jpg"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    ) : (
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {/* File preview icon */}
          <span className="text-sm font-medium">{fileName}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={clearFile}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )}
  </div>
  {validationErrors.file && (
    <p className="text-xs text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {validationErrors.file}
    </p>
  )}
</div>
```

**File Validation:**
```tsx
const handleFile = (file: File) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
  
  if (!allowedTypes.includes(file.type)) {
    setValidationErrors(prev => ({
      ...prev,
      file: "Only PDF and JPEG files are allowed"
    }));
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    setFileData(event.target?.result as string);
    setFileName(file.name);
    setFileContentType(file.type);
  };
  reader.readAsDataURL(file);
};
```

---

### 4. Save Logic

**Validation Steps:**
1. Check all required fields (supplier_name, entity, invoice_no, invoice_date, currency, file)
2. Validate line items (description required, quantity/price >= 0)
3. Check for duplicate invoice_no in database

**Save Workflow:**
```tsx
const handleSave = async () => {
  // 1. Validate form
  if (!validateForm()) {
    toast({ title: "Validation Error", description: "Please fix errors", variant: "destructive" });
    return;
  }

  // 2. Check file is attached
  if (!fileData) {
    setValidationErrors(prev => ({ ...prev, file: "Please upload an invoice document" }));
    return;
  }

  setSaving(true);

  try {
    // 3. Check duplicate invoice number
    const isDuplicate = await checkDuplicate(draftInvoice.invoice_no);
    if (isDuplicate) {
      setSaving(false);
      return;
    }

    // 4. Insert to Supabase
    const insertPayload = {
      supplier_name: draftInvoice.supplier_name?.trim(),
      entity: draftInvoice.entity?.trim(),
      project: draftInvoice.project?.trim() || null,
      invoice_no: draftInvoice.invoice_no?.trim(),
      invoice_date: draftInvoice.invoice_date || null,
      due_date: draftInvoice.due_date || null,
      currency: draftInvoice.currency || "AUD",
      subtotal: calculatedAmounts.subtotal,
      gst: calculatedAmounts.gst,
      total_amount: calculatedAmounts.total,
      payment_ref: draftInvoice.payment_ref?.trim() || null,
      supplier_email_on_invoice: draftInvoice.supplier_email_on_invoice?.trim() || null,
      supplier_abn: draftInvoice.supplier_abn?.trim() || null,
      list_items: draftInvoice.list_items as any,
      status: "READY",
    };

    const { data, error } = await supabase
      .from("invoices")
      .insert([insertPayload])
      .select("id")
      .single();

    if (error) throw error;

    const invoiceId = data.id;

    // 5. Trigger webhook with file data
    const base64Data = fileData.split(',')[1];
    const contentType = fileData.split(',')[0].split(':')[1].split(';')[0];

    await fetch('https://sodhipg.app.n8n.cloud/webhook/d142073d-c96d-4386-b029-e9e26c145e85', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: invoiceId,
        file_name: fileName,
        file_data: base64Data,
        content_type: contentType,
      }),
    });

    toast({ title: "Invoice Saved", description: "Invoice has been created successfully." });
    onClose();
    onSuccess?.();

  } catch (error: any) {
    toast({ title: "Save Failed", description: error.message, variant: "destructive" });
  } finally {
    setSaving(false);
  }
};
```

---

### 5. Webhook Payload Structure

**URL:** `https://sodhipg.app.n8n.cloud/webhook/d142073d-c96d-4386-b029-e9e26c145e85`

**Method:** POST

**Body:**
```json
{
  "id": "uuid-of-new-invoice-row",
  "file_name": "invoice.pdf",
  "file_data": "base64-encoded-file-content",
  "content_type": "application/pdf"
}
```

---

### 6. Data Storage Format

**Invoices Table Insert:**
- Same structure as AddInvoiceWorkspace saves
- `status` set to "READY"
- `list_items` stored as JSONB array with the new format:
  ```json
  [
    {
      "id": "unique-line-id",
      "description": "Item description",
      "quantity": 1,
      "unit_price": 100.00,
      "gst_included": true,
      "gst_exempt": false,
      "account_code": "",
      "line_total_ex_gst": 90.91,
      "line_gst": 9.09,
      "line_total_inc_gst": 100.00
    }
  ]
  ```

---

### 7. Unsaved Changes Tracking

Same pattern as AddInvoiceWorkspace:
```tsx
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const [showCloseConfirm, setShowCloseConfirm] = useState(false);
const [initialDraft, setInitialDraft] = useState<string>("");

// Track changes
useEffect(() => {
  if (draftInvoice && initialDraft) {
    const currentDraft = JSON.stringify(draftInvoice);
    setHasUnsavedChanges(currentDraft !== initialDraft || !!fileData);
  }
}, [draftInvoice, initialDraft, fileData]);

// Show confirmation dialog on close attempt
const handleCloseAttempt = () => {
  if (hasUnsavedChanges) {
    setShowCloseConfirm(true);
  } else {
    onClose();
  }
};
```

---

### 8. Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/AddInvoiceButton.tsx` | Add "Enter invoice manually" button and ManualInvoiceModal |
| `src/components/ManualInvoiceModal.tsx` | **Create new** - Full modal with form + file upload |

---

### 9. Dependencies Used

All already installed:
- `@radix-ui/react-dialog` - for modal
- `@radix-ui/react-select` - for currency dropdown
- `@radix-ui/react-checkbox` - for GST checkboxes
- `@radix-ui/react-alert-dialog` - for unsaved changes confirmation
- `lucide-react` - for icons
- `@supabase/supabase-js` - for database operations
