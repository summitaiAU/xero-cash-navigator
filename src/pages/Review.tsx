import React, { useState, useEffect } from "react";
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
  const [viewState, setViewState] = useState<View>("payable");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem("sidebar-collapsed") === "true"
  );
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [emailContent, setEmailContent] = useState<EmailContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);
  const [invoiceDrawerOpen, setInvoiceDrawerOpen] = useState(false);
  const [invoiceAttachment, setInvoiceAttachment] = useState<EmailAttachment | null>(null);
  const [previousEmailId, setPreviousEmailId] = useState<string | null>(null);
  const conversationScrollRef = React.useRef<number>(0);

  const { user, signOut } = useAuth();
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

  const handleToggleSidebar = React.useCallback(() => {
    setSidebarCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem("sidebar-collapsed", String(newValue));
      return newValue;
    });
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleViewStateChange = (newView: View) => {
    setViewState(newView);
  };

  return (
    <div className="min-h-screen w-full bg-[#F6F8FB] flex">
      {/* Sidebar Navigation */}
      <SimpleSidebar
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        payableCount={0}
        paidCount={0}
        flaggedCount={0}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        onSignOut={handleSignOut}
        userName={user?.email}
      />

      {/* Vertical Divider */}
      <div 
        className="fixed top-0 bottom-0 w-px bg-[#E5E7EB] z-30 transition-all duration-300"
        style={{
          left: sidebarCollapsed ? "64px" : "192px",
        }}
      />

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col transition-all duration-300 p-6"
        style={{
          marginLeft: sidebarCollapsed ? "64px" : "192px",
        }}
      >
        {/* Framed Canvas Container */}
        <div className="flex-1 bg-white rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.06),0_8px_24px_rgba(0,0,0,.04)] p-4 overflow-hidden animate-in fade-in slide-in-from-right-8 duration-500">
          {/* Three-Column Layout */}
          <div className="h-full overflow-hidden">
            <div className="h-full flex gap-4">
              {/* Email List (Left) - Fixed 360px */}
              <div className="w-[360px] flex-shrink-0">
                <ReviewEmailList
                  selectedEmailId={selectedEmailId}
                  onSelectEmail={handleSelectEmail}
                />
              </div>

              {/* Vertical Divider */}
              <div className="w-px bg-[#E5E7EB] flex-shrink-0" />

              {/* Conversation and Attachments (Right) */}
              <div className="flex-1 flex gap-4 min-w-0">
                {/* Conversation (Middle) */}
                <div className="flex-1 min-w-0">
                  <EmailConversationView
                    email={emailContent}
                    loading={loadingContent}
                  />
                </div>

                {/* Vertical Divider */}
                <div className="w-px bg-[#E5E7EB] flex-shrink-0" />

                {/* Attachments (Right) */}
                <div className="w-[320px] flex-shrink-0 flex flex-col">
                  <div className="px-4 py-3 border-b border-[#E5E7EB]">
                    <h2 className="text-sm font-semibold text-[#0F172A]">Attachments</h2>
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
            </div>
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
