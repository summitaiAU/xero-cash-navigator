 import { useState, useEffect, useMemo, useRef } from "react";
 import { X, Upload, Plus, Trash2, AlertCircle, Loader2, FileText, ImageIcon } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Checkbox } from "@/components/ui/checkbox";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
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
 import { Badge } from "@/components/ui/badge";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "@/hooks/use-toast";
 import { useIsMobile } from "@/hooks/use-mobile";
 
 interface ManualInvoiceModalProps {
   open: boolean;
   onClose: () => void;
   onSuccess?: () => void;
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
   payment_ref: string;
   supplier_email_on_invoice: string;
   supplier_abn: string;
   list_items: LineItem[];
 }
 
 interface ValidationErrors {
   [key: string]: string;
 }
 
 const genLineItemId = () => {
   try {
     if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
       return (crypto as any).randomUUID();
     }
   } catch {}
   return `li_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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
     line_gst = 0;
     line_total_ex_gst = line_total_inc_gst;
   }
   // Priority 2: Check if GST Included (only if not exempt)
   else if (gstIncluded) {
     line_gst = line_total_inc_gst / 11;
     line_total_ex_gst = line_total_inc_gst - line_gst;
   } else {
     line_total_ex_gst = line_total_inc_gst;
     line_gst = line_total_ex_gst * 0.1;
     line_total_inc_gst = line_total_ex_gst + line_gst;
   }
 
   return {
     id: item.id || genLineItemId(),
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
 
 const createEmptyDraft = (): DraftInvoice => ({
   supplier_name: "",
   entity: "",
   project: "",
   invoice_no: "",
   invoice_date: "",
   due_date: "",
   currency: "AUD",
   subtotal: 0,
   gst: 0,
   total_amount: 0,
   payment_ref: "",
   supplier_email_on_invoice: "",
   supplier_abn: "",
   list_items: [
     calculateLineItem({
       quantity: 1,
       unit_price: 0,
       gst_included: true,
       gst_exempt: false,
     }),
   ],
 });
 
 export const ManualInvoiceModal = ({
   open,
   onClose,
   onSuccess,
 }: ManualInvoiceModalProps) => {
   const isMobile = useIsMobile();
   const fileInputRef = useRef<HTMLInputElement>(null);
   
   const [saving, setSaving] = useState(false);
   const [draftInvoice, setDraftInvoice] = useState<DraftInvoice>(createEmptyDraft());
   const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
   const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
   const [showCloseConfirm, setShowCloseConfirm] = useState(false);
   const [initialDraft, setInitialDraft] = useState<string>("");
   
   // File upload state
   const [fileData, setFileData] = useState<string | null>(null);
   const [fileName, setFileName] = useState<string>("");
   const [dragOver, setDragOver] = useState(false);
 
   // Calculate amounts dynamically from line items
   const calculatedAmounts = useMemo(() => {
     const subtotal = draftInvoice.list_items.reduce((sum, item) => sum + item.line_total_ex_gst, 0);
     const gst = draftInvoice.list_items.reduce((sum, item) => sum + item.line_gst, 0);
     const total = draftInvoice.list_items.reduce((sum, item) => sum + item.line_total_inc_gst, 0);
 
     return {
       subtotal: Math.round(subtotal * 100) / 100,
       gst: Math.round(gst * 100) / 100,
       total: Math.round(total * 100) / 100,
     };
   }, [draftInvoice.list_items]);
 
   // Initialize on open
   useEffect(() => {
     if (open) {
       const newDraft = createEmptyDraft();
       setDraftInvoice(newDraft);
       setInitialDraft(JSON.stringify(newDraft));
       setValidationErrors({});
       setHasUnsavedChanges(false);
       setFileData(null);
       setFileName("");
     }
   }, [open]);
 
   // Track unsaved changes
   useEffect(() => {
     if (initialDraft) {
       const currentDraft = JSON.stringify(draftInvoice);
       setHasUnsavedChanges(currentDraft !== initialDraft || !!fileData);
     }
   }, [draftInvoice, initialDraft, fileData]);
 
   const handleCloseAttempt = () => {
     if (hasUnsavedChanges) {
       setShowCloseConfirm(true);
     } else {
       onClose();
     }
   };
 
   const updateField = (field: keyof DraftInvoice, value: any) => {
     setDraftInvoice({ ...draftInvoice, [field]: value });
   };
 
   const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
     const items = [...draftInvoice.list_items];
     const item = { ...items[index], [field]: value };
     items[index] = calculateLineItem(item);
     setDraftInvoice({ ...draftInvoice, list_items: items });
   };
 
   const addLineItem = () => {
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
 
   const toggleAllGstExempt = () => {
     const allExempt = draftInvoice.list_items.every(item => item.gst_exempt);
     const updatedItems = draftInvoice.list_items.map(item => 
       calculateLineItem({
         ...item,
         gst_exempt: !allExempt,
       })
     );
     setDraftInvoice({
       ...draftInvoice,
       list_items: updatedItems,
     });
   };
 
   const removeLineItem = (index: number) => {
     const items = draftInvoice.list_items.filter((_, i) => i !== index);
     setDraftInvoice({ ...draftInvoice, list_items: items });
   };
 
   // File handling
   const handleFile = (file: File) => {
     const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
     
     if (!allowedTypes.includes(file.type)) {
       setValidationErrors(prev => ({
         ...prev,
         file: "Only PDF and JPEG files are allowed"
       }));
       return;
     }
 
     // Clear file error if exists
     setValidationErrors(prev => {
       const { file, ...rest } = prev;
       return rest;
     });
 
     const reader = new FileReader();
     reader.onload = (event) => {
       setFileData(event.target?.result as string);
       setFileName(file.name);
     };
     reader.readAsDataURL(file);
   };
 
   const handleDrop = (e: React.DragEvent) => {
     e.preventDefault();
     setDragOver(false);
     const file = e.dataTransfer.files[0];
     if (file) handleFile(file);
   };
 
   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) handleFile(file);
   };
 
   const clearFile = () => {
     setFileData(null);
     setFileName("");
     if (fileInputRef.current) {
       fileInputRef.current.value = "";
     }
   };
 
   const validateForm = (): boolean => {
     const errors: ValidationErrors = {};
 
     if (!draftInvoice.supplier_name?.trim()) errors.supplier_name = "Required";
     if (!draftInvoice.entity?.trim()) errors.entity = "Required";
     if (!draftInvoice.invoice_no?.trim()) errors.invoice_no = "Required";
     if (!draftInvoice.invoice_date) errors.invoice_date = "Required";
     if (!draftInvoice.currency?.trim()) errors.currency = "Required";
     if (!fileData) errors.file = "Please upload an invoice document";
 
     draftInvoice.list_items.forEach((item, idx) => {
       if (!item.description?.trim()) {
         errors[`line_${idx}_description`] = "Description required";
       }
       const qty = Number(item.quantity);
       const price = Number(item.unit_price);
       if (isNaN(qty) || qty < 0) {
         errors[`line_${idx}_quantity`] = "Must be >= 0";
       }
       if (isNaN(price) || price < 0) {
         errors[`line_${idx}_unit_price`] = "Must be >= 0";
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
 
   const handleSave = async () => {
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
         payment_ref: draftInvoice.payment_ref?.trim() || null,
         supplier_email_on_invoice: draftInvoice.supplier_email_on_invoice?.trim() || null,
         supplier_abn: draftInvoice.supplier_abn?.trim() || null,
         list_items: draftInvoice.list_items as any,
         status: "READY",
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
 
       // Trigger webhook with file data
       const base64Data = fileData!.split(',')[1];
       const contentType = fileData!.split(',')[0].split(':')[1].split(';')[0];
 
       try {
         await fetch('https://sodhipg.app.n8n.cloud/webhook/d142073d-c96d-4386-b029-e9e26c145e85', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             id: invoiceId,
             file_name: fileName,
             file_data: base64Data,
             content_type: contentType,
           }),
         });
       } catch (webhookError) {
         console.error("Webhook error:", webhookError);
         // Don't fail the save if webhook fails
       }
 
       toast({
         title: "Invoice Saved",
         description: "Invoice has been created successfully.",
       });
 
       onClose();
       onSuccess?.();
 
     } catch (error: any) {
       console.error("Save failed:", error);
       toast({
         title: "Save Failed",
         description: error.message || "An unexpected error occurred.",
         variant: "destructive",
       });
     } finally {
       setSaving(false);
     }
   };
 
   const isFormValid = useMemo(() => {
     return (
       draftInvoice.supplier_name?.trim() &&
       draftInvoice.entity?.trim() &&
       draftInvoice.invoice_no?.trim() &&
       draftInvoice.invoice_date &&
       draftInvoice.currency?.trim() &&
       !!fileData
     );
   }, [draftInvoice, fileData]);
 
   const allExempt = draftInvoice.list_items.every(item => item.gst_exempt);
 
   return (
     <>
       <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCloseAttempt()}>
         <DialogContent 
           className="max-w-4xl max-h-[90vh] overflow-y-auto p-0" 
           hideClose
         >
           {/* Header */}
           <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
             <div className="flex items-center justify-between">
               <DialogHeader className="p-0">
                 <DialogTitle className="text-lg font-semibold">
                   Enter Invoice Manually
                 </DialogTitle>
               </DialogHeader>
               <div className="flex items-center gap-2">
                 <Button
                   variant="outline"
                   onClick={handleCloseAttempt}
                   disabled={saving}
                 >
                   Cancel
                 </Button>
                 <Button
                   onClick={handleSave}
                   disabled={saving || !isFormValid}
                 >
                   {saving ? (
                     <>
                       <Loader2 className="h-4 w-4 animate-spin mr-2" />
                       Saving...
                     </>
                   ) : (
                     "Save Invoice"
                   )}
                 </Button>
               </div>
             </div>
           </div>
 
           {/* Form Content */}
           <div className="p-6 space-y-6">
             {/* Supplier & Entity Section */}
             <div className="space-y-4">
               <h3 className="text-sm font-semibold border-b pb-2">Supplier & Entity</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="supplier_name">
                     Supplier Name <span className="text-destructive">*</span>
                   </Label>
                   <Input
                     id="supplier_name"
                     value={draftInvoice.supplier_name}
                     onChange={(e) => updateField("supplier_name", e.target.value)}
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
                   <Label htmlFor="entity">
                     Entity <span className="text-destructive">*</span>
                   </Label>
                   <Input
                     id="entity"
                     value={draftInvoice.entity}
                     onChange={(e) => updateField("entity", e.target.value)}
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
                   />
                 </div>
               </div>
             </div>
 
             {/* Invoice Details Section */}
             <div className="space-y-4">
               <h3 className="text-sm font-semibold border-b pb-2">Invoice Details</h3>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="invoice_no">
                     Invoice No <span className="text-destructive">*</span>
                   </Label>
                   <Input
                     id="invoice_no"
                     value={draftInvoice.invoice_no}
                     onChange={(e) => updateField("invoice_no", e.target.value)}
                     className={validationErrors.invoice_no ? "border-destructive" : ""}
                   />
                   {validationErrors.invoice_no && (
                     <p className="text-xs text-destructive flex items-center gap-1">
                       <AlertCircle className="h-3 w-3" />
                       {validationErrors.invoice_no}
                     </p>
                   )}
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="invoice_date">
                     Invoice Date <span className="text-destructive">*</span>
                   </Label>
                   <Input
                     id="invoice_date"
                     type="date"
                     value={draftInvoice.invoice_date}
                     onChange={(e) => updateField("invoice_date", e.target.value)}
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
                 <div className="space-y-2">
                   <Label htmlFor="currency">
                     Currency <span className="text-destructive">*</span>
                   </Label>
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
 
             {/* Line Items Section */}
             <div className="space-y-4">
               <div className="flex items-center justify-between border-b pb-2">
                 <h3 className="text-sm font-semibold">Line Items</h3>
                 <div className="flex items-center gap-2">
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={toggleAllGstExempt}
                     className="text-xs"
                   >
                     {allExempt ? "Clear GST Exempt" : "GST Exempt All"}
                   </Button>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={addLineItem}
                   >
                     <Plus className="h-4 w-4 mr-1" />
                     Add Line
                   </Button>
                 </div>
               </div>
 
               {isMobile ? (
                 // Mobile card layout
                 <div className="space-y-4">
                   {draftInvoice.list_items.map((item, index) => (
                     <div key={item.id} className="border rounded-lg p-4 space-y-3">
                       <div className="flex items-center justify-between">
                         <span className="text-sm font-medium">Line {index + 1}</span>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => removeLineItem(index)}
                           disabled={draftInvoice.list_items.length === 1}
                         >
                           <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                       </div>
                       <div className="space-y-2">
                         <Label>Description</Label>
                         <Input
                           value={item.description}
                           onChange={(e) => updateLineItem(index, "description", e.target.value)}
                           className={validationErrors[`line_${index}_description`] ? "border-destructive" : ""}
                         />
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                         <div className="space-y-2">
                           <Label>Qty</Label>
                           <Input
                             type="number"
                             value={item.quantity}
                             onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                           />
                         </div>
                         <div className="space-y-2">
                           <Label>Unit Price</Label>
                           <Input
                             type="number"
                             step="0.01"
                             value={item.unit_price}
                             onChange={(e) => updateLineItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                           />
                         </div>
                       </div>
                       <div className="flex items-center gap-4">
                         <div className="flex items-center gap-2">
                           <Checkbox
                             id={`gst_incl_${index}`}
                             checked={item.gst_included}
                             onCheckedChange={(checked) => {
                               updateLineItem(index, "gst_included", !!checked);
                               if (checked) updateLineItem(index, "gst_exempt", false);
                             }}
                           />
                           <Label htmlFor={`gst_incl_${index}`} className="text-xs">GST INCL</Label>
                         </div>
                         <div className="flex items-center gap-2">
                           <Checkbox
                             id={`gst_exempt_${index}`}
                             checked={item.gst_exempt}
                             onCheckedChange={(checked) => {
                               updateLineItem(index, "gst_exempt", !!checked);
                               if (checked) updateLineItem(index, "gst_included", false);
                             }}
                           />
                           <Label htmlFor={`gst_exempt_${index}`} className="text-xs">GST EXMT</Label>
                         </div>
                       </div>
                       <div className="flex justify-between text-sm pt-2 border-t">
                         <span>Line Total</span>
                         <span className="font-medium">${item.line_total_inc_gst.toFixed(2)}</span>
                       </div>
                       {item.gst_exempt ? (
                         <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                           GST Exempt
                         </Badge>
                       ) : (
                         <span className="text-xs text-muted-foreground">
                           GST: ${item.line_gst.toFixed(2)}
                         </span>
                       )}
                     </div>
                   ))}
                 </div>
               ) : (
                 // Desktop table layout
                 <div className="border rounded-lg overflow-hidden">
                   <Table>
                     <TableHeader>
                       <TableRow className="bg-muted/50">
                         <TableHead className="w-[30%]">Description</TableHead>
                         <TableHead className="w-[10%]">Qty</TableHead>
                         <TableHead className="w-[15%]">Unit Price</TableHead>
                         <TableHead className="w-[10%] text-center">GST INCL</TableHead>
                         <TableHead className="w-[10%] text-center">GST EXMT</TableHead>
                         <TableHead className="w-[10%] text-right">GST</TableHead>
                         <TableHead className="w-[10%] text-right">Total</TableHead>
                         <TableHead className="w-[5%]"></TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {draftInvoice.list_items.map((item, index) => (
                         <TableRow key={item.id}>
                           <TableCell>
                             <Input
                               value={item.description}
                               onChange={(e) => updateLineItem(index, "description", e.target.value)}
                               className={`h-8 ${validationErrors[`line_${index}_description`] ? "border-destructive" : ""}`}
                               placeholder="Description"
                             />
                           </TableCell>
                           <TableCell>
                             <Input
                               type="number"
                               value={item.quantity}
                               onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                               className="h-8 w-16"
                             />
                           </TableCell>
                           <TableCell>
                             <Input
                               type="number"
                               step="0.01"
                               value={item.unit_price}
                               onChange={(e) => updateLineItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                               className="h-8"
                             />
                           </TableCell>
                           <TableCell className="text-center">
                             <Checkbox
                               checked={item.gst_included}
                               onCheckedChange={(checked) => {
                                 updateLineItem(index, "gst_included", !!checked);
                                 if (checked) updateLineItem(index, "gst_exempt", false);
                               }}
                             />
                           </TableCell>
                           <TableCell className="text-center">
                             <Checkbox
                               checked={item.gst_exempt}
                               onCheckedChange={(checked) => {
                                 updateLineItem(index, "gst_exempt", !!checked);
                                 if (checked) updateLineItem(index, "gst_included", false);
                               }}
                             />
                           </TableCell>
                           <TableCell className="text-right">
                             {item.gst_exempt ? (
                               <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                 Exempt
                               </Badge>
                             ) : (
                               `$${item.line_gst.toFixed(2)}`
                             )}
                           </TableCell>
                           <TableCell className="text-right font-medium">
                             ${item.line_total_inc_gst.toFixed(2)}
                           </TableCell>
                           <TableCell>
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => removeLineItem(index)}
                               disabled={draftInvoice.list_items.length === 1}
                               className="h-8 w-8 p-0"
                             >
                               <Trash2 className="h-4 w-4 text-destructive" />
                             </Button>
                           </TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
                 </div>
               )}
             </div>
 
             {/* Amounts Section */}
             <div className="space-y-4">
               <h3 className="text-sm font-semibold border-b pb-2">Amounts</h3>
               <div className="grid grid-cols-3 gap-4 max-w-md ml-auto">
                 <div className="space-y-1">
                   <Label className="text-xs text-muted-foreground">Subtotal</Label>
                   <p className="font-medium">${calculatedAmounts.subtotal.toFixed(2)}</p>
                 </div>
                 <div className="space-y-1">
                   <Label className="text-xs text-muted-foreground">GST</Label>
                   <p className="font-medium">${calculatedAmounts.gst.toFixed(2)}</p>
                 </div>
                 <div className="space-y-1">
                   <Label className="text-xs text-muted-foreground">Total</Label>
                   <p className="font-semibold text-lg">${calculatedAmounts.total.toFixed(2)}</p>
                 </div>
               </div>
             </div>
 
             {/* Additional Info Section */}
             <div className="space-y-4">
               <h3 className="text-sm font-semibold border-b pb-2">Additional Information</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="payment_ref">Payment Reference</Label>
                   <Input
                     id="payment_ref"
                     value={draftInvoice.payment_ref}
                     onChange={(e) => updateField("payment_ref", e.target.value)}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="supplier_email">Supplier Email</Label>
                   <Input
                     id="supplier_email"
                     type="email"
                     value={draftInvoice.supplier_email_on_invoice}
                     onChange={(e) => updateField("supplier_email_on_invoice", e.target.value)}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="supplier_abn">Supplier ABN</Label>
                   <Input
                     id="supplier_abn"
                     value={draftInvoice.supplier_abn}
                     onChange={(e) => updateField("supplier_abn", e.target.value)}
                   />
                 </div>
               </div>
             </div>
 
             {/* File Upload Section */}
             <div className="space-y-4">
               <h3 className="text-sm font-semibold border-b pb-2">
                 Invoice Document <span className="text-destructive">*</span>
               </h3>
               <div
                 className={`border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                   dragOver ? "border-primary bg-primary/5" : 
                   fileData ? "border-success bg-success/5" : 
                   validationErrors.file ? "border-destructive" : "border-muted-foreground/25"
                 }`}
                 onDrop={handleDrop}
                 onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                 onDragLeave={() => setDragOver(false)}
                 onClick={() => !fileData && fileInputRef.current?.click()}
               >
                 {!fileData ? (
                   <div className="space-y-4 text-center p-8">
                     <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
                     <div>
                       <p className="text-sm font-medium">Drop PDF or JPEG here</p>
                       <p className="text-xs text-muted-foreground">or click to browse</p>
                     </div>
                     <input
                       ref={fileInputRef}
                       type="file"
                       accept="application/pdf,image/jpeg,image/jpg"
                       onChange={handleFileSelect}
                       className="hidden"
                     />
                   </div>
                 ) : (
                   <div className="flex items-center justify-between p-4">
                     <div className="flex items-center gap-3">
                       {fileName.toLowerCase().endsWith('.pdf') ? (
                         <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center">
                           <FileText className="h-5 w-5 text-red-600" />
                         </div>
                       ) : (
                         <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                           <ImageIcon className="h-5 w-5 text-blue-600" />
                         </div>
                       )}
                       <div>
                         <p className="text-sm font-medium">{fileName}</p>
                         <p className="text-xs text-muted-foreground">Ready for upload</p>
                       </div>
                     </div>
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       onClick={(e) => { e.stopPropagation(); clearFile(); }}
                     >
                       <X className="h-4 w-4" />
                     </Button>
                   </div>
                 )}
               </div>
               {validationErrors.file && (
                 <p className="text-xs text-destructive flex items-center gap-1">
                   <AlertCircle className="h-3 w-3" />
                   {validationErrors.file}
                 </p>
               )}
             </div>
           </div>
         </DialogContent>
       </Dialog>
 
       {/* Unsaved Changes Confirmation */}
       <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Discard changes?</AlertDialogTitle>
             <AlertDialogDescription>
               You have unsaved changes. Are you sure you want to close without saving?
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Continue Editing</AlertDialogCancel>
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