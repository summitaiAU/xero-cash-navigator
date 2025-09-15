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
      Status: "DRAFT",
      Reference: "REF-001",
      SubTotal: 2205.00,
      TotalTax: 245.00,
      Total: 2450.00,
      LineItems: [
        {
          Description: "Office Supplies",
          UnitAmount: 2205.00,
          TaxAmount: 245.00,
          AccountCode: "200",
          Quantity: 1,
          LineAmount: 2205.00,
          TaxType: "INPUT"
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
      Status: "DRAFT",
      Reference: "MKT-002",
      SubTotal: 2909.09,
      TotalTax: 290.91,
      Total: 3200.00,
      LineItems: [
        {
          Description: "Digital Marketing Campaign",
          UnitAmount: 2000.00,
          TaxAmount: 200.00,
          AccountCode: "300",
          Quantity: 1,
          LineAmount: 2000.00,
          TaxType: "INPUT"
        },
        {
          Description: "Social Media Management",
          UnitAmount: 909.09,
          TaxAmount: 90.91,
          AccountCode: "300",
          Quantity: 1,
          LineAmount: 909.09,
          TaxType: "INPUT"
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
      Status: "DRAFT",
      Reference: "LEGAL-003",
      SubTotal: 1636.36,
      TotalTax: 163.64,
      Total: 1800.00,
      LineItems: [
        {
          Description: "Legal Consultation Services",
          UnitAmount: 1636.36,
          TaxAmount: 163.64,
          AccountCode: "400",
          Quantity: 1,
          LineAmount: 1636.36,
          TaxType: "INPUT"
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