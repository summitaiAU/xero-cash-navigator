import * as XLSX from 'xlsx';
import { Invoice } from '@/types/invoice';
import { formatDateSydney } from '@/lib/dateUtils';

export interface ExportColumn {
  key: string;
  label: string;
  enabled: boolean;
  format?: (value: any, invoice: Invoice) => string;
}

export const DEFAULT_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'invoice_no', label: 'Invoice Number', enabled: true },
  { key: 'status', label: 'Status', enabled: true },
  { key: 'supplier_name', label: 'Supplier', enabled: true },
  { key: 'entity', label: 'Entity', enabled: true },
  { 
    key: 'invoice_date', 
    label: 'Invoice Date', 
    enabled: true,
    format: (value) => value ? formatDateSydney(value) : ''
  },
  { 
    key: 'due_date', 
    label: 'Due Date', 
    enabled: true,
    format: (value) => value ? formatDateSydney(value) : ''
  },
  { 
    key: 'paid_date', 
    label: 'Date Paid', 
    enabled: true,
    format: (value) => value ? formatDateSydney(value) : ''
  },
  { 
    key: 'total_amount', 
    label: 'Total Amount', 
    enabled: true,
    format: (value) => value ? `$${Number(value).toFixed(2)}` : '$0.00'
  },
  { 
    key: 'subtotal', 
    label: 'Subtotal', 
    enabled: false,
    format: (value) => value ? `$${Number(value).toFixed(2)}` : '$0.00'
  },
  { 
    key: 'gst', 
    label: 'GST', 
    enabled: false,
    format: (value) => value ? `$${Number(value).toFixed(2)}` : '$0.00'
  },
  { 
    key: 'amount_due', 
    label: 'Amount Due', 
    enabled: false,
    format: (value) => value ? `$${Number(value).toFixed(2)}` : '$0.00'
  },
  { 
    key: 'amount_paid', 
    label: 'Amount Paid', 
    enabled: false,
    format: (value) => value ? `$${Number(value).toFixed(2)}` : '$0.00'
  },
  { key: 'currency', label: 'Currency', enabled: false },
  { key: 'project', label: 'Project', enabled: false },
  { key: 'remittance_email', label: 'Remittance Email', enabled: false },
  { key: 'sender_email', label: 'Sender Email', enabled: false },
  { key: 'supplier_abn', label: 'Supplier ABN', enabled: false },
];

/**
 * Export invoices to CSV format
 */
export function exportToCSV(invoices: Invoice[], columns: ExportColumn[], filename: string = 'paid-invoices.csv') {
  const enabledColumns = columns.filter(col => col.enabled);
  
  // Create CSV header
  const headers = enabledColumns.map(col => col.label);
  
  // Create CSV rows
  const rows = invoices.map(invoice => {
    return enabledColumns.map(col => {
      const value = invoice[col.key as keyof Invoice];
      const formatted = col.format ? col.format(value, invoice) : value;
      
      // Escape CSV values
      const stringValue = String(formatted ?? '');
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
  });
  
  // Combine into CSV string
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  // Download
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export invoices to Excel format
 */
export function exportToExcel(invoices: Invoice[], columns: ExportColumn[], filename: string = 'paid-invoices.xlsx') {
  const enabledColumns = columns.filter(col => col.enabled);
  
  // Create worksheet data
  const headers = enabledColumns.map(col => col.label);
  const data = invoices.map(invoice => {
    return enabledColumns.map(col => {
      const value = invoice[col.key as keyof Invoice];
      
      // For Excel, we want to preserve numbers as numbers
      if (col.key === 'total_amount' || col.key === 'subtotal' || col.key === 'gst' || 
          col.key === 'amount_due' || col.key === 'amount_paid') {
        return value ? Number(value) : 0;
      }
      
      // For dates, convert to Date objects
      if (col.key === 'invoice_date' || col.key === 'due_date' || col.key === 'paid_date') {
        return value ? new Date(value as string) : '';
      }
      
      return value ?? '';
    });
  });
  
  // Create workbook
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  
  // Set column widths
  const colWidths = enabledColumns.map((col, idx) => {
    const maxLength = Math.max(
      col.label.length,
      ...data.map(row => String(row[idx] ?? '').length)
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  worksheet['!cols'] = colWidths;
  
  // Format date columns
  const dateColumns = enabledColumns
    .map((col, idx) => ({ col, idx }))
    .filter(({ col }) => col.key === 'invoice_date' || col.key === 'due_date' || col.key === 'paid_date')
    .map(({ idx }) => idx);
  
  // Apply date format to date columns
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    dateColumns.forEach(C => {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].t = 'd';
        worksheet[cellAddress].z = 'dd/mm/yyyy';
      }
    });
  }
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Paid Invoices');
  
  // Generate and download
  XLSX.writeFile(workbook, filename);
}

/**
 * Helper function to download a file
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Generate filename with date range
 */
export function generateFilename(format: 'csv' | 'xlsx', dateRange?: { from?: string; to?: string }): string {
  const timestamp = new Date().toISOString().split('T')[0];
  let name = 'paid-invoices';
  
  if (dateRange?.from && dateRange?.to) {
    const from = new Date(dateRange.from).toISOString().split('T')[0];
    const to = new Date(dateRange.to).toISOString().split('T')[0];
    name += `_${from}_to_${to}`;
  } else if (dateRange?.from) {
    const from = new Date(dateRange.from).toISOString().split('T')[0];
    name += `_from_${from}`;
  } else if (dateRange?.to) {
    const to = new Date(dateRange.to).toISOString().split('T')[0];
    name += `_until_${to}`;
  } else {
    name += `_${timestamp}`;
  }
  
  return `${name}.${format}`;
}
