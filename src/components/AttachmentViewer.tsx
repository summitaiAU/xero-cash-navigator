import { useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, Copy, Download, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { fetchAttachmentById, EmailAttachment } from "@/services/emailReviewService";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AttachmentViewerProps {
  attachmentId: string | null;
  onClose: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const downloadBase64 = (filename: string, mime: string, b64: string) => {
  try {
    const byteChars = atob(b64);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
    const byteArray = new Uint8Array(byteNums);
    const blob = new Blob([byteArray], { type: mime || "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename || "attachment";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("Download failed:", error);
    toast({
      title: "Download Failed",
      description: "Unable to download the file. Please try again.",
      variant: "destructive",
    });
  }
};

export const AttachmentViewer = ({ attachmentId, onClose }: AttachmentViewerProps) => {
  const [attachment, setAttachment] = useState<EmailAttachment | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

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

  useEffect(() => {
    if (attachmentId) {
      loadAttachment();
      setZoom(100);
      setRotation(0);
    } else {
      setAttachment(null);
    }
  }, [attachmentId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!attachmentId) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "=" || e.key === "+") {
        setZoom((prev) => Math.min(prev + 25, 200));
      } else if (e.key === "-") {
        setZoom((prev) => Math.max(prev - 25, 50));
      } else if (e.key === "r" || e.key === "R") {
        setRotation((prev) => (prev + 90) % 360);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [attachmentId, onClose]);

  const getEffectiveMime = () => {
    if (!attachment) return "";
    return attachment.mime_detected || attachment.mime_type;
  };

  const getViewerKind = () => {
    if (!attachment) return "";
    if (attachment.viewer_kind) return attachment.viewer_kind;

    const mime = getEffectiveMime();
    if (mime.startsWith("application/pdf")) return "pdf";
    if (mime.startsWith("image/")) return "image";
    if (mime === "text/html") return "html";
    if (mime.startsWith("text/")) return "text";
    if (mime === "message/rfc822") return "eml";
    return "unknown";
  };

  const renderViewer = () => {
    if (!attachment) return null;

    const kind = getViewerKind();
    const effectiveMime = getEffectiveMime();

    // Non-previewable state
    if (attachment.previewable === false) {
      return (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <h3 className="text-lg font-semibold text-muted-foreground">Preview not available</h3>
          <p className="text-sm text-muted-foreground max-w-md text-center">
            {attachment.unsupported_reason || "This file type cannot be previewed in the browser."}
          </p>
          {attachment.data_base64url && (
            <Button
              onClick={() =>
                downloadBase64(attachment.filename, effectiveMime, attachment.data_base64url!)
              }
            >
              <Download className="w-4 h-4 mr-2" />
              Download File
            </Button>
          )}
        </div>
      );
    }

    // PDF viewer
    if (kind === "pdf") {
      if (!attachment.data_base64url) {
        return (
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            No binary data available for preview
          </div>
        );
      }

      return (
        <div className="w-full h-[600px]">
          <iframe
            src={`data:application/pdf;base64,${attachment.data_base64url}`}
            className="w-full h-full border-0"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
            title={attachment.filename}
          />
        </div>
      );
    }

    // Image viewer
    if (kind === "image") {
      if (!attachment.data_base64url) {
        return (
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            No image data available
          </div>
        );
      }

      return (
        <div className="flex items-center justify-center min-h-96 p-4">
          <img
            src={`data:${effectiveMime};base64,${attachment.data_base64url}`}
            alt={attachment.filename}
            className="max-w-full h-auto"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transition: "transform 0.2s ease",
            }}
          />
        </div>
      );
    }

    // HTML viewer
    if (kind === "html") {
      const htmlContent = attachment.safe_html || (attachment.data_base64url ? atob(attachment.data_base64url) : "");

      if (!htmlContent) {
        return (
          <div className="p-4 text-muted-foreground">
            {attachment.text_excerpt || "No HTML content available"}
          </div>
        );
      }

      return (
        <div
          className="prose prose-sm max-w-none p-4 overflow-auto max-h-[600px]"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      );
    }

    // Plain text viewer
    if (kind === "text") {
      const textContent = attachment.data_base64url ? atob(attachment.data_base64url) : attachment.text_excerpt || "";

      return (
        <div className="relative">
          <div className="absolute top-2 right-2 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(textContent);
                toast({ title: "Copied", description: "Text copied to clipboard" });
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
          <pre className="p-4 bg-muted rounded-lg overflow-auto max-h-[600px] text-sm font-mono whitespace-pre-wrap">
            {textContent}
          </pre>
        </div>
      );
    }

    // EML viewer
    if (kind === "eml") {
      return (
        <Tabs defaultValue="preview" className="w-full">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="mt-4">
            {attachment.safe_html ? (
              <div
                className="prose prose-sm max-w-none p-4 overflow-auto max-h-[600px]"
                dangerouslySetInnerHTML={{ __html: attachment.safe_html }}
              />
            ) : attachment.text_excerpt ? (
              <pre className="p-4 bg-muted rounded-lg overflow-auto max-h-[600px] text-sm font-mono whitespace-pre-wrap">
                {attachment.text_excerpt}
              </pre>
            ) : (
              <div className="p-4 text-muted-foreground">No preview available</div>
            )}
          </TabsContent>
          <TabsContent value="headers" className="mt-4">
            <pre className="p-4 bg-muted rounded-lg overflow-auto max-h-[600px] text-xs font-mono">
              {JSON.stringify(attachment.eml_headers, null, 2)}
            </pre>
          </TabsContent>
        </Tabs>
      );
    }

    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Unsupported file type
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold truncate">
                {loading ? <Skeleton className="h-6 w-64" /> : attachment?.filename || "Attachment"}
              </DialogTitle>
              {!loading && attachment && (
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Badge variant={getStatusColor()}>{attachment.status}</Badge>
                  <span>•</span>
                  <span>{getEffectiveMime()}</span>
                  <span>•</span>
                  <span>{formatFileSize(attachment.size_bytes)}</span>
                  <span>•</span>
                  <span>{format(new Date(attachment.created_at), "MMM d, yyyy h:mm a")}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {attachment?.data_base64url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadBase64(
                      attachment.filename,
                      getEffectiveMime(),
                      attachment.data_base64url!
                    )
                  }
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={loadAttachment}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {!loading && attachment && (getViewerKind() === "pdf" || getViewerKind() === "image") && (
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom((prev) => Math.max(prev - 25, 50))}
                disabled={zoom <= 50}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-16 text-center">{zoom}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom((prev) => Math.min(prev + 25, 200))}
                disabled={zoom >= 200}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              {getViewerKind() === "image" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="ml-2"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Rotate
                </Button>
              )}
            </div>
          )}

          {!loading && attachment && (attachment.error_code || attachment.error_message) && (
            <Collapsible className="mt-2">
              <CollapsibleTrigger className="text-sm text-destructive hover:underline">
                View Errors
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
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
