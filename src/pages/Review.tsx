import React, { useState, useEffect } from "react";
import { SimpleSidebar } from "@/components/SimpleSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import SodhiLogo from "@/assets/sodhi-logo.svg";
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
    <div className="min-h-screen w-full bg-background flex">
      {/* Sidebar Navigation */}
      <SimpleSidebar
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        payableCount={0}
        paidCount={0}
        flaggedCount={0}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col transition-all duration-300"
        style={{
          marginLeft: sidebarCollapsed ? "64px" : "192px",
        }}
      >
        {/* Header */}
        <header className="h-14 border-b bg-card px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <img src={SodhiLogo} alt="Sodhi Logo" className="h-7" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>{user?.email}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="gap-2 h-8"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </header>

        {/* Three-Column Layout */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex transition-all duration-300">
            {/* Email List (Left) - Fixed 360px */}
            <ReviewEmailList
              selectedEmailId={selectedEmailId}
              onSelectEmail={handleSelectEmail}
            />

            {/* Conversation and Attachments (Right) */}
            <div className="flex-1 flex">
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Conversation (Middle) */}
                <ResizablePanel defaultSize={70} minSize={50}>
                  <div className="h-full">
                    <EmailConversationView
                      email={emailContent}
                      loading={loadingContent}
                    />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Attachments (Right) */}
                <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
                  <div className="h-full flex flex-col border-l bg-card">
                    <div className="px-4 py-3 border-b">
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
                </ResizablePanel>
              </ResizablePanelGroup>
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
