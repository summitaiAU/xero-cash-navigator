import { useState, useEffect, useMemo } from "react";
import { X, RefreshCw, Download, Plus, Trash2, AlertCircle } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmailAttachment } from "@/services/emailReviewService";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AddInvoiceDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedAttachment: EmailAttachment | null;
  onSaved?: (invoiceId: string) => void;
  onWebhookResult?: (ok: boolean) => void;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  gst_included: boolean;
  account_code: string;
  line_total_ex_gst: number;
  line_gst: number;
  line_total_inc_gst: number;
}

interface DraftInvoice {
  attachment_id: string;
  supplier_name: string;
  entity: string;
  project: string;
  invoice_no: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  gst: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  payment_ref: string;
  google_drive_link: string;
  sender_email: string;
  list_items: LineItem[];
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const base64urlToBase64 = (base64url: string): string => {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4;
  if (padding) {
    base64 += "=".repeat(4 - padding);
  }
  return base64;
};

const calculateLineItem = (item: Partial<LineItem>): LineItem => {
  const quantity = item.quantity || 0;
  const unitPrice = item.unit_price || 0;
  const gstIncluded = item.gst_included ?? true;

  let line_total_inc_gst = quantity * unitPrice;
  let line_gst = 0;
  let line_total_ex_gst = 0;

  if (gstIncluded) {
    // If GST included, extract GST from total (10% GST = 1/11 of total)
    line_gst = line_total_inc_gst / 11;
    line_total_ex_gst = line_total_inc_gst - line_gst;
  } else {
    // If GST not included, add GST to total (10% of ex-GST amount)
    line_total_ex_gst = line_total_inc_gst;
    line_gst = line_total_ex_gst * 0.1;
    line_total_inc_gst = line_total_ex_gst + line_gst;
  }

  return {
    id: item.id || crypto.randomUUID(),
    description: item.description || "",
    quantity,
    unit_price: unitPrice,
    gst_included: gstIncluded,
    account_code: item.account_code || "",
    line_total_ex_gst: Math.round(line_total_ex_gst * 100) / 100,
    line_gst: Math.round(line_gst * 100) / 100,
    line_total_inc_gst: Math.round(line_total_inc_gst * 100) / 100,
  };
};

interface ValidationErrors {
  [key: string]: string;
}

export const AddInvoiceDrawer = ({
  open,
  onClose,
  selectedAttachment,
  onSaved,
  onWebhookResult,
}: AddInvoiceDrawerProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftInvoice, setDraftInvoice] = useState<DraftInvoice | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Initialize draft invoice from selected attachment
  useEffect(() => {
    if (open && selectedAttachment) {
      setLoading(true);
      
      // Simulate loading time for prefill
      setTimeout(() => {
        const prefillData: DraftInvoice = {
          attachment_id: selectedAttachment.id,
          supplier_name: (selectedAttachment as any).supplier_name || "",
          entity: (selectedAttachment as any).entity || "",
          project: (selectedAttachment as any).project || "",
          invoice_no: (selectedAttachment as any).invoice_no || "",
          invoice_date: (selectedAttachment as any).invoice_date || "",
          due_date: (selectedAttachment as any).due_date || "",
          currency: (selectedAttachment as any).currency || "AUD",
          subtotal: (selectedAttachment as any).subtotal || 0,
          gst: (selectedAttachment as any).gst || 0,
          total_amount: (selectedAttachment as any).total_amount || 0,
          amount_paid: (selectedAttachment as any).amount_paid || 0,
          amount_due: 0, // Will be computed
          payment_ref: (selectedAttachment as any).payment_ref || "",
          google_drive_link: (selectedAttachment as any).google_drive_link || "",
          sender_email: (selectedAttachment as any).sender_email || "",
          list_items: ((selectedAttachment as any).list_items || []).map(
            (item: any) => calculateLineItem(item)
          ),
        };

        // Add a default line item if none exist
        if (prefillData.list_items.length === 0) {
          prefillData.list_items = [
            calculateLineItem({
              quantity: 1,
              unit_price: 0,
              gst_included: true,
            }),
          ];
        }

        // Compute amount_due
        prefillData.amount_due =
          prefillData.total_amount - prefillData.amount_paid;

        setDraftInvoice(prefillData);
        setLoading(false);
      }, 300);
    }
  }, [open, selectedAttachment]);

  const updateField = (field: keyof DraftInvoice, value: any) => {
    if (!draftInvoice) return;

    const updated = { ...draftInvoice, [field]: value };

    // Recompute amount_due
    if (field === "total_amount" || field === "amount_paid") {
      updated.amount_due = updated.total_amount - updated.amount_paid;
    }

    setDraftInvoice(updated);
  };

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: any
  ) => {
    if (!draftInvoice) return;

    const items = [...draftInvoice.list_items];
    const item = { ...items[index], [field]: value };
    items[index] = calculateLineItem(item);

    setDraftInvoice({ ...draftInvoice, list_items: items });
  };

  const addLineItem = () => {
    if (!draftInvoice) return;

    const newItem = calculateLineItem({
      quantity: 1,
      unit_price: 0,
      gst_included: true,
    });

    setDraftInvoice({
      ...draftInvoice,
      list_items: [...draftInvoice.list_items, newItem],
    });
  };

  const removeLineItem = (index: number) => {
    if (!draftInvoice) return;

    const items = draftInvoice.list_items.filter((_, i) => i !== index);
    setDraftInvoice({ ...draftInvoice, list_items: items });
  };

  const totalFromLineItems = useMemo(() => {
    if (!draftInvoice) return 0;
    return draftInvoice.list_items.reduce(
      (sum, item) => sum + item.line_total_inc_gst,
      0
    );
  }, [draftInvoice?.list_items]);

  const totalMismatch = useMemo(() => {
    if (!draftInvoice) return false;
    const diff = Math.abs(totalFromLineItems - draftInvoice.total_amount);
    return diff > 0.01; // Allow 1 cent tolerance
  }, [totalFromLineItems, draftInvoice?.total_amount]);

  const validateForm = (): boolean => {
    if (!draftInvoice) return false;

    const errors: ValidationErrors = {};
    const tolerance = 0.01;

    // Required fields
    if (!draftInvoice.supplier_name?.trim()) {
      errors.supplier_name = "Required";
    }
    if (!draftInvoice.entity?.trim()) {
      errors.entity = "Required";
    }
    if (!draftInvoice.invoice_no?.trim()) {
      errors.invoice_no = "Required";
    }
    if (!draftInvoice.invoice_date) {
      errors.invoice_date = "Required";
    }
    if (!draftInvoice.currency?.trim()) {
      errors.currency = "Required";
    }

    // Number validation helper
    const checkNumber = (val: any, field: string, allowNegative = false) => {
      const num = Number(val);
      if (isNaN(num) || !isFinite(num)) {
        errors[field] = "Must be a valid number";
      } else if (num < 0 && !allowNegative) {
        errors[field] = "Cannot be negative";
      }
    };

    checkNumber(draftInvoice.subtotal, "subtotal");
    checkNumber(draftInvoice.gst, "gst");
    checkNumber(draftInvoice.total_amount, "total_amount");

    // Amount due consistency check (allow zero or negative for overpayments)
    const totalAmount = Number(draftInvoice.total_amount) || 0;
    const amountPaid = Number(draftInvoice.amount_paid) || 0;
    const amountDue = Number(draftInvoice.amount_due) || 0;
    const expectedAmountDue = totalAmount - amountPaid;

    if (Math.abs(amountDue - expectedAmountDue) > tolerance) {
      errors.amount_due = `Should be ${expectedAmountDue.toFixed(2)}`;
    }

    // Line items validation
    draftInvoice.list_items.forEach((item, idx) => {
      if (!item.description?.trim()) {
        errors[`line_${idx}_description`] = "Description required";
      }

      const qty = Number(item.quantity);
      const price = Number(item.unit_price);
      const exGst = Number(item.line_total_ex_gst);
      const gst = Number(item.line_gst);
      const incGst = Number(item.line_total_inc_gst);

      if (isNaN(qty) || qty < 0) {
        errors[`line_${idx}_quantity`] = "Must be >= 0";
      }
      if (isNaN(price) || price < 0) {
        errors[`line_${idx}_unit_price`] = "Must be >= 0";
      }

      // Line totals consistency
      if (Math.abs((exGst + gst) - incGst) > tolerance) {
        errors[`line_${idx}_totals`] = "Line totals inconsistent";
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkDuplicate = async (invoiceNo: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("invoices")
      .select("id")
      .eq("invoice_no", invoiceNo.trim())
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Duplicate check error:", error);
      toast({
        title: "Error",
        description: "Could not check for duplicates. Please try again.",
        variant: "destructive",
      });
      throw error;
    }

    if (data) {
      setValidationErrors(prev => ({
        ...prev,
        invoice_no: "Invoice number already exists. Please choose a different invoice number."
      }));
      toast({
        title: "Duplicate Invoice",
        description: "This invoice number already exists.",
        variant: "destructive",
      });
      return true;
    }

    return false;
  };

  const callWebhook = async (attachmentId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        "https://sodhipg.app.n8n.cloud/webhook/4175ced6-167b-4180-9aeb-00fba65c9350",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: attachmentId }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error("Webhook error:", error);
      return false;
    }
  };

  const handleSave = async () => {
    if (!draftInvoice || !selectedAttachment) return;

    // Clear previous validation errors
    setValidationErrors({});

    // Validate form
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Step 1: Check duplicate
      const isDuplicate = await checkDuplicate(draftInvoice.invoice_no);
      if (isDuplicate) {
        setSaving(false);
        return;
      }

      // Step 2: Prepare insert payload - map attachment_id to email_id
      const insertPayload = {
        email_id: selectedAttachment.id, // Map attachment_id to email_id column
        supplier_name: draftInvoice.supplier_name?.trim(),
        entity: draftInvoice.entity?.trim(),
        project: draftInvoice.project?.trim() || null,
        invoice_no: draftInvoice.invoice_no?.trim(),
        invoice_date: draftInvoice.invoice_date, // Already in YYYY-MM-DD format
        due_date: draftInvoice.due_date || null,
        currency: draftInvoice.currency || "AUD",
        subtotal: Number(draftInvoice.subtotal),
        gst: Number(draftInvoice.gst),
        total_amount: Number(draftInvoice.total_amount),
        amount_paid: Number(draftInvoice.amount_paid) || 0,
        amount_due: Number(draftInvoice.amount_due),
        payment_ref: draftInvoice.payment_ref?.trim() || null,
        google_drive_link: draftInvoice.google_drive_link || null,
        sender_email: draftInvoice.sender_email || null,
        list_items: draftInvoice.list_items as any, // Cast to any for JSON compatibility
      };

      // Step 3: Insert invoice
      const { data, error } = await supabase
        .from("invoices")
        .insert([insertPayload])
        .select("id")
        .single();

      if (error) {
        console.error("Insert error:", error);
        throw new Error(error.message);
      }

      const invoiceId = data.id;

      toast({
        title: "Invoice Saved",
        description: "Invoice has been saved successfully.",
      });

      onSaved?.(invoiceId);

      // Step 4: Call webhook
      const webhookSuccess = await callWebhook(selectedAttachment.id);

      if (webhookSuccess) {
        toast({
          title: "Processing Started",
          description: "Processing started for this attachment.",
        });
        onWebhookResult?.(true);
      } else {
        const { dismiss } = toast({
          title: "Processing Warning",
          description: "Saved, but processing could not be started.",
          variant: "default",
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                dismiss();
                const retrySuccess = await callWebhook(selectedAttachment.id);
                if (retrySuccess) {
                  toast({
                    title: "Success",
                    description: "Processing started successfully.",
                  });
                  onWebhookResult?.(true);
                } else {
                  toast({
                    title: "Failed",
                    description: "Webhook retry failed.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Retry Webhook
            </Button>
          ),
        });
        onWebhookResult?.(false);
      }

      // Close drawer after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error("Save failed:", error);
      toast({
        title: "Could not save invoice",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = useMemo(() => {
    if (!draftInvoice) return false;

    return (
      draftInvoice.supplier_name?.trim() &&
      draftInvoice.entity?.trim() &&
      draftInvoice.invoice_no?.trim() &&
      draftInvoice.invoice_date &&
      draftInvoice.currency?.trim() &&
      isFinite(draftInvoice.subtotal) &&
      draftInvoice.subtotal >= 0 &&
      isFinite(draftInvoice.gst) &&
      draftInvoice.gst >= 0 &&
      isFinite(draftInvoice.total_amount) &&
      draftInvoice.total_amount >= 0
    );
  }, [draftInvoice]);

  const renderAttachmentPreview = () => {
    if (!selectedAttachment) return null;

    const mimeType = selectedAttachment.mime_type;
    const data = selectedAttachment.data_base64url;

    if (mimeType.startsWith("image/") && data) {
      const base64 = base64urlToBase64(data);
      return (
        <div className="flex items-center justify-center p-4 bg-muted/20 rounded-lg">
          <img
            src={`data:${mimeType};base64,${base64}`}
            alt={selectedAttachment.filename}
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>
      );
    }

    if (mimeType === "application/pdf" && data) {
      const base64 = base64urlToBase64(data);
      const byteChars = atob(base64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNums);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);

      return (
        <iframe
          src={blobUrl}
          className="w-full border-0 rounded-lg"
          style={{ minHeight: "70vh" }}
          title={selectedAttachment.filename}
        />
      );
    }

    if (selectedAttachment.safe_html) {
      return (
        <div
          className="p-4 prose max-w-none"
          dangerouslySetInnerHTML={{ __html: selectedAttachment.safe_html }}
        />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-muted rounded-lg p-6 mb-4">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-sm font-medium">{selectedAttachment.filename}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {mimeType} • {formatFileSize(selectedAttachment.size_bytes)}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Preview not available for this file type
        </p>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[1400px] max-w-[90vw] p-0 flex flex-col">
        <SheetHeader className="border-b px-6 py-4 flex flex-row items-center justify-between">
          <div className="flex-1">
            <SheetTitle className="text-xl font-semibold">
              Add Invoice
            </SheetTitle>
            {selectedAttachment && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedAttachment.filename} •{" "}
                {selectedAttachment.mime_type} •{" "}
                {formatFileSize(selectedAttachment.size_bytes)}
              </p>
            )}
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="absolute right-6 top-4">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </SheetHeader>

        {loading ? (
          <div className="flex-1 p-6">
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-hidden">
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Left: Attachment Preview */}
                <ResizablePanel defaultSize={40} minSize={30}>
                  <div className="h-full overflow-auto p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold">Preview</h3>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" disabled>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {renderAttachmentPreview()}
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right: Invoice Form */}
                <ResizablePanel defaultSize={60} minSize={50}>
                  <div className="h-full overflow-auto p-6">
                    {draftInvoice && (
                      <div className="space-y-6">
                        {/* Supplier & Meta */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold border-b pb-2">
                            Supplier & Meta
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="supplier_name">
                                Supplier Name *
                              </Label>
                              <Input
                                id="supplier_name"
                                value={draftInvoice.supplier_name}
                                onChange={(e) => {
                                  updateField("supplier_name", e.target.value);
                                  setValidationErrors((prev) => {
                                    const { supplier_name, ...rest } = prev;
                                    return rest;
                                  });
                                }}
                                placeholder="Enter supplier name"
                                className={
                                  validationErrors.supplier_name
                                    ? "border-destructive"
                                    : ""
                                }
                              />
                              {validationErrors.supplier_name && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {validationErrors.supplier_name}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="entity">Entity *</Label>
                              <Input
                                id="entity"
                                value={draftInvoice.entity}
                                onChange={(e) => {
                                  updateField("entity", e.target.value);
                                  setValidationErrors((prev) => {
                                    const { entity, ...rest } = prev;
                                    return rest;
                                  });
                                }}
                                placeholder="Enter entity"
                                className={
                                  validationErrors.entity
                                    ? "border-destructive"
                                    : ""
                                }
                              />
                              {validationErrors.entity && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {validationErrors.entity}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="project">Project</Label>
                              <Input
                                id="project"
                                value={draftInvoice.project}
                                onChange={(e) =>
                                  updateField("project", e.target.value)
                                }
                                placeholder="Enter project (optional)"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="invoice_no">Invoice No *</Label>
                              <Input
                                id="invoice_no"
                                value={draftInvoice.invoice_no}
                                onChange={(e) => {
                                  updateField("invoice_no", e.target.value);
                                  setValidationErrors((prev) => {
                                    const { invoice_no, ...rest } = prev;
                                    return rest;
                                  });
                                }}
                                placeholder="Enter invoice number"
                                className={
                                  validationErrors.invoice_no
                                    ? "border-destructive"
                                    : ""
                                }
                              />
                              {validationErrors.invoice_no && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {validationErrors.invoice_no}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="invoice_date">
                                Invoice Date *
                              </Label>
                              <Input
                                id="invoice_date"
                                type="date"
                                value={draftInvoice.invoice_date}
                                onChange={(e) => {
                                  updateField("invoice_date", e.target.value);
                                  setValidationErrors((prev) => {
                                    const { invoice_date, ...rest } = prev;
                                    return rest;
                                  });
                                }}
                                className={
                                  validationErrors.invoice_date
                                    ? "border-destructive"
                                    : ""
                                }
                              />
                              {validationErrors.invoice_date && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {validationErrors.invoice_date}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="due_date">Due Date</Label>
                              <Input
                                id="due_date"
                                type="date"
                                value={draftInvoice.due_date}
                                onChange={(e) =>
                                  updateField("due_date", e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="currency">Currency</Label>
                              <Select
                                value={draftInvoice.currency}
                                onValueChange={(value) => {
                                  updateField("currency", value);
                                  setValidationErrors((prev) => {
                                    const { currency, ...rest } = prev;
                                    return rest;
                                  });
                                }}
                              >
                                <SelectTrigger
                                  id="currency"
                                  className={
                                    validationErrors.currency
                                      ? "border-destructive"
                                      : ""
                                  }
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AUD">AUD</SelectItem>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="EUR">EUR</SelectItem>
                                  <SelectItem value="GBP">GBP</SelectItem>
                                </SelectContent>
                              </Select>
                              {validationErrors.currency && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {validationErrors.currency}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Amounts */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold border-b pb-2">
                            Amounts
                          </h3>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="subtotal">Subtotal *</Label>
                              <Input
                                id="subtotal"
                                type="number"
                                step="0.01"
                                value={draftInvoice.subtotal}
                                onChange={(e) => {
                                  updateField(
                                    "subtotal",
                                    parseFloat(e.target.value) || 0
                                  );
                                  setValidationErrors((prev) => {
                                    const { subtotal, ...rest } = prev;
                                    return rest;
                                  });
                                }}
                                className={
                                  validationErrors.subtotal
                                    ? "border-destructive"
                                    : ""
                                }
                              />
                              {validationErrors.subtotal && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {validationErrors.subtotal}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="gst">GST *</Label>
                              <Input
                                id="gst"
                                type="number"
                                step="0.01"
                                value={draftInvoice.gst}
                                onChange={(e) => {
                                  updateField(
                                    "gst",
                                    parseFloat(e.target.value) || 0
                                  );
                                  setValidationErrors((prev) => {
                                    const { gst, ...rest } = prev;
                                    return rest;
                                  });
                                }}
                                className={
                                  validationErrors.gst ? "border-destructive" : ""
                                }
                              />
                              {validationErrors.gst && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {validationErrors.gst}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="total_amount">
                                Total Amount *
                              </Label>
                              <Input
                                id="total_amount"
                                type="number"
                                step="0.01"
                                value={draftInvoice.total_amount}
                                onChange={(e) => {
                                  updateField(
                                    "total_amount",
                                    parseFloat(e.target.value) || 0
                                  );
                                  setValidationErrors((prev) => {
                                    const { total_amount, ...rest } = prev;
                                    return rest;
                                  });
                                }}
                                className={
                                  validationErrors.total_amount
                                    ? "border-destructive"
                                    : ""
                                }
                              />
                              {validationErrors.total_amount && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {validationErrors.total_amount}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="amount_paid">Amount Paid</Label>
                              <Input
                                id="amount_paid"
                                type="number"
                                step="0.01"
                                value={draftInvoice.amount_paid}
                                onChange={(e) =>
                                  updateField(
                                    "amount_paid",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="amount_due">
                                Amount Due (computed)
                              </Label>
                              <Input
                                id="amount_due"
                                type="number"
                                value={draftInvoice.amount_due}
                                disabled
                                className="bg-muted"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="payment_ref">
                                Payment Reference
                              </Label>
                              <Input
                                id="payment_ref"
                                value={draftInvoice.payment_ref}
                                onChange={(e) =>
                                  updateField("payment_ref", e.target.value)
                                }
                                placeholder="Optional"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Links and Context */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold border-b pb-2">
                            Links & Context
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="google_drive_link">
                                Google Drive Link
                              </Label>
                              {draftInvoice.google_drive_link ? (
                                <a
                                  href={draftInvoice.google_drive_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline block truncate"
                                >
                                  {draftInvoice.google_drive_link}
                                </a>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  No link available
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="sender_email">
                                Sender Email
                              </Label>
                              <Input
                                id="sender_email"
                                value={draftInvoice.sender_email}
                                disabled
                                className="bg-muted"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Line Items */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="text-sm font-semibold">
                              Line Items
                            </h3>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={addLineItem}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add line item
                            </Button>
                          </div>

                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[250px]">
                                    Description
                                  </TableHead>
                                  <TableHead className="w-[80px]">
                                    Qty
                                  </TableHead>
                                  <TableHead className="w-[100px]">
                                    Unit Price
                                  </TableHead>
                                  <TableHead className="w-[80px]">
                                    GST Inc.
                                  </TableHead>
                                  <TableHead className="w-[120px]">
                                    Account
                                  </TableHead>
                                  <TableHead className="w-[100px] text-right">
                                    Ex GST
                                  </TableHead>
                                  <TableHead className="w-[100px] text-right">
                                    GST
                                  </TableHead>
                                  <TableHead className="w-[100px] text-right">
                                    Inc GST
                                  </TableHead>
                                  <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {draftInvoice.list_items.map((item, index) => (
                                  <TableRow key={item.id}>
                                    <TableCell>
                                      <Input
                                        value={item.description}
                                        onChange={(e) =>
                                          updateLineItem(
                                            index,
                                            "description",
                                            e.target.value
                                          )
                                        }
                                        placeholder="Item description"
                                        className="h-8"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) =>
                                          updateLineItem(
                                            index,
                                            "quantity",
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                        className="h-8"
                                        min="0"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={item.unit_price}
                                        onChange={(e) =>
                                          updateLineItem(
                                            index,
                                            "unit_price",
                                            parseFloat(e.target.value) || 0
                                          )
                                        }
                                        className="h-8"
                                        min="0"
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Checkbox
                                        checked={item.gst_included}
                                        onCheckedChange={(checked) =>
                                          updateLineItem(
                                            index,
                                            "gst_included",
                                            checked
                                          )
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        value={item.account_code}
                                        onChange={(e) =>
                                          updateLineItem(
                                            index,
                                            "account_code",
                                            e.target.value
                                          )
                                        }
                                        placeholder="Account"
                                        className="h-8"
                                      />
                                    </TableCell>
                                    <TableCell className="text-right text-sm">
                                      {item.line_total_ex_gst.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right text-sm">
                                      {item.line_gst.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right text-sm font-medium">
                                      {item.line_total_inc_gst.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => removeLineItem(index)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Totals Bar */}
                          <div className="bg-muted/50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-medium">
                                  Line Items Total: $
                                  {totalFromLineItems.toFixed(2)}
                                </p>
                                {totalMismatch && (
                                  <Alert className="py-2">
                                    <AlertDescription className="text-xs">
                                      Warning: Line items total ($
                                      {totalFromLineItems.toFixed(2)}) doesn't
                                      match invoice total ($
                                      {draftInvoice.total_amount.toFixed(2)})
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>

            {/* Action Bar */}
            <div className="border-t px-6 py-4 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!isFormValid || saving}
              >
                {saving ? "Saving..." : "Save Invoice"}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
