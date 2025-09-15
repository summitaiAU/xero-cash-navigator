export interface XeroLineItem {
  Description: string;
  UnitAmount: number;
  TaxAmount: number;
  AccountCode: string;
  Quantity: number;
  LineAmount: number;
  TaxType: string;
  LineItemID?: string;
  AccountID?: string;
}

export interface XeroData {
  Type?: string;
  InvoiceID?: string;
  InvoiceNumber?: string;
  Reference?: string;
  Contact?: {
    Name: string;
    ContactID?: string;
    EmailAddress?: string;
  };
  Date?: string;
  DueDate?: string;
  Status: 'DRAFT' | 'AWAITING_PAYMENT' | 'PAID' | 'AUTHORISED';
  LineItems: XeroLineItem[];
  SubTotal: number;
  TotalTax: number;
  Total: number;
  CurrencyCode?: string;
  AmountDue?: number;
  AmountPaid?: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  supplier: string;
  amount: number;
  due_date: string;
  status: 'READY' | 'NEW SUPPLIER' | 'REVIEW' | 'PAID';
  xero_bill_id: string;
  drive_embed_url: string;
  drive_view_url: string;
  supplier_email: string;
  remittance_email?: string;
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