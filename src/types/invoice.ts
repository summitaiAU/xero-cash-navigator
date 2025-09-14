export interface LineItem {
  description: string;
  amount: number;
  tax_amount: number;
  account_code: string;
}

export interface XeroData {
  status: 'DRAFT' | 'AWAITING_PAYMENT' | 'PAID';
  reference: string;
  account_code: string;
  tax_rate: number;
  subtotal: number;
  tax: number;
  total: number;
  line_items: LineItem[];
}

export interface Invoice {
  id: string;
  invoice_number: string;
  supplier: string;
  amount: number;
  due_date: string;
  status: 'SENT_TO_XERO' | 'XERO_DRAFT' | 'AWAITING_PAYMENT' | 'PAID';
  xero_bill_id: string;
  drive_embed_url: string;
  drive_view_url: string;
  supplier_email: string;
  xero_data: XeroData;
}

export interface ProcessingStatus {
  xeroSynced: boolean;
  paymentUploaded: boolean;
  remittanceSent: boolean;
}

export interface PaymentData {
  email: string;
  message: string;
  payment_method: 'Bank Transfer' | 'Wise' | 'Credit Card' | 'Other';
  image_base64?: string;
}