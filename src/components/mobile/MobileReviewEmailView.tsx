import { useEffect, useRef } from "react";
import { EmailListItem, EmailContent, EmailAttachment } from "@/services/emailReviewService";
import { EmailConversationView } from "@/components/EmailConversationView";
import { MobileReviewHeader } from "./MobileReviewHeader";
import { MobileReviewAttachmentBar } from "./MobileReviewAttachmentBar";

interface MobileReviewEmailViewProps {
  email: EmailListItem;
  emailContent: EmailContent | null;
  attachments: EmailAttachment[];
  loading: boolean;
  onBack: () => void;
  onAttachmentClick: (attachmentId: string) => void;
}

export const MobileReviewEmailView = ({
  email,
  emailContent,
  attachments,
  loading,
  onBack,
  onAttachmentClick,
}: MobileReviewEmailViewProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top when component mounts
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo(0, 0);
    }
  }, []);
  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Mobile Header */}
      <MobileReviewHeader
        subject={email.subject || "(no subject)"}
        onBack={onBack}
      />

      {/* Email Content (scrollable) */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        style={{ 
          height: 'calc(100vh - 56px - 80px)',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth'
        }}
      >
        <EmailConversationView
          email={emailContent}
          loading={loading}
          compact={true}
        />
      </div>

      {/* Sticky Attachments Bar */}
      {attachments.length > 0 && (
        <MobileReviewAttachmentBar
          attachments={attachments}
          onAttachmentClick={onAttachmentClick}
        />
      )}
    </div>
  );
};
