import { useState, useEffect, useMemo } from "react";
import { X, Download, RefreshCw, Plus, Trash2, AlertCircle } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmailAttachment } from "@/services/emailReviewService";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { checkAndMarkEmailReviewed } from "@/services/emailReviewCompletionService";

interface AddInvoiceWorkspaceProps {
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
  gst_exempt: boolean;
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
  supplier_email_on_invoice: string;
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
  const gstExempt = item.gst_exempt ?? false;

  let line_total_inc_gst = quantity * unitPrice;
  let line_gst = 0;
  let line_total_ex_gst = 0;

  // Priority 1: Check if GST Exempt
  if (gstExempt) {
    // GST Exempt: No GST, ex-GST = inc-GST
    line_gst = 0;
    line_total_ex_gst = line_total_inc_gst;
  }
  // Priority 2: Check if GST Included (only if not exempt)
  else if (gstIncluded) {
    // GST is included in the price
    line_gst = line_total_inc_gst / 11; // 10% of ex-GST amount
    line_total_ex_gst = line_total_inc_gst - line_gst;
  } else {
    // GST is NOT included in the price
    line_total_ex_gst = line_total_inc_gst;
    line_gst = line_total_ex_gst * 0.1; // 10% GST
    line_total_inc_gst = line_total_ex_gst + line_gst;
  }

  return {
    id: item.id || crypto.randomUUID(),
    description: item.description || "",
    quantity,
    unit_price: unitPrice,
    gst_included: gstIncluded,
    gst_exempt: gstExempt,
    account_code: item.account_code || "",
    line_total_ex_gst: Math.round(line_total_ex_gst * 100) / 100,
    line_gst: Math.round(line_gst * 100) / 100,
    line_total_inc_gst: Math.round(line_total_inc_gst * 100) / 100,
  };
};

interface ValidationErrors {
  [key: string]: string;
}

export const AddInvoiceWorkspace = ({
  open,
  onClose,
  selectedAttachment,
  onSaved,
  onWebhookResult,
}: AddInvoiceWorkspaceProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftInvoice, setDraftInvoice] = useState<DraftInvoice | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [webhookRetryCount, setWebhookRetryCount] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [initialDraft, setInitialDraft] = useState<string>("");

  // Calculate amounts dynamically from line items
  const calculatedAmounts = useMemo(() => {
    if (!draftInvoice) return { subtotal: 0, gst: 0, total: 0, amountDue: 0 };

    const subtotal = draftInvoice.list_items.reduce((sum, item) => sum + item.line_total_ex_gst, 0);
    const gst = draftInvoice.list_items.reduce((sum, item) => sum + item.line_gst, 0);
    const total = draftInvoice.list_items.reduce((sum, item) => sum + item.line_total_inc_gst, 0);
    const amountDue = total - (draftInvoice.amount_paid || 0);

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      total: Math.round(total * 100) / 100,
      amountDue: Math.round(amountDue * 100) / 100,
    };
  }, [draftInvoice?.list_items, draftInvoice?.amount_paid]);

  // Sync calculated amounts back to draft invoice state
  useEffect(() => {
    if (draftInvoice && calculatedAmounts) {
      setDraftInvoice(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          subtotal: calculatedAmounts.subtotal,
          gst: calculatedAmounts.gst,
          total_amount: calculatedAmounts.total,
          amount_due: calculatedAmounts.amountDue,
        };
      });
    }
  }, [calculatedAmounts.subtotal, calculatedAmounts.gst, calculatedAmounts.total, calculatedAmounts.amountDue]);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // Track unsaved changes
  useEffect(() => {
    if (draftInvoice && initialDraft) {
      const currentDraft = JSON.stringify(draftInvoice);
      setHasUnsavedChanges(currentDraft !== initialDraft);
    }
  }, [draftInvoice, initialDraft]);

  // Keyboard handlers
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) {
        e.preventDefault();
        handleCloseAttempt();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, saving, hasUnsavedChanges]);

  // Initialize draft invoice from selected attachment
  useEffect(() => {
    if (open && selectedAttachment) {
      setLoading(true);
      setBlobUrl(null);
      setWebhookRetryCount(0);
      setValidationErrors({});
      setHasUnsavedChanges(false);

      // Fetch sender_email from email_queue
      const initializeDraft = async () => {
        let senderEmail = "";
        
        try {
          const { data: emailData } = await supabase
            .from('email_queue')
            .select('sender_email')
            .eq('id', selectedAttachment.email_id)
            .single();
          
          senderEmail = emailData?.sender_email || "";
        } catch (error) {
          console.error("Failed to fetch sender email:", error);
        }

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
          amount_due: 0,
          payment_ref: (selectedAttachment as any).payment_ref || "",
          google_drive_link: (selectedAttachment as any).google_drive_link || "",
          sender_email: senderEmail,
          supplier_email_on_invoice: "",
          list_items: ((selectedAttachment as any).list_items || []).map(
            (item: any) => calculateLineItem(item)
          ),
        };

        if (prefillData.list_items.length === 0) {
          prefillData.list_items = [
            calculateLineItem({
              quantity: 1,
              unit_price: 0,
              gst_included: true,
              gst_exempt: false,
            }),
          ];
        }

        prefillData.amount_due = prefillData.total_amount - prefillData.amount_paid;

        setDraftInvoice(prefillData);
        setInitialDraft(JSON.stringify(prefillData));
        setLoading(false);
      };

      initializeDraft();
    }
  }, [open, selectedAttachment]);

  const handleCloseAttempt = () => {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const updateField = (field: keyof DraftInvoice, value: any) => {
    if (!draftInvoice) return;
    setDraftInvoice({ ...draftInvoice, [field]: value });
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
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
      gst_exempt: false,
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

  const validateForm = (): boolean => {
    if (!draftInvoice) return false;

    const errors: ValidationErrors = {};
    const tolerance = 0.01;

    if (!draftInvoice.supplier_name?.trim()) errors.supplier_name = "Required";
    if (!draftInvoice.entity?.trim()) errors.entity = "Required";
    if (!draftInvoice.invoice_no?.trim()) errors.invoice_no = "Required";
    if (!draftInvoice.invoice_date) errors.invoice_date = "Required";
    if (!draftInvoice.currency?.trim()) errors.currency = "Required";

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
        description: "Could not check for duplicates.",
        variant: "destructive",
      });
      throw error;
    }

    if (data) {
      setValidationErrors((prev) => ({
        ...prev,
        invoice_no: "Invoice number already exists.",
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

  const callWebhook = async (attachmentId: string, isRetry = false): Promise<boolean> => {
    try {
      const response = await fetch(
        "https://sodhipg.app.n8n.cloud/webhook/4175ced6-167b-4180-9aeb-00fba65c9350",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: attachmentId }),
        }
      );

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      if (isRetry) {
        toast({
          title: "Webhook Success",
          description: "Processing started successfully.",
        });
      }

      return true;
    } catch (error) {
      console.error("Webhook error:", error);

      if (!isRetry && webhookRetryCount === 0) {
        toast({
          title: "Webhook Failed",
          description: "Will retry in 10 seconds...",
          variant: "default",
        });

        setTimeout(async () => {
          setWebhookRetryCount(1);
          const retrySuccess = await callWebhook(attachmentId, true);
          if (!retrySuccess) {
            toast({
              title: "Webhook Failed",
              description: "Could not start processing.",
              variant: "destructive",
            });
          }
        }, 10000);
      }

      return false;
    }
  };

  const handleSave = async () => {
    if (!draftInvoice || !selectedAttachment) return;

    setValidationErrors({});

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const isDuplicate = await checkDuplicate(draftInvoice.invoice_no);
      if (isDuplicate) {
        setSaving(false);
        return;
      }

      const insertPayload = {
        email_id: selectedAttachment.id,
        supplier_name: draftInvoice.supplier_name?.trim(),
        entity: draftInvoice.entity?.trim(),
        project: draftInvoice.project?.trim() || null,
        invoice_no: draftInvoice.invoice_no?.trim(),
        invoice_date: draftInvoice.invoice_date || null,
        due_date: draftInvoice.due_date || null,
        currency: draftInvoice.currency || "AUD",
        subtotal: calculatedAmounts.subtotal,
        gst: calculatedAmounts.gst,
        total_amount: calculatedAmounts.total,
        amount_paid: Number(draftInvoice.amount_paid) || 0,
        amount_due: calculatedAmounts.amountDue,
        payment_ref: draftInvoice.payment_ref?.trim() || null,
        google_drive_link: draftInvoice.google_drive_link || null,
        sender_email: draftInvoice.sender_email || null,
        supplier_email_on_invoice: draftInvoice.supplier_email_on_invoice?.trim() || null,
        list_items: draftInvoice.list_items as any,
      };

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

      const { error: updateError } = await supabase
        .from("email_attachments" as any)
        .update({
          status: "completed",
          review_added: true,
          attachment_added_at: new Date().toISOString(),
        })
        .eq("id", selectedAttachment.id);

      if (updateError) {
        console.error("Failed to update attachment status:", updateError);

        await supabase.from("invoices").delete().eq("id", invoiceId);

        toast({
          title: "Save Failed",
          description: "Could not update attachment status.",
          variant: "destructive",
        });

        setSaving(false);
        return;
      }

      toast({
        title: "✓ Invoice Saved",
        description: "Invoice has been saved successfully.",
      });

      await checkAndMarkEmailReviewed(selectedAttachment.email_id);

      onSaved?.(invoiceId);

      const webhookSuccess = await callWebhook(selectedAttachment.id);
      onWebhookResult?.(webhookSuccess);

      if (webhookSuccess) {
        toast({
          title: "Processing Started",
          description: "Processing started for this attachment.",
        });
      }

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
      draftInvoice.currency?.trim()
    );
  }, [draftInvoice]);

  const handleDownload = () => {
    if (!selectedAttachment?.data_base64url) return;

    try {
      const base64 = base64urlToBase64(selectedAttachment.data_base64url);
      const byteChars = atob(base64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNums);
      const blob = new Blob([byteArray], { type: selectedAttachment.mime_type });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = selectedAttachment.filename || "attachment";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download Failed",
        description: "Unable to download the file.",
        variant: "destructive",
      });
    }
  };

  const createBlobUrl = (data: string, mimeType: string): string => {
    const base64 = base64urlToBase64(data);
    const byteChars = atob(base64);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNums);
    const blob = new Blob([byteArray], { type: mimeType });
    return URL.createObjectURL(blob);
  };

  const renderAttachmentPreview = () => {
    if (!selectedAttachment) return null;

    const mimeType = selectedAttachment.mime_type.toLowerCase();
    const data = selectedAttachment.data_base64url;

    if (mimeType.startsWith("image/") && data) {
      if (!blobUrl) {
        try {
          const url = createBlobUrl(data, selectedAttachment.mime_type);
          setBlobUrl(url);
        } catch (error) {
          console.error("Failed to create image Blob URL:", error);
        }
      }

      return (
        <div className="flex items-center justify-center h-full p-4 bg-muted/10 overflow-auto">
          {blobUrl ? (
            <img
              src={blobUrl}
              alt={selectedAttachment.filename}
              className="max-w-full h-auto rounded shadow-sm"
            />
          ) : (
            <Skeleton className="w-96 h-96" />
          )}
        </div>
      );
    }

    if (mimeType === "application/pdf" && data) {
      if (!blobUrl) {
        try {
          const url = createBlobUrl(data, "application/pdf");
          setBlobUrl(url);
        } catch (error) {
          console.error("Failed to create PDF Blob URL:", error);
        }
      }

      return (
        <div className="w-full h-full bg-white overflow-auto">
          {blobUrl ? (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title={selectedAttachment.filename}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="w-full h-full" />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="bg-muted rounded-lg p-6 mb-4">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-sm font-medium">{selectedAttachment.filename}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedAttachment.mime_type} • {formatFileSize(selectedAttachment.size_bytes)}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Preview not available for this file type
        </p>
      </div>
    );
  };

  if (!open || !selectedAttachment) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
        {/* Workspace Container */}
        <div className="fixed inset-4 bg-card rounded-lg shadow-2xl flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="flex-shrink-0 h-14 border-b bg-card px-6 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium truncate">
                  {selectedAttachment.filename}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {selectedAttachment.mime_type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(selectedAttachment.size_bytes)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(selectedAttachment.created_at), "MMM d, yyyy h:mm a")}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseAttempt}
              disabled={saving}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Two-Pane Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Pane - PDF Preview */}
            <div className="w-[60%] border-r flex flex-col overflow-hidden">
              {/* PDF Toolbar - Sticky */}
              <div className="flex-shrink-0 sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium">Attachment Preview</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    title="Download"
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBlobUrl(null);
                    }}
                    title="Refresh"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* PDF Content - Scrollable */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {renderAttachmentPreview()}
              </div>
            </div>

            {/* Right Pane - Invoice Form */}
            <div className="w-[40%] flex flex-col overflow-hidden">
              {/* Form Header - Sticky */}
              <div className="flex-shrink-0 sticky top-0 z-10 bg-card border-b px-4 py-3">
                <h2 className="text-lg font-semibold">Invoice Details</h2>
              </div>

              {/* Form Content - Scrollable */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-6">
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : draftInvoice ? (
                  <div className="space-y-6">
                    {/* Supplier & Entity */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold border-b pb-2">Supplier & Entity</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="supplier_name">Supplier Name *</Label>
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
                            className={validationErrors.supplier_name ? "border-destructive" : ""}
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
                            className={validationErrors.entity ? "border-destructive" : ""}
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
                            onChange={(e) => updateField("project", e.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Invoice Numbers & Dates */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold border-b pb-2">Invoice Details</h3>
                      <div className="space-y-4">
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
                            className={validationErrors.invoice_no ? "border-destructive" : ""}
                          />
                          {validationErrors.invoice_no && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {validationErrors.invoice_no}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="invoice_date">Invoice Date *</Label>
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
                              className={validationErrors.invoice_date ? "border-destructive" : ""}
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
                              onChange={(e) => updateField("due_date", e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="currency">Currency *</Label>
                          <Select
                            value={draftInvoice.currency}
                            onValueChange={(value) => updateField("currency", value)}
                          >
                            <SelectTrigger className={validationErrors.currency ? "border-destructive" : ""}>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AUD">AUD</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
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

                    {/* Line Items */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="text-sm font-semibold">Line Items</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addLineItem}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Line
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {draftInvoice.list_items.map((item, idx) => (
                          <div key={item.id} className="p-3 border rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">Line {idx + 1}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLineItem(idx)}
                                disabled={draftInvoice.list_items.length === 1}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`desc_${idx}`}>Description *</Label>
                              <Input
                                id={`desc_${idx}`}
                                value={item.description}
                                onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                                placeholder="Item description"
                                className={validationErrors[`line_${idx}_description`] ? "border-destructive" : ""}
                              />
                              {validationErrors[`line_${idx}_description`] && (
                                <p className="text-xs text-destructive">{validationErrors[`line_${idx}_description`]}</p>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-2">
                                <Label htmlFor={`qty_${idx}`}>Quantity</Label>
                                <Input
                                  id={`qty_${idx}`}
                                  type="number"
                                  step="0.01"
                                  value={item.quantity === 0 ? "" : item.quantity}
                                  onChange={(e) => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                                  className={validationErrors[`line_${idx}_quantity`] ? "border-destructive" : ""}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`price_${idx}`}>Unit Price</Label>
                                <Input
                                  id={`price_${idx}`}
                                  type="number"
                                  step="0.01"
                                  value={item.unit_price === 0 ? "" : item.unit_price}
                                  onChange={(e) => updateLineItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                                  className={validationErrors[`line_${idx}_unit_price`] ? "border-destructive" : ""}
                                />
                              </div>
                            </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`gst_${idx}`}
                        checked={item.gst_included}
                        disabled={item.gst_exempt}
                        onCheckedChange={(checked) =>
                          updateLineItem(idx, "gst_included", checked === true)
                        }
                      />
                      <Label htmlFor={`gst_${idx}`} className="text-xs cursor-pointer">
                        GST Included
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`gst_exempt_${idx}`}
                        checked={item.gst_exempt}
                        onCheckedChange={(checked) =>
                          updateLineItem(idx, "gst_exempt", checked === true)
                        }
                      />
                      <Label htmlFor={`gst_exempt_${idx}`} className="text-xs cursor-pointer">
                        GST Exempt
                      </Label>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                    {item.gst_exempt && (
                      <div className="text-amber-600 font-medium mb-1">
                        GST Exempt
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Ex GST:</span>
                      <span>${item.line_total_ex_gst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST:</span>
                      <span>${item.line_gst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Inc GST:</span>
                      <span>${item.line_total_inc_gst.toFixed(2)}</span>
                    </div>
                  </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Amounts */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold border-b pb-2">Amounts</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="subtotal">Subtotal</Label>
                          <Input
                            id="subtotal"
                            type="text"
                            value={calculatedAmounts.subtotal.toFixed(2)}
                            readOnly
                            className="bg-muted"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="gst">GST</Label>
                          <Input
                            id="gst"
                            type="text"
                            value={calculatedAmounts.gst.toFixed(2)}
                            readOnly
                            className="bg-muted"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="total_amount">Total Amount</Label>
                          <Input
                            id="total_amount"
                            type="text"
                            value={calculatedAmounts.total.toFixed(2)}
                            readOnly
                            className="bg-muted"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="amount_paid">Amount Paid</Label>
                          <Input
                            id="amount_paid"
                            type="number"
                            step="0.01"
                            value={draftInvoice.amount_paid === 0 ? "" : draftInvoice.amount_paid}
                            onChange={(e) => updateField("amount_paid", parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="amount_due">Amount Due</Label>
                          <Input
                            id="amount_due"
                            type="text"
                            value={calculatedAmounts.amountDue.toFixed(2)}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Fields */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold border-b pb-2">Additional Information</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="payment_ref">Payment Reference</Label>
                          <Input
                            id="payment_ref"
                            value={draftInvoice.payment_ref}
                            onChange={(e) => updateField("payment_ref", e.target.value)}
                            placeholder="Optional"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="sender_email">Sender Email</Label>
                          <Input
                            id="sender_email"
                            type="text"
                            value={draftInvoice.sender_email}
                            readOnly
                            className="bg-muted"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="supplier_email_on_invoice">Supplier Email</Label>
                          <Input
                            id="supplier_email_on_invoice"
                            type="email"
                            value={draftInvoice.supplier_email_on_invoice}
                            onChange={(e) => updateField("supplier_email_on_invoice", e.target.value)}
                            placeholder="Email address from invoice (optional)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex-shrink-0 h-16 border-t bg-card px-6 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleCloseAttempt}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isFormValid || saving}
            >
              {saving ? "Saving..." : "Save Invoice"}
            </Button>
          </div>
        </div>
      </div>

      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCloseConfirm(false);
                onClose();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
