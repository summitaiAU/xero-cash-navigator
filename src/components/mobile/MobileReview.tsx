import { useState, useEffect, useCallback } from "react";
import { MobileReviewEmailList } from "./MobileReviewEmailList";
import { MobileReviewEmailView } from "./MobileReviewEmailView";
import { AttachmentViewer } from "@/components/AttachmentViewer";
import { AddInvoiceWorkspace } from "@/components/AddInvoiceWorkspace";
import { MobileHamburgerMenu } from "./MobileHamburgerMenu";
import { EmailListItem, EmailContent, EmailAttachment, fetchEmailContent, fetchEmailAttachments, fetchReviewEmailList } from "@/services/emailReviewService";
import { fetchInvoices } from "@/services/invoiceService";
import { attachmentCacheService } from "@/services/attachmentCache";
import { useAuth } from "@/hooks/useAuth";

type NavigationState = 'list' | 'email-view';

export const MobileReview = () => {
  const { signOut, user } = useAuth();
  const [navigationState, setNavigationState] = useState<NavigationState>('list');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailListItem | null>(null);
  const [emailContent, setEmailContent] = useState<EmailContent | null>(null);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [loadingEmail, setLoadingEmail] = useState(false);
  
  // Hamburger menu state
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [payableCount, setPayableCount] = useState(0);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  
  // Attachment viewer state
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);
  
  // Add invoice workspace state
  const [invoiceWorkspaceOpen, setInvoiceWorkspaceOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<EmailAttachment | null>(null);

  // Fetch counts for hamburger menu
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch invoice counts
        const invoices = await fetchInvoices();
        if (invoices) {
          const payable = invoices.filter(inv => inv.status !== 'PAID' && inv.status !== 'FLAGGED' && inv.status !== 'DELETED').length;
          const flagged = invoices.filter(inv => inv.status === 'FLAGGED').length;
          setPayableCount(payable);
          setFlaggedCount(flagged);
        }

        // Fetch review email count
        const { data: emails } = await fetchReviewEmailList();
        if (emails) {
          const unreviewed = emails.filter(e => !e.reviewed_at).length;
          setReviewCount(unreviewed);
        }
      } catch (error) {
        console.error("Failed to fetch counts:", error);
      }
    };

    fetchCounts();
  }, []);

  // Load email content and attachments
  const loadEmailData = useCallback(async (emailId: string) => {
    setLoadingEmail(true);
    
    // Fetch email content
    const { data: content, error: contentError } = await fetchEmailContent(emailId);
    if (contentError) {
      console.error("Failed to load email content:", contentError);
    } else {
      setEmailContent(content);
    }
    
    // Fetch attachments
    const { data: attachmentsData, error: attachmentsError } = await fetchEmailAttachments(emailId);
    if (attachmentsError) {
      console.error("Failed to load attachments:", attachmentsError);
    } else {
      setAttachments(attachmentsData || []);
    }
    
    setLoadingEmail(false);
  }, []);

  // Handle email selection from list
  const handleSelectEmail = (email: EmailListItem) => {
    setSelectedEmail(email);
    setSelectedEmailId(email.id);
    setNavigationState('email-view');
    loadEmailData(email.id);
  };

  // Handle back to email list
  const handleBackToList = () => {
    setNavigationState('list');
    setEmailContent(null);
    setAttachments([]);
  };

  // Handle attachment click from attachment bar
  const handleAttachmentClick = (attachmentId: string) => {
    setSelectedAttachmentId(attachmentId);
  };

  // Handle add invoice
  const handleAddInvoice = (attachment: EmailAttachment) => {
    setSelectedAttachment(attachment);
    setSelectedAttachmentId(null); // Close attachment viewer
    setInvoiceWorkspaceOpen(true);
  };

  // Handle invoice saved
  const handleInvoiceSaved = () => {
    setInvoiceWorkspaceOpen(false);
    setSelectedAttachment(null);
    // Refresh attachments
    if (selectedEmailId) {
      loadEmailData(selectedEmailId);
    }
  };

  // Cleanup cache on unmount
  useEffect(() => {
    return () => {
      attachmentCacheService.clear();
    };
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Hamburger Menu */}
      <MobileHamburgerMenu
        open={showHamburgerMenu}
        onOpenChange={setShowHamburgerMenu}
        viewState="payable"
        payableCount={payableCount}
        flaggedCount={flaggedCount}
        reviewCount={reviewCount}
        userName={user?.email}
        onSignOut={signOut}
      />

      {/* Render based on navigation state */}
      {navigationState === 'list' && (
        <MobileReviewEmailList
          selectedEmailId={selectedEmailId}
          onSelectEmail={handleSelectEmail}
          onToggleHamburgerMenu={() => setShowHamburgerMenu(true)}
        />
      )}

      {navigationState === 'email-view' && selectedEmail && (
        <MobileReviewEmailView
          email={selectedEmail}
          emailContent={emailContent}
          attachments={attachments}
          loading={loadingEmail}
          onBack={handleBackToList}
          onAttachmentClick={handleAttachmentClick}
        />
      )}

      {/* Attachment Viewer Modal */}
      <AttachmentViewer
        attachmentId={selectedAttachmentId}
        onClose={() => setSelectedAttachmentId(null)}
        onAddInvoice={handleAddInvoice}
        onAttachmentUpdated={() => {
          if (selectedEmailId) {
            loadEmailData(selectedEmailId);
          }
        }}
      />

      {/* Add Invoice Workspace Modal */}
      <AddInvoiceWorkspace
        open={invoiceWorkspaceOpen}
        onClose={() => {
          setInvoiceWorkspaceOpen(false);
          setSelectedAttachment(null);
        }}
        selectedAttachment={selectedAttachment}
        onSaved={handleInvoiceSaved}
      />
    </div>
  );
};
