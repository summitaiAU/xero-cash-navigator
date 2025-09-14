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
      status: "DRAFT",
      reference: "REF-001",
      account_code: "200",
      tax_rate: 10,
      subtotal: 2205.00,
      tax: 245.00,
      total: 2450.00,
      line_items: [
        {
          description: "Office Supplies",
          amount: 2205.00,
          tax_amount: 245.00,
          account_code: "200"
        }
      ]
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
      status: "DRAFT",
      reference: "MKT-002",
      account_code: "300",
      tax_rate: 10,
      subtotal: 2909.09,
      tax: 290.91,
      total: 3200.00,
      line_items: [
        {
          description: "Digital Marketing Campaign",
          amount: 2000.00,
          tax_amount: 200.00,
          account_code: "300"
        },
        {
          description: "Social Media Management",
          amount: 909.09,
          tax_amount: 90.91,
          account_code: "300"
        }
      ]
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
      status: "DRAFT",
      reference: "LEGAL-003",
      account_code: "400",
      tax_rate: 10,
      subtotal: 1636.36,
      tax: 163.64,
      total: 1800.00,
      line_items: [
        {
          description: "Legal Consultation Services",
          amount: 1636.36,
          tax_amount: 163.64,
          account_code: "400"
        }
      ]
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