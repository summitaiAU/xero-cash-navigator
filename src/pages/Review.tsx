import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SimpleSidebar } from "@/components/SimpleSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  fetchEmailContent,
  EmailListItem,
  EmailContent,
  EmailAttachment,
} from "@/services/emailReviewService";
import { ReviewEmailList } from "@/components/ReviewEmailList";
import { EmailConversationView } from "@/components/EmailConversationView";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import { AttachmentViewer } from "@/components/AttachmentViewer";
import { AddInvoiceDrawer } from "@/components/AddInvoiceDrawer";

type View = "payable" | "paid" | "flagged";

export const Review: React.FC = () => {
  const navigate = useNavigate();
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [emailContent, setEmailContent] = useState<EmailContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);
  const [invoiceDrawerOpen, setInvoiceDrawerOpen] = useState(false);
  const [invoiceAttachment, setInvoiceAttachment] = useState<EmailAttachment | null>(null);
  const [previousEmailId, setPreviousEmailId] = useState<string | null>(null);
  const conversationScrollRef = React.useRef<number>(0);

  const { toast } = useToast();

  // Keyboard handlers for Review page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close attachment viewer
      if (e.key === "Escape" && selectedAttachmentId) {
        setSelectedAttachmentId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedAttachmentId]);

  // Load selected email content when selection changes
  useEffect(() => {
    if (selectedEmailId) {
      loadEmailContent(selectedEmailId);
    } else {
      setEmailContent(null);
    }
  }, [selectedEmailId]);

  const loadEmailContent = async (emailId: string) => {
    try {
      setLoadingContent(true);
      const { data, error: fetchError } = await fetchEmailContent(emailId);

      if (fetchError) {
        throw fetchError;
      }

      setEmailContent(data);
    } catch (err) {
      console.error("Failed to load email content:", err);
      toast({
        title: "Unable to load email content",
        description: "Please retry.",
        variant: "destructive",
      });
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSelectEmail = (email: EmailListItem) => {
    // Save scroll position if re-selecting same email
    if (selectedEmailId === email.id) {
      // Same email - preserve scroll
      setPreviousEmailId(email.id);
    } else {
      // Different email - reset scroll
      setPreviousEmailId(null);
      conversationScrollRef.current = 0;
    }
    
    setSelectedEmailId(email.id);
    setSelectedAttachmentId(null); // Clear attachment selection on new email
  };

  return (
    <div className="h-screen flex">
      <div className="w-[360px] border-r border-border bg-card flex flex-col">
        <ReviewEmailList
          selectedEmailId={selectedEmailId}
          onSelectEmail={handleSelectEmail}
        />
      </div>

      {/* Right side - Conversation and Attachments */}
      <div className="flex-1 min-w-0 flex">
        <div className="flex-1 min-w-0 border-r border-border">
          <EmailConversationView
            email={emailContent}
            loading={loadingContent}
          />
        </div>

        {/* Attachments (Right) */}
        <div className="w-[320px] flex-shrink-0 flex flex-col bg-card">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">Attachments</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <AttachmentsPanel 
              emailId={selectedEmailId} 
              onAttachmentClick={(attachment: EmailAttachment) => {
                setSelectedAttachmentId(attachment.id);
              }}
              onAddInvoice={(attachment: EmailAttachment) => {
                setInvoiceAttachment(attachment);
                setInvoiceDrawerOpen(true);
              }}
            />
          </div>
        </div>
      </div>

      {/* Attachment Viewer Modal */}
      <AttachmentViewer
        attachmentId={selectedAttachmentId}
        onClose={() => setSelectedAttachmentId(null)}
        onAddInvoice={(attachment) => {
          setInvoiceAttachment(attachment);
          setInvoiceDrawerOpen(true);
        }}
      />

      {/* Add Invoice Drawer */}
      <AddInvoiceDrawer
        open={invoiceDrawerOpen}
        onClose={() => {
          setInvoiceDrawerOpen(false);
          setInvoiceAttachment(null);
        }}
        selectedAttachment={invoiceAttachment}
        onSaved={(invoiceId) => {
          console.log("Invoice saved:", invoiceId);
          // Optionally refresh email list or show updated state
        }}
        onWebhookResult={(ok) => {
          console.log("Webhook result:", ok);
        }}
      />
    </div>
  );
};

export default Review;
