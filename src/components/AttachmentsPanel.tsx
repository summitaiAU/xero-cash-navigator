import { useEffect, useState } from "react";
import { FileIcon, AlertCircle, CheckCircle, Clock, Plus } from "lucide-react";
import { fetchEmailAttachments, EmailAttachment } from "@/services/emailReviewService";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AttachmentsPanelProps {
  emailId: string | null;
  onAttachmentClick?: (attachment: EmailAttachment) => void;
  onAddInvoice?: (attachment: EmailAttachment) => void;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("document") || mimeType.includes("word")) return "📝";
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return "🗜️";
  return "📎";
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface CategorizedAttachments {
  flagged: EmailAttachment[];
  added: EmailAttachment[];
  neutral: EmailAttachment[];
}

const categorizeAttachments = (attachments: EmailAttachment[]): CategorizedAttachments => {
  const flagged: EmailAttachment[] = [];
  const added: EmailAttachment[] = [];
  const neutral: EmailAttachment[] = [];

  for (const att of attachments) {
    if (att.status === "review") {
      flagged.push(att);
    } else if (att.status === "completed" && !att.error_code) {
      added.push(att);
    } else if (att.status === "completed" && att.error_code) {
      neutral.push(att);
    }
  }

  return { flagged, added, neutral };
};

export const AttachmentsPanel = ({ emailId, onAttachmentClick, onAddInvoice }: AttachmentsPanelProps) => {
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<EmailAttachment | null>(null);

  useEffect(() => {
    if (!emailId) {
      setAttachments([]);
      return;
    }

    const loadAttachments = async () => {
      setLoading(true);
      const { data, error } = await fetchEmailAttachments(emailId);
      
      if (error) {
        console.error("Failed to load attachments:", error);
        toast({
          title: "Error",
          description: "Unable to load attachments for this email.",
          variant: "destructive",
        });
      } else {
        setAttachments(data);
      }
      
      setLoading(false);
    };

    loadAttachments();
  }, [emailId]);

  if (!emailId) {
    return (
      <div className="flex items-center justify-center h-full text-center px-6">
        <div>
          <p className="text-sm text-muted-foreground">Select an email to view attachments</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2.5 px-4 py-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="review-attachment-card">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-10 h-10 rounded flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center px-6">
        <div className="review-attachment-card max-w-xs">
          <p className="text-sm text-muted-foreground">No attachments detected</p>
        </div>
      </div>
    );
  }

  const categorized = categorizeAttachments(attachments);

  const renderAttachmentTile = (attachment: EmailAttachment, category: "flagged" | "added" | "neutral") => {
  const dotClass = {
    flagged: "status-dot flagged",
    added: "status-dot added",
    neutral: "status-dot neutral",
  }[category];

    const isSelected = selectedAttachment?.id === attachment.id;

    return (
      <button
        key={attachment.id}
        onClick={() => {
          setSelectedAttachment(attachment);
          onAttachmentClick?.(attachment);
        }}
        className={`review-attachment-card w-full ${
          isSelected ? "ring-2 ring-primary" : ""
        }`}
        title={attachment.unsupported_reason || undefined}
      >
        <div className="flex items-center gap-2.5">
          {/* Thumbnail */}
          <div className="w-10 h-10 flex-shrink-0 rounded bg-muted flex items-center justify-center text-xl">
            {getFileIcon(attachment.mime_type)}
          </div>
          
          {/* File Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={dotClass}></span>
              <span className="font-medium text-xs truncate">
                {attachment.filename}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span>{formatFileSize(attachment.size_bytes)}</span>
              <span>•</span>
              <span>{format(new Date(attachment.created_at), "MMM d")}</span>
              <span>•</span>
              <span>{format(new Date(attachment.created_at), "h:mm a")}</span>
            </div>
            {attachment.unsupported_reason && (
              <div className="text-[10px] text-muted-foreground mt-0.5 italic truncate">
                {attachment.unsupported_reason}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-3 space-y-4">
        {categorized.flagged.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-destructive uppercase tracking-wide px-1">
              Flagged · {categorized.flagged.length}
            </h3>
            <div className="space-y-2">
              {categorized.flagged.map((att) => renderAttachmentTile(att, "flagged"))}
            </div>
          </div>
        )}

        {categorized.added.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-success uppercase tracking-wide px-1">
              Added · {categorized.added.length}
            </h3>
            <div className="space-y-2">
              {categorized.added.map((att) => renderAttachmentTile(att, "added"))}
            </div>
          </div>
        )}

        {categorized.neutral.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
              Neutral · {categorized.neutral.length}
            </h3>
            <div className="space-y-2">
              {categorized.neutral.map((att) => renderAttachmentTile(att, "neutral"))}
            </div>
          </div>
        )}
      </div>
  );
};

export default AttachmentsPanel;
