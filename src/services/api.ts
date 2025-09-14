const XERO_WEBHOOK = 'https://sodhipg.app.n8n.cloud/webhook/f31b75ff-6eda-4a72-93ea-91c541daaa4e';

const getXeroData = async (xeroInvoiceId: string) => {
  const response = await fetch(XERO_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ xero_invoice_id: xeroInvoiceId })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Xero data: ${response.statusText}`);
  }
  
  return response.json();
};

export const invoiceService = {
  getXeroData: (xeroInvoiceId: string) => getXeroData(xeroInvoiceId),
};