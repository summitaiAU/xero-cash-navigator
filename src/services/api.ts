const API_BASE = 'https://your-n8n-instance.com/webhook';
const API_SECRET = 'your-webhook-secret';

const apiCall = async (endpoint: string, data: any) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': API_SECRET
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }
  
  return response.json();
};

export const invoiceService = {
  getNext: (currentId?: string) => apiCall('/get-next-invoice', { current_invoice_id: currentId }),
  getXeroData: (xeroId: string) => apiCall('/get-xero-invoice', { xero_bill_id: xeroId }),
  updateXero: (xeroId: string, updates: any) => apiCall('/update-xero-invoice', { xero_bill_id: xeroId, updates }),
  approveXero: (xeroId: string, invoiceId: string) => apiCall('/approve-xero-invoice', { xero_bill_id: xeroId, invoice_id: invoiceId }),
  uploadPaymentProof: (invoiceId: string, imageBase64: string) => apiCall('/upload-payment-proof', { 
    invoice_id: invoiceId, 
    image_base64: imageBase64,
    file_name: `payment-${invoiceId}.png`
  }),
  markAsPaid: (data: any) => apiCall('/mark-invoice-paid', data),
  complete: (invoiceId: string, actions: string[]) => apiCall('/complete-invoice', { invoice_id: invoiceId, actions_taken: actions })
};