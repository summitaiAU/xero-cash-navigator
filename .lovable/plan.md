
# Plan: Improve Webhook Response Handling in ManualInvoiceModal

## Current Behavior

The current implementation (lines 445-464) has these issues:

1. **No timeout**: Uses browser default (could hang indefinitely)
2. **No response status checking**: Doesn't check `response.ok` or specific status codes
3. **Silent failure**: Webhook errors are caught but swallowed with just a console log
4. **Immediate success notification**: Toast shows right after Supabase save, before confirming webhook success

## Proposed Solution

Match the robust pattern from `AddInvoiceButton.tsx`:
- Add 5-minute timeout using `AbortSignal.timeout(300000)`
- Check response status codes (200, 415, 406, 409, etc.)
- Show appropriate error messages based on webhook response
- Only show success toast after both Supabase save AND webhook succeed

---

## Technical Changes

### File: `src/components/ManualInvoiceModal.tsx`

**Current Code (lines 441-464):**
```tsx
// Trigger webhook with file data
const base64Data = fileData!.split(',')[1];
const contentType = fileData!.split(',')[0].split(':')[1].split(';')[0];

try {
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
} catch (webhookError) {
  console.error("Webhook error:", webhookError);
  // Don't fail the save if webhook fails
}

toast({
  title: "Invoice Saved",
  description: "Invoice has been created successfully.",
});
```

**New Code:**
```tsx
// Trigger webhook with file data
const base64Data = fileData!.split(',')[1];
const contentType = fileData!.split(',')[0].split(':')[1].split(';')[0];

console.log('Sending to webhook with 5-minute timeout...');

const response = await fetch(
  'https://sodhipg.app.n8n.cloud/webhook/d142073d-c96d-4386-b029-e9e26c145e85',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: invoiceId,
      file_name: fileName,
      file_data: base64Data,
      content_type: contentType,
    }),
    signal: AbortSignal.timeout(300000) // 5 minute timeout
  }
);

console.log('Webhook response status:', response.status);

// Handle success (200)
if (response.status === 200) {
  toast({
    title: "Invoice Saved",
    description: "Invoice has been created and file uploaded successfully.",
  });
  onClose();
  onSuccess?.();
  return;
}

// Handle OCR issues (415)
if (response.status === 415) {
  toast({
    title: "OCR Issue",
    description: "Invoice saved, but there was an issue processing the document. Please check the invoice format.",
    variant: "destructive",
  });
  onClose();
  onSuccess?.();
  return;
}

// Handle validation fails (406)
if (response.status === 406) {
  toast({
    title: "Validation Issue",
    description: "Invoice saved, but document validation failed. Please verify the file.",
    variant: "destructive",
  });
  onClose();
  onSuccess?.();
  return;
}

// Handle any other non-success status
throw new Error(`Webhook returned status ${response.status}`);
```

**Updated Catch Block:**
```tsx
} catch (error: any) {
  console.error("Save failed:", error);
  
  // Check if it's a timeout or network error
  const isTimeout = error instanceof Error && error.name === 'TimeoutError';
  const isNetworkError = error instanceof TypeError && error.message === 'Load failed';
  
  toast({
    title: isTimeout ? "Upload Timeout" : isNetworkError ? "Network Error" : "Save Failed",
    description: isTimeout 
      ? "Processing took too long. The invoice was saved but file upload may have failed."
      : isNetworkError
      ? "Could not connect to the server. Please check your network connection."
      : error.message || "An unexpected error occurred.",
    variant: "destructive",
  });
} finally {
  setSaving(false);
}
```

---

## Response Handling Summary

| Status Code | Meaning | User Message | Action |
|-------------|---------|--------------|--------|
| 200 | Success | "Invoice saved and file uploaded successfully" | Close modal, trigger onSuccess |
| 415 | OCR Issue | "Invoice saved, but document processing issue" | Close modal, trigger onSuccess (invoice still saved) |
| 406 | Validation Failed | "Invoice saved, but validation failed" | Close modal, trigger onSuccess |
| Timeout | 5 min exceeded | "Processing took too long..." | Keep modal open (let user retry) |
| Network Error | Connection failed | "Could not connect to server" | Keep modal open |
| Other | Unknown | Error message | Keep modal open |

---

## Key Differences from AddInvoiceButton

Since `ManualInvoiceModal` saves to Supabase BEFORE calling the webhook (unlike `AddInvoiceButton` which only calls webhook):

1. The invoice is already saved in the database when webhook is called
2. Webhook failures don't lose the invoice data
3. We still close the modal and call onSuccess for non-critical webhook errors (415, 406) since the invoice exists
4. Only for network/timeout errors do we keep the modal open so user can see the issue

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ManualInvoiceModal.tsx` | Replace webhook try-catch block with full response handling and timeout |
