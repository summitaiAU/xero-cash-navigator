import { Invoice } from '@/types/invoice';

export const mockInvoices: Invoice[] = [
  {
    id: "inv-001",
    invoice_number: "INV-2024-001",
    supplier: "Tech Solutions Ltd",
    amount: 2450.00,
    due_date: "2024-01-15",
    status: "READY",
    xero_bill_id: "abc-123-def",
    drive_embed_url: "https://drive.google.com/file/d/1CqfgOa-cpTA8WNvUUToKfpKEuOigNsym/preview",
    drive_view_url: "https://drive.google.com/file/d/1CqfgOa-cpTA8WNvUUToKfpKEuOigNsym/view",
    supplier_email: "accounts@techsolutions.com",
    xero_data: {
      invoiceNumber: "INV-2024-001",
      contactName: "Tech Solutions Ltd",
      issueDate: "15/12/2023",
      dueDate: "15/01/2024",
      reference: "REF-001",
      currency: "AUD",
      status: "DRAFT",
      bsb: "062 268",
      accountNumber: "1051 7708",
      lineItems: [
        {
          itemNumber: 1,
          description: "Office Supplies",
          quantity: 1,
          unitAmount: 2205.00,
          account: "200 - Expenses",
          taxRate: "GST (10%)",
          amount: 2205.00
        }
      ],
      subtotal: 2205.00,
      totalTax: 245.00,
      total: 2450.00
    }
  },
  {
    id: "inv-002",
    invoice_number: "INV-2024-002",
    supplier: "Marketing Agency Pro",
    amount: 3200.00,
    due_date: "2024-01-20",
    status: "REVIEW",
    xero_bill_id: "def-456-ghi",
    drive_embed_url: "https://drive.google.com/file/d/1CqfgOa-cpTA8WNvUUToKfpKEuOigNsym/preview",
    drive_view_url: "https://drive.google.com/file/d/1CqfgOa-cpTA8WNvUUToKfpKEuOigNsym/view",
    supplier_email: "billing@marketingpro.com",
    xero_data: {
      invoiceNumber: "INV-2024-002",
      contactName: "Marketing Agency Pro",
      issueDate: "20/12/2023",
      dueDate: "20/01/2024",
      reference: "MKT-002",
      currency: "AUD",
      status: "DRAFT",
      bsb: "062 596",
      accountNumber: "1030 2535",
      lineItems: [
        {
          itemNumber: 1,
          description: "Digital Marketing Campaign",
          quantity: 1,
          unitAmount: 2000.00,
          account: "300 - Expenses",
          taxRate: "GST (10%)",
          amount: 2000.00
        },
        {
          itemNumber: 2,
          description: "Social Media Management",
          quantity: 1,
          unitAmount: 909.09,
          account: "300 - Expenses",
          taxRate: "GST (10%)",
          amount: 909.09
        }
      ],
      subtotal: 2909.09,
      totalTax: 290.91,
      total: 3200.00
    }
  },
  {
    id: "inv-003",
    invoice_number: "INV-2024-003",
    supplier: "Legal Consultants Inc",
    amount: 1800.00,
    due_date: "2024-01-25",
    status: "NEW SUPPLIER",
    xero_bill_id: "ghi-789-jkl",
    drive_embed_url: "https://drive.google.com/file/d/1CqfgOa-cpTA8WNvUUToKfpKEuOigNsym/preview",
    drive_view_url: "https://drive.google.com/file/d/1CqfgOa-cpTA8WNvUUToKfpKEuOigNsym/view",
    supplier_email: "invoices@legalconsultants.com",
    xero_data: {
      invoiceNumber: "INV-2024-003",
      contactName: "Legal Consultants Inc",
      issueDate: "25/12/2023",
      dueDate: "25/01/2024",
      reference: "LEGAL-003",
      currency: "AUD",
      status: "DRAFT",
      bsb: "062 268",
      accountNumber: "1051 7708",
      lineItems: [
        {
          itemNumber: 1,
          description: "Legal Consultation Services",
          quantity: 1,
          unitAmount: 1636.36,
          account: "400 - Expenses",
          taxRate: "GST (10%)",
          amount: 1636.36
        }
      ],
      subtotal: 1636.36,
      totalTax: 163.64,
      total: 1800.00
    }
  }
];

export const accountOptions = [
  { value: "200", label: "200 - Office Supplies" },
  { value: "300", label: "300 - Marketing" },
  { value: "400", label: "400 - Professional Fees" },
  { value: "500", label: "500 - Utilities" },
  { value: "600", label: "600 - Rent" }
];

export const taxRateOptions = [
  { value: 0, label: "0%" },
  { value: 10, label: "10%" },
  { value: 15, label: "15%" }
];

export const paymentMethodOptions = [
  "Bank Transfer",
  "Wise",
  "Credit Card",
  "Other"
] as const;