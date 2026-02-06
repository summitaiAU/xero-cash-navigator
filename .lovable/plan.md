
# Plan: Fix ManualInvoiceModal Issues

## Issues Identified

### Issue 1: GST Checkboxes Not Working Correctly
**Root Cause**: When changing GST INCL or GST EXMT, the code calls `updateLineItem` twice in sequence:
```tsx
onCheckedChange={(checked) => {
  updateLineItem(index, "gst_included", !!checked);
  if (checked) updateLineItem(index, "gst_exempt", false);
}}
```

The problem is that the second `updateLineItem` call reads stale state from `draftInvoice.list_items` because React hasn't re-rendered yet. Both calls use `[...draftInvoice.list_items]` which refers to the same original array.

**Solution**: Modify `updateLineItem` to handle both fields atomically in a single update, OR use a callback pattern that passes both field values at once.

### Issue 2: Unit Price Field Can't Be Cleared
**Root Cause**: The current handler:
```tsx
onChange={(e) => updateLineItem(index, "unit_price", parseFloat(e.target.value) || 0)}
```

When user backspaces to empty, `parseFloat("")` returns `NaN`, so `|| 0` kicks in and immediately sets value back to 0.

**Solution**: Allow empty string in the input, only convert to 0 when saving or calculating. Use controlled input that preserves the raw string value.

### Issue 3: Missing "total" Field in Line Items
**Root Cause**: `XeroSection.tsx` saves line items with a `total` field (line 597):
```tsx
return {
  ...
  total: lineAmount,  // <-- ManualInvoiceModal doesn't have this
  ...
}
```

But `ManualInvoiceModal` and `AddInvoiceWorkspace` don't include this field in their `calculateLineItem` function or saved data.

**Solution**: Add `total` field to the `LineItem` interface and `calculateLineItem` function.

---

## Technical Changes

### 1. Fix GST Checkbox Logic (ManualInvoiceModal.tsx)

**Current problematic code (lines 707-727):**
```tsx
<Checkbox
  checked={item.gst_included}
  onCheckedChange={(checked) => {
    updateLineItem(index, "gst_included", !!checked);
    if (checked) updateLineItem(index, "gst_exempt", false);
  }}
/>
```

**New approach - create a dedicated handler that updates both fields atomically:**
```tsx
const updateLineItemGst = (index: number, field: 'gst_included' | 'gst_exempt', value: boolean) => {
  const items = [...draftInvoice.list_items];
  const item = { ...items[index] };
  
  if (field === 'gst_included') {
    item.gst_included = value;
    if (value) item.gst_exempt = false; // Mutually exclusive
  } else if (field === 'gst_exempt') {
    item.gst_exempt = value;
    if (value) item.gst_included = false; // Mutually exclusive
  }
  
  items[index] = calculateLineItem(item);
  setDraftInvoice({ ...draftInvoice, list_items: items });
};
```

**Updated checkbox usage:**
```tsx
<Checkbox
  checked={item.gst_included}
  onCheckedChange={(checked) => updateLineItemGst(index, 'gst_included', !!checked)}
/>
// ...
<Checkbox
  checked={item.gst_exempt}
  onCheckedChange={(checked) => updateLineItemGst(index, 'gst_exempt', !!checked)}
/>
```

### 2. Fix Unit Price Field Input (ManualInvoiceModal.tsx)

**Current problematic code:**
```tsx
<Input
  type="number"
  value={item.unit_price}
  onChange={(e) => updateLineItem(index, "unit_price", parseFloat(e.target.value) || 0)}
/>
```

**Solution - allow empty input and handle parsing in updateLineItem:**
```tsx
<Input
  type="number"
  step="0.01"
  value={item.unit_price === 0 ? '' : item.unit_price}
  onChange={(e) => {
    const val = e.target.value;
    updateLineItem(index, "unit_price", val === '' ? 0 : parseFloat(val) || 0);
  }}
  onBlur={(e) => {
    // Ensure a valid number on blur
    if (e.target.value === '') {
      updateLineItem(index, "unit_price", 0);
    }
  }}
/>
```

**Alternative cleaner approach** - use a raw string state for active editing:
Since the field is `type="number"`, the browser already allows backspacing. The issue is the React state immediately converting empty to 0. Instead, don't force 0 when empty:

```tsx
onChange={(e) => {
  const rawValue = e.target.value;
  // Allow empty string during editing, parseFloat will handle it
  const numValue = rawValue === '' ? 0 : parseFloat(rawValue);
  if (!isNaN(numValue)) {
    updateLineItem(index, "unit_price", numValue);
  }
}}
```

But we also need the input to show empty when the value is 0 to allow typing fresh:
```tsx
value={item.unit_price || ''}
```

### 3. Add "total" Field to LineItem (ManualInvoiceModal.tsx)

**Update LineItem interface (around line 49):**
```tsx
interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  gst_included: boolean;
  gst_exempt: boolean;
  account_code: string;
  line_total_ex_gst: number;
  line_gst: number;
  line_total_inc_gst: number;
  total: number; // ADD THIS - matches XeroSection format
}
```

**Update calculateLineItem function (around line 92):**
```tsx
const calculateLineItem = (item: Partial<LineItem>): LineItem => {
  const quantity = item.quantity || 0;
  const unitPrice = item.unit_price || 0;
  // ... existing GST calculation logic ...
  
  const total = quantity * unitPrice; // Base line amount before GST adjustments
  
  return {
    id: item.id || genLineItemId(),
    description: item.description || "",
    quantity,
    unit_price: unitPrice,
    gst_included: gstIncluded,
    gst_exempt: gstExempt,
    account_code: item.account_code || "",
    total, // ADD THIS
    line_total_ex_gst: Math.round(line_total_ex_gst * 100) / 100,
    line_gst: Math.round(line_gst * 100) / 100,
    line_total_inc_gst: Math.round(line_total_inc_gst * 100) / 100,
  };
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ManualInvoiceModal.tsx` | 1. Add `total` to LineItem interface<br>2. Add `total` to calculateLineItem return<br>3. Add `updateLineItemGst` function for atomic GST updates<br>4. Update checkbox handlers to use new function<br>5. Fix unit_price input to allow empty values |

---

## Summary of Changes

1. **GST Checkboxes**: Create atomic update function that handles mutual exclusivity in a single state update
2. **Unit Price Input**: Allow empty string display when value is 0, parse correctly on change
3. **Line Item Total**: Add `total` field matching XeroSection's format for consistency

These fixes ensure the manual invoice entry modal behaves identically to other invoice editing sections in the application.
