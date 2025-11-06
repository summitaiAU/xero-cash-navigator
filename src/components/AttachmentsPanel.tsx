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
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Select an email to view attachments</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
            <Skeleton className="w-10 h-10 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">No attachments found for this email.</p>
      </div>
    );
  }

  const categorized = categorizeAttachments(attachments);

  const renderAttachmentTile = (attachment: EmailAttachment, category: "flagged" | "added" | "neutral") => {
    const borderColor = {
      flagged: "border-l-red-600",
      added: "border-l-green-600",
      neutral: "border-l-gray-400",
    }[category];

    const StatusIcon = {
      flagged: AlertCircle,
      added: CheckCircle,
      neutral: Clock,
    }[category];

    const statusColor = {
      flagged: "text-red-600",
      added: "text-green-600",
      neutral: "text-gray-400",
    }[category];

    const isSelected = selectedAttachment?.id === attachment.id;

    return (
      <button
        key={attachment.id}
        onClick={() => {
          setSelectedAttachment(attachment);
          onAttachmentClick?.(attachment);
        }}
        className={`w-full flex items-center gap-3 p-3 border ${borderColor} border-l-4 rounded-lg hover:bg-accent transition-colors text-left group ${
          isSelected ? "bg-accent ring-2 ring-primary" : ""
        }`}
        title={attachment.unsupported_reason || undefined}
      >
        <div className="text-2xl flex-shrink-0">
          {getFileIcon(attachment.mime_type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">
            {attachment.filename}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>{formatFileSize(attachment.size_bytes)}</span>
            <span>•</span>
            <span>{format(new Date(attachment.created_at), "MMM d, h:mm a")}</span>
          </div>
          {attachment.unsupported_reason && (
            <div className="text-xs text-muted-foreground mt-1 italic truncate">
              {attachment.unsupported_reason}
            </div>
          )}
        </div>
        <StatusIcon className={`w-5 h-5 flex-shrink-0 ${statusColor}`} />
      </button>
    );
  };

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      {selectedAttachment && onAddInvoice && (
        <div className="p-4 border-b bg-muted/30">
          <Button
            onClick={() => onAddInvoice(selectedAttachment)}
            className="w-full gap-2"
            variant="default"
          >
            <Plus className="h-4 w-4" />
            Add Invoice
          </Button>
        </div>
      )}
      <div className="flex-1 p-4 space-y-6">
        {categorized.flagged.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Flagged ({categorized.flagged.length})
            </h3>
            <div className="space-y-2">
              {categorized.flagged.map((att) => renderAttachmentTile(att, "flagged"))}
            </div>
          </div>
        )}

        {categorized.added.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-green-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Added ({categorized.added.length})
            </h3>
            <div className="space-y-2">
              {categorized.added.map((att) => renderAttachmentTile(att, "added"))}
            </div>
          </div>
        )}

        {categorized.neutral.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Neutral ({categorized.neutral.length})
            </h3>
            <div className="space-y-2">
              {categorized.neutral.map((att) => renderAttachmentTile(att, "neutral"))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttachmentsPanel;
