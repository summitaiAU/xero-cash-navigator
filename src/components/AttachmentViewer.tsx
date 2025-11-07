import { useEffect, useState } from "react";
import { ZoomIn, ZoomOut, Download, RefreshCw, Plus, X, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { fetchAttachmentById, EmailAttachment } from "@/services/emailReviewService";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { checkAndMarkEmailReviewed } from "@/services/emailReviewCompletionService";

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
  const [attachment, setAttachment] = useState<EmailAttachment | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(100);
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
      setZoom(100);
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
      } else if (e.key === "=" || e.key === "+") {
        setZoom((prev) => Math.min(prev + 25, 200));
      } else if (e.key === "-") {
        setZoom((prev) => Math.max(prev - 25, 50));
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
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = attachment.filename || "attachment";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
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

      return (
        <div className="w-full bg-white rounded-lg shadow-sm" style={{ minHeight: "70vh", overflow: "auto" }}>
          {blobUrl ? (
            <iframe
              src={`${blobUrl}#zoom=${zoom}`}
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
        <div className="flex items-center justify-center min-h-[400px] p-8 bg-muted/10 rounded-lg overflow-auto">
          {blobUrl ? (
            <img
              src={blobUrl}
              alt={attachment.filename}
              className="max-w-full h-auto rounded shadow-sm"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "center",
                transition: "transform 0.2s ease",
              }}
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
                  <span>{format(new Date(attachment.created_at), "MMM d, yyyy h:mm a")}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {!loading && attachment && (getViewerKind() === "pdf" || getViewerKind() === "image") && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom((prev) => Math.max(prev - 25, 50))}
                    disabled={zoom <= 50}
                    title="Zoom out (-)"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </Button>
                  <span className="text-xs text-muted-foreground w-12 text-center">{zoom}%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom((prev) => Math.min(prev + 25, 200))}
                    disabled={zoom >= 200}
                    title="Zoom in (+)"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(100)}
                    disabled={zoom === 100}
                    className="text-xs"
                  >
                    100%
                  </Button>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {attachment?.data_base64url && (
                <Button variant="outline" size="sm" onClick={handleDownload} title="Download">
                  <Download className="w-3 h-3 mr-1" />
                  <span className="text-xs">Download</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={loadAttachment} title="Refresh">
                <RefreshCw className="w-3 h-3" />
              </Button>
              {attachment && attachment.status === "review" && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleIgnore}
                    title="Ignore this attachment"
                    className="border-muted-foreground/20 text-muted-foreground hover:bg-muted"
                  >
                    <X className="w-3 h-3 mr-1" />
                    <span className="text-xs">Ignore</span>
                  </Button>
                  {onAddInvoice && (
                    <Button variant="default" size="sm" onClick={() => onAddInvoice(attachment)} title="Add Invoice">
                      <Plus className="w-3 h-3 mr-1" />
                      <span className="text-xs">Add Invoice</span>
                    </Button>
                  )}
                </>
              )}
            </div>
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
