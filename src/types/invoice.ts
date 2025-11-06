// Exact webhook response structure
export interface XeroWebhookLineItem {
  Description: string;
  UnitAmount: number;
  TaxType: string;
  TaxAmount: number;
  LineAmount: number;
  AccountCode: string;
  Quantity: number;
}

export interface XeroWebhookInvoice {
  Type: string;
  InvoiceID: string;
  InvoiceNumber: string;
  Reference: string;
  AmountDue: number;
  AmountPaid: number;
  Contact: {
    Name: string;
    EmailAddress?: string;
    TaxNumber?: string;
    BankAccountDetails?: string;
    BatchPayments?: {
      BankAccountNumber?: string;
    };
  };
  DateString: string;
  DueDateString: string;
  Status: 'DRAFT' | 'AWAITING_PAYMENT' | 'PAID' | 'AUTHORISED';
  LineItems: XeroWebhookLineItem[];
  SubTotal: number;
  TotalTax: number;
  Total: number;
  CurrencyCode: string;
}

// Processed data structure for display
export interface ProcessedXeroData {
  invoiceNumber: string;
  contactName: string;
  issueDate: string;
  dueDate: string;
  reference: string;
  currency: string;
  status: string;
  bsb: string;
  accountNumber: string;
  lineItems: {
    itemNumber: number;
    description: string;
    quantity: number;
    unitAmount: number;
    account: string;
    taxRate: string;
    amount: number;
    gstIncluded?: boolean;
    lineGst?: number;
    lineTotalExGst?: number;
    lineTotalIncGst?: number;
  }[];
  subtotal: number;
  totalTax: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  supplier: string;
  amount: number;
  due_date: string;
  status: 'READY' | 'FLAGGED' | 'PAID' | 'APPROVED' | 'PARTIALLY PAID' | 'DELETED';
  xero_bill_id: string;
  drive_embed_url: string;
  drive_view_url: string;
  supplier_email: string;
  remittance_email?: string;
  supplier_email_on_invoice?: string;
  sender_email?: string;
  remittance_sent?: boolean;
  project?: string;
  approved?: boolean;
  partially_paid?: boolean;
  saved_emails?: string[]; // Array of user-added emails
  xero_data: ProcessedXeroData;
  
  // Additional Supabase fields for editing
  entity?: string;
  supplier_name?: string;
  invoice_no?: string;
  list_items?: any[];
  subtotal?: number;
  gst?: number;
  total_amount?: number;
  amount_due?: number;
  amount_paid?: number;
  invoice_date?: string;
  currency?: string;
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