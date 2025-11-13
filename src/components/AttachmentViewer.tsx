import { useEffect, useState } from "react";
import { Download, RefreshCw, Plus, X, AlertCircle, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { fetchAttachmentById, EmailAttachment } from "@/services/emailReviewService";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { checkAndMarkEmailReviewed } from "@/services/emailReviewCompletionService";
import { formatDateTimeShortSydney } from "@/lib/dateUtils";

interface AttachmentViewerProps {
  attachmentId: string | null;
  onClose: () => void;
  onAddInvoice?: (attachment: EmailAttachment) => void;
  onAttachmentUpdated?: () => void;
}

// Whitelist of supported attachment types
const SUPPORTED_TYPES = {
  pdf: ["application/pdf"],
  image: ["image/jpeg", "image/png", "image/gif"],
  eml: ["message/rfc822"],
};

const isSupportedType = (mimeType: string): boolean => {
  const allTypes = [...SUPPORTED_TYPES.pdf, ...SUPPORTED_TYPES.image, ...SUPPORTED_TYPES.eml];
  return allTypes.includes(mimeType);
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Convert base64url to base64
const base64urlToBase64 = (base64url: string): string => {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return base64;
};

// Safari/iOS detection
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// Create a Blob URL from base64url data
const createBlobUrl = (base64url: string, mimeType: string): string => {
  const base64 = base64urlToBase64(base64url);
  const byteChars = atob(base64);
  const byteNums = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNums[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNums);
  const blob = new Blob([byteArray], { type: mimeType });
  return URL.createObjectURL(blob);
};

export const AttachmentViewer = ({ attachmentId, onClose, onAddInvoice, onAttachmentUpdated }: AttachmentViewerProps) => {
  // Early return if no attachment selected - prevents render flash during navigation
  if (!attachmentId) return null;
  
  const isMobile = useIsMobile();
  const [attachment, setAttachment] = useState<EmailAttachment | null>(null);
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobError, setBlobError] = useState(false);

  const loadAttachment = async () => {
    if (!attachmentId) return;

    setLoading(true);
    const { data, error } = await fetchAttachmentById(attachmentId);

    if (error) {
      console.error("Failed to load attachment:", error);
      toast({
        title: "Error",
        description: "Unable to load attachment. Please retry.",
        variant: "destructive",
      });
    } else {
      setAttachment(data);
    }

    setLoading(false);
  };

  // Cleanup blob URL when attachment changes or component unmounts
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  useEffect(() => {
    if (attachmentId) {
      loadAttachment();
      setBlobUrl(null);
      setBlobError(false);
    } else {
      setAttachment(null);
      setBlobUrl(null);
      setBlobError(false);
    }
  }, [attachmentId]);

  // Create Blob URL when attachment data changes
  useEffect(() => {
    if (!attachment || !attachment.data_base64url) {
      setBlobUrl(null);
      return;
    }

    const kind = getViewerKind();
    if (kind !== "pdf" && kind !== "image") {
      setBlobUrl(null);
      return;
    }

    try {
      const url = createBlobUrl(attachment.data_base64url, attachment.mime_type);
      setBlobUrl(url);
      setBlobError(false);
    } catch (error) {
      console.error("Failed to create Blob URL:", error);
      setBlobError(true);
      toast({
        title: "Error",
        description: "Failed to render preview. Please download the file instead.",
        variant: "destructive",
      });
    }
  }, [attachment?.id, attachment?.data_base64url]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!attachmentId) return;

      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [attachmentId, onClose]);

  const getViewerKind = (): string => {
    if (!attachment) return "unsupported";
    
    const mime = attachment.mime_type.toLowerCase();
    
    // Check whitelist first
    if (mime === "application/pdf") return "pdf";
    if (mime === "image/jpeg" || mime === "image/png" || mime === "image/gif") return "image";
    if (mime === "message/rfc822") return "eml";
    
    return "unsupported";
  };

  const handleDownload = () => {
    if (!attachment || !attachment.data_base64url) return;

    try {
      const base64 = base64urlToBase64(attachment.data_base64url);
      const byteChars = atob(base64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNums);
      const blob = new Blob([byteArray], { type: attachment.mime_type });
      
      // iOS Safari fallback - no download attribute support
      if (isIOS) {
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        // Delay revoke for iOS
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        return;
      }
      
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = attachment.filename || "attachment";
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Delay revoke for Safari
      if (isSafari) {
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      } else {
        URL.revokeObjectURL(link.href);
      }
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download Failed",
        description: "Unable to download the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleIgnore = async () => {
    if (!attachment) return;
    
    try {
      const { error } = await supabase
        .from('email_attachments' as any)
        .update({
          status: 'completed',
          review_added: false,
          attachment_added_at: new Date().toISOString(),
        })
        .eq('id', attachment.id);
      
      if (error) throw error;
      
      toast({
        title: "Attachment Ignored",
        description: "This attachment has been marked as ignored.",
      });
      
      // Check if email is fully reviewed
      await checkAndMarkEmailReviewed(attachment.email_id);
      
      onAttachmentUpdated?.();
      onClose();
    } catch (error) {
      console.error("Failed to ignore attachment:", error);
      toast({
        title: "Error",
        description: "Failed to ignore attachment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderViewer = () => {
    if (!attachment) return null;

    const kind = getViewerKind();

    // Handle unsupported file types
    if (kind === "unsupported" || attachment.previewable === false) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 bg-muted/20 rounded-lg">
          <h3 className="text-lg font-semibold text-muted-foreground">Preview not available for this file type</h3>
          <p className="text-sm text-muted-foreground max-w-md text-center">
            {attachment.unsupported_reason || attachment.error_message || `Unsupported file type (${attachment.mime_type})`}
          </p>
          <div className="text-xs text-muted-foreground space-y-1 text-center">
            <div>{attachment.filename}</div>
            <div>{attachment.mime_type} • {formatFileSize(attachment.size_bytes)}</div>
          </div>
          {attachment.data_base64url && (
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download File
            </Button>
          )}
        </div>
      );
    }

    // No data available (still loading or missing)
    if (!attachment.data_base64url && !attachment.safe_html) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-muted-foreground">
          {loading ? (
            <>
              <RefreshCw className="w-8 h-8 animate-spin" />
              <p>Loading preview data...</p>
            </>
          ) : (
            <>
              <p>No preview available. Try Download.</p>
              <Button onClick={handleDownload} variant="outline" disabled={!attachment.data_base64url}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </>
          )}
        </div>
      );
    }

    // PDF viewer
    if (kind === "pdf") {
      if (!attachment.data_base64url) {
        return (
          <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
            No PDF data available for preview
          </div>
        );
      }

      if (blobError) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-destructive">
            <p>Failed to render PDF preview</p>
            <Button onClick={handleDownload} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        );
      }

      // iOS Safari - Show open button instead of embed
      if (isIOS && blobUrl) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 bg-slate-50 border border-slate-200 rounded-xl p-8">
            <div className="text-center">
              <h3 className="text-base font-semibold mb-2">PDF Preview</h3>
              <p className="text-sm text-muted-foreground">
                PDF preview is not supported on iOS. Open in a new tab to view.
              </p>
            </div>
            <Button 
              onClick={() => window.open(blobUrl, "_blank")} 
              size="lg"
              className="h-12 px-8"
            >
              <Download className="w-4 h-4 mr-2" />
              Open PDF
            </Button>
          </div>
        );
      }

      return (
        <div className="w-full bg-white rounded-lg shadow-sm" style={{ minHeight: "70vh", overflow: "auto", WebkitOverflowScrolling: "touch" }}>
          {blobUrl ? (
            isSafari ? (
              // Desktop Safari - use object tag
              <object
                data={blobUrl}
                type="application/pdf"
                className="w-full border-0 rounded-lg"
                style={{ minHeight: "70vh", width: "100%" }}
              >
                <div className="flex flex-col items-center justify-center p-8 gap-4">
                  <p className="text-muted-foreground">Unable to display PDF in browser</p>
                  <Button onClick={() => window.open(blobUrl, "_blank")} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                </div>
              </object>
            ) : (
              // Chrome/Firefox - use iframe
              <iframe
                src={blobUrl}
                className="w-full border-0 rounded-lg"
                style={{ minHeight: "70vh", width: "100%" }}
                title={attachment.filename}
                onError={() => {
                  setBlobError(true);
                  toast({
                    title: "Error",
                    description: "Failed to load PDF. Try Download.",
                    variant: "destructive",
                  });
                }}
              />
            )
          ) : (
            <div className="flex items-center justify-center" style={{ minHeight: "70vh" }}>
              <Skeleton className="w-full h-full" />
            </div>
          )}
        </div>
      );
    }

    // Image viewer
    if (kind === "image") {
      if (!attachment.data_base64url) {
        return (
          <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
            No image data available
          </div>
        );
      }

      if (blobError) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-destructive">
            <p>Failed to render image preview</p>
            <Button onClick={handleDownload} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Image
            </Button>
          </div>
        );
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-8 bg-slate-50 border border-slate-200 rounded-xl overflow-auto" style={{ WebkitOverflowScrolling: "touch" }}>
          {blobUrl ? (
            <img
              src={blobUrl}
              alt={attachment.filename}
              className="max-w-full h-auto rounded-lg shadow-sm"
              onError={() => {
                setBlobError(true);
                toast({
                  title: "Error",
                  description: "Failed to load image. Try Download.",
                  variant: "destructive",
                });
              }}
            />
          ) : (
            <Skeleton className="w-96 h-96" />
          )}
        </div>
      );
    }

    // EML viewer
    if (kind === "eml") {
      return (
        <Tabs defaultValue="preview" className="w-full">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="raw">Raw Text</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="mt-4">
            {attachment.safe_html ? (
              <div
                className="prose prose-sm max-w-none p-6 overflow-auto bg-white rounded-lg shadow-sm border"
                style={{ minHeight: "400px", maxHeight: "70vh" }}
                dangerouslySetInnerHTML={{ __html: attachment.safe_html }}
              />
            ) : attachment.text_excerpt ? (
              <pre className="p-6 bg-muted rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap border" style={{ minHeight: "400px", maxHeight: "70vh" }}>
                {attachment.text_excerpt}
              </pre>
            ) : (
              <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
                No EML preview available
              </div>
            )}
          </TabsContent>
          <TabsContent value="raw" className="mt-4">
            <pre className="p-6 bg-muted rounded-lg overflow-auto text-xs font-mono border" style={{ minHeight: "400px", maxHeight: "70vh" }}>
              {attachment.text_excerpt || "No raw text available"}
            </pre>
          </TabsContent>
        </Tabs>
      );
    }

    // Fallback for any edge case
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-muted-foreground">
        <p>Unable to display this attachment</p>
        {attachment.data_base64url && (
          <Button onClick={handleDownload} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        )}
      </div>
    );
  };

  const getStatusColor = () => {
    if (!attachment) return "secondary";
    if (attachment.status === "review") return "destructive";
    if (attachment.status === "completed" && !attachment.error_code) return "default";
    return "secondary";
  };

  // Mobile: Render custom overlay without Dialog wrapper
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={onClose}>
        <div 
          className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
            {/* Row 1: Title Bar with Close Button */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-slate-200">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onClose}
                className="h-10 w-10 -ml-2"
              >
                <X className="h-5 w-5" />
              </Button>
              
              <h2 className="flex-1 text-center text-sm font-semibold truncate px-2">
                {loading ? <Skeleton className="h-5 w-48 mx-auto" /> : attachment?.filename || "Attachment"}
              </h2>
              
              <div className="w-10" /> {/* Spacer for centering */}
            </div>

            {/* Row 2: Metadata Section */}
            {!loading && attachment && (
              <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-200">
                <div className="mb-2">
                  <Badge variant={getStatusColor()} className="text-xs">
                    {attachment.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  <span className="text-muted-foreground font-medium">Type:</span>
                  <span className="text-foreground">{attachment.mime_type}</span>
                  
                  <span className="text-muted-foreground font-medium">Size:</span>
                  <span className="text-foreground font-mono">{formatFileSize(attachment.size_bytes)}</span>
                  
                  <span className="text-muted-foreground font-medium">Date:</span>
                  <span className="text-foreground">{formatDateTimeShortSydney(attachment.created_at)}</span>
                </div>
              </div>
            )}

            {/* Row 3: Actions */}
            {!loading && attachment && (
              <div className="px-4 py-3 bg-white border-b border-slate-200">
                {/* Primary Action */}
                {attachment.status === "review" && onAddInvoice ? (
                  <Button 
                    onClick={() => onAddInvoice(attachment)}
                    className="w-full h-11 mb-2 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add as Invoice
                  </Button>
                ) : attachment.data_base64url ? (
                  <Button 
                    onClick={handleDownload}
                    variant="outline"
                    className="w-full h-11 mb-2"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                ) : null}

                {/* Secondary Actions */}
                <div className="flex items-center justify-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={loadAttachment}
                    className="h-10 w-10"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  
                  {attachment.status === "review" && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={handleIgnore}
                      className="h-10 w-10 text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {attachment.data_base64url && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        if (blobUrl) {
                          window.open(blobUrl, "_blank");
                        } else {
                          handleDownload();
                        }
                      }}
                      className="h-10 w-10"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Error Section */}
            {!loading && attachment && (attachment.error_code || attachment.error_message) && attachment.status === "review" && (
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
                <Collapsible>
                  <CollapsibleTrigger className="text-sm text-amber-700 hover:text-amber-800 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4" />
                    View Details
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 p-3 bg-amber-100/50 border border-amber-200 rounded-lg text-xs">
                    {attachment.error_code && (
                      <div className="mb-1">
                        <span className="font-semibold">Error Code:</span> {attachment.error_code}
                      </div>
                    )}
                    {attachment.error_message && (
                      <div>
                        <span className="font-semibold">Message:</span> {attachment.error_message}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4" style={{ WebkitOverflowScrolling: "touch" }}>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-96 w-full" />
                </div>
              ) : attachment ? (
                renderViewer()
              ) : (
                <div className="flex items-center justify-center h-96 text-muted-foreground">
                  Select an attachment to preview
                </div>
              )}
            </div>
          </div>
        </div>
    );
  }

  // Desktop: Use Dialog component
  return (
    <Dialog open={!!attachmentId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col bg-white">
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0 text-center">
              <DialogTitle className="text-base font-semibold truncate">
                {loading ? <Skeleton className="h-5 w-64 mx-auto" /> : attachment?.filename || "Attachment"}
              </DialogTitle>
              {!loading && attachment && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Badge variant={getStatusColor()} className="text-xs">{attachment.status}</Badge>
                  <span>•</span>
                  <span>{attachment.mime_type}</span>
                  <span>•</span>
                  <span>{formatFileSize(attachment.size_bytes)}</span>
                  <span>•</span>
                  <span>{formatDateTimeShortSydney(attachment.created_at)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-3">
            {attachment?.data_base64url && (
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-3 h-3 mr-1" />
                <span className="text-xs">Download</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={loadAttachment} aria-label="Refresh">
              <RefreshCw className="w-3 h-3" />
              <span className="sr-only">Refresh</span>
            </Button>
            {attachment && attachment.status === "review" && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleIgnore}
                  className="border-muted-foreground/20 text-muted-foreground hover:bg-muted"
                >
                  <X className="w-3 h-3 mr-1" />
                  <span className="text-xs">Ignore</span>
                </Button>
                {onAddInvoice && (
                  <Button variant="default" size="sm" onClick={() => onAddInvoice(attachment)}>
                    <Plus className="w-3 h-3 mr-1" />
                    <span className="text-xs">Add Invoice</span>
                  </Button>
                )}
              </>
            )}
          </div>

          {!loading && attachment && (attachment.error_code || attachment.error_message) && attachment.status === "review" && (
            <Collapsible className="mt-2">
              <CollapsibleTrigger className="text-sm text-destructive hover:underline flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                View Errors
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg animate-in slide-in-from-top-2">
                {attachment.error_code && (
                  <div className="text-sm">
                    <span className="font-semibold">Error Code:</span> {attachment.error_code}
                  </div>
                )}
                {attachment.error_message && (
                  <div className="text-sm mt-1">
                    <span className="font-semibold">Message:</span> {attachment.error_message}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : attachment ? (
            renderViewer()
          ) : (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              Select an attachment to preview
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttachmentViewer;
