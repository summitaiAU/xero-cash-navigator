import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SimpleSidebar } from "@/components/SimpleSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { attachmentCacheService } from "@/services/attachmentCache";
import { ReviewEmailList } from "@/components/ReviewEmailList";
import { EmailConversationView } from "@/components/EmailConversationView";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import { AttachmentViewer } from "@/components/AttachmentViewer";
import { AddInvoiceWorkspace } from "@/components/AddInvoiceWorkspace";
import { MobileReview } from "@/components/mobile/MobileReview";
import { telemetry } from "@/services/telemetry";

type View = "payable" | "paid" | "flagged";

export const Review: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [emailContent, setEmailContent] = useState<EmailContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);
  const [invoiceWorkspaceOpen, setInvoiceWorkspaceOpen] = useState(false);
  const [invoiceAttachment, setInvoiceAttachment] = useState<EmailAttachment | null>(null);
  const [previousEmailId, setPreviousEmailId] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const conversationScrollRef = React.useRef<number>(0);
  const debounceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const selectedEmailIdRef = React.useRef<string | null>(null);
  const refetchAttachmentsRef = React.useRef<(() => Promise<void>) | null>(null);
  const mountTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  // Defer initial data fetching to allow Dashboard cleanup
  useEffect(() => {
    mountTimeoutRef.current = setTimeout(() => {
      setIsInitialLoad(false);
    }, 250); // 250ms delay for graceful transition

    return () => {
      if (mountTimeoutRef.current) {
        clearTimeout(mountTimeoutRef.current);
      }
    };
  }, []);

  // Clear attachment cache when leaving Review page
  useEffect(() => {
    return () => {
      console.log("[Review] Clearing attachment cache on unmount");
      attachmentCacheService.clear();
      
      // Clear debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

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

  // Sync ref with state
  useEffect(() => {
    selectedEmailIdRef.current = selectedEmailId;
  }, [selectedEmailId]);

  // Load selected email content when selection changes (only after initial delay)
  useEffect(() => {
    // Don't fetch during initial load period
    if (isInitialLoad || !selectedEmailId) {
      setEmailContent(null);
      return;
    }

    const abortController = new AbortController();
    const t0 = performance.now();
    
    telemetry.logUIEvent('review_email_load_start', { id: selectedEmailId });
    
    const loadEmailContentWithCancel = async (emailId: string) => {
      try {
        setLoadingContent(true);
        const { data, error: fetchError } = await fetchEmailContent(emailId);

        // Don't update state if aborted
        if (abortController.signal.aborted) {
          telemetry.logUIEvent('review_email_aborted', { id: emailId });
          return;
        }

        if (fetchError) {
          throw fetchError;
        }

        setEmailContent(data);
        
        telemetry.logPerf('review_email_first_data', {
          duration: performance.now() - t0,
          emailId,
        });
      } catch (err) {
        if (abortController.signal.aborted) {
          telemetry.logUIEvent('review_email_aborted', { id: emailId });
          return;
        }
        console.error("Failed to load email content:", err);
        toast({
          title: "Unable to load email content",
          description: "Please retry.",
          variant: "destructive",
        });
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingContent(false);
        }
      }
    };
    
    loadEmailContentWithCancel(selectedEmailId);
    
    return () => {
      abortController.abort();
    };
  }, [selectedEmailId, toast, isInitialLoad]);

  const handleSelectEmail = React.useCallback((email: EmailListItem) => {
    // Debounce to prevent rapid switching
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      // Use ref for comparison instead of state to keep callback stable
      if (selectedEmailIdRef.current === email.id) {
        // Same email - preserve scroll
        setPreviousEmailId(email.id);
      } else {
        // Different email - reset scroll
        setPreviousEmailId(null);
        conversationScrollRef.current = 0;
      }
      
      selectedEmailIdRef.current = email.id;
      setSelectedEmailId(email.id);
      setSelectedAttachmentId(null); // Clear attachment selection on new email
    }, 150); // 150ms debounce
  }, []); // Empty deps - now stable across renders

  // Render mobile view
  if (isMobile) {
    return <MobileReview />;
  }

  return (
    <div className="h-full flex overflow-hidden">
      <div className="w-[360px] border-r border-border bg-card flex flex-col overflow-hidden">
        <ReviewEmailList
          selectedEmailId={selectedEmailId}
          onSelectEmail={handleSelectEmail}
          isInitialLoad={isInitialLoad}
        />
      </div>

      {/* Right side - Conversation and Attachments */}
      <div className="flex-1 min-w-0 flex overflow-hidden">
        <div className="flex-1 min-w-0 border-r border-border">
          <EmailConversationView
            email={emailContent}
            loading={loadingContent}
          />
        </div>

        {/* Attachments (Right) */}
        <div className="w-[320px] flex-shrink-0 flex flex-col bg-card overflow-hidden">
          <div className="sticky top-0 z-10 py-3 px-3 border-b border-border bg-card">
            <h2 className="text-sm font-semibold">Attachments</h2>
          </div>
          <div className="flex-1 overflow-y-auto [overscroll-behavior-y:contain] [-webkit-overflow-scrolling:touch]">
            <AttachmentsPanel
              emailId={selectedEmailId} 
              onAttachmentClick={(attachment: EmailAttachment) => {
                setSelectedAttachmentId(attachment.id);
              }}
              onAddInvoice={(attachment: EmailAttachment) => {
                setInvoiceAttachment(attachment);
                setInvoiceWorkspaceOpen(true);
              }}
              onRefetch={(refetch) => {
                refetchAttachmentsRef.current = refetch;
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
          setSelectedAttachmentId(null); // Close viewer smoothly before opening workspace
          setInvoiceAttachment(attachment);
          setInvoiceWorkspaceOpen(true);
        }}
        onAttachmentUpdated={() => {
          refetchAttachmentsRef.current?.();
        }}
      />

      {/* Add Invoice Workspace */}
      <AddInvoiceWorkspace
        open={invoiceWorkspaceOpen}
        onClose={() => {
          setInvoiceWorkspaceOpen(false);
          setInvoiceAttachment(null);
        }}
        selectedAttachment={invoiceAttachment}
        onSaved={(invoiceId) => {
          console.log("Invoice saved:", invoiceId);
          refetchAttachmentsRef.current?.();
        }}
        onWebhookResult={(ok) => {
          console.log("Webhook result:", ok);
        }}
      />
    </div>
  );
};

export default Review;
