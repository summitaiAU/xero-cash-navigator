import { FileText, Image, File, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { EmailAttachment } from "@/services/emailReviewService";
import { Badge } from "@/components/ui/badge";

interface MobileReviewAttachmentBarProps {
  attachments: EmailAttachment[];
  onAttachmentClick: (attachmentId: string) => void;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return <Image className="h-4 w-4" />;
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "review":
      return "bg-red-100 border-red-300 text-red-700";
    case "completed":
      return "bg-green-100 border-green-300 text-green-700";
    case "processing":
      return "bg-amber-100 border-amber-300 text-amber-700";
    default:
      return "bg-gray-100 border-gray-300 text-gray-700";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "review":
      return <AlertCircle className="h-3 w-3" />;
    case "completed":
      return <CheckCircle className="h-3 w-3" />;
    case "processing":
      return <Clock className="h-3 w-3" />;
    default:
      return null;
  }
};

const truncateFilename = (filename: string, maxLength: number = 20): string => {
  if (filename.length <= maxLength) return filename;
  
  const extension = filename.split('.').pop() || '';
  const nameWithoutExt = filename.slice(0, filename.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 4) + '...';
  
  return `${truncatedName}.${extension}`;
};

export const MobileReviewAttachmentBar = ({
  attachments,
  onAttachmentClick,
}: MobileReviewAttachmentBarProps) => {
  return (
    <div className="sticky bottom-0 z-40 bg-card border-t border-border shadow-lg pb-safe">
      <div className="px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Attachments ({attachments.length})
        </p>
        
        {/* Horizontal scroll container */}
        <div 
          className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {attachments.map((attachment) => (
            <button
              key={attachment.id}
              onClick={() => onAttachmentClick(attachment.id)}
              className={`
                min-w-[140px] h-20 snap-start flex-shrink-0
                border-2 rounded-lg p-2
                hover:shadow-md transition-all
                ${getStatusColor(attachment.status)}
              `}
            >
              <div className="flex flex-col h-full justify-between">
                {/* Top: Icon + Filename */}
                <div className="flex items-start gap-2">
                  {getFileIcon(attachment.mime_type)}
                  <p className="text-xs font-medium line-clamp-2 text-left flex-1">
                    {truncateFilename(attachment.filename)}
                  </p>
                </div>

                {/* Bottom: Status Badge */}
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="secondary" 
                    className="text-xs h-5 px-1.5 bg-white/50"
                  >
                    {getStatusIcon(attachment.status)}
                    <span className="ml-1">
                      {attachment.status === "review" ? "Flagged" : 
                       attachment.status === "completed" ? "Added" : 
                       attachment.status}
                    </span>
                  </Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
