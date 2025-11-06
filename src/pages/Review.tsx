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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  fetchEmailById,
  fetchEmailContent,
  NormalizedEmail,
  EmailListItem,
  EmailContent,
} from "@/services/emailReviewService";
import { ReviewEmailList } from "@/components/ReviewEmailList";
import { EmailConversationView } from "@/components/EmailConversationView";
import { Card } from "@/components/ui/card";

type View = "payable" | "paid" | "flagged";

export const Review: React.FC = () => {
  const [viewState, setViewState] = useState<View>("payable");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem("sidebar-collapsed") === "true"
  );
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<NormalizedEmail | null>(null);
  const [emailContent, setEmailContent] = useState<EmailContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const { user, signOut } = useAuth();
  const { toast } = useToast();

  // Load selected email content when selection changes
  useEffect(() => {
    if (selectedEmailId) {
      loadEmailContent(selectedEmailId);
      loadEmailDetails(selectedEmailId);
    } else {
      setEmailContent(null);
      setSelectedEmail(null);
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
    setSelectedEmailId(email.id);
  };

  const loadEmailDetails = async (emailId: string) => {
    try {
      const { data, error: fetchError } = await fetchEmailById(emailId);

      if (fetchError) {
        throw fetchError;
      }

      setSelectedEmail(data);
    } catch (err) {
      console.error("Failed to load email details:", err);
      toast({
        title: "Error loading email",
        description: err instanceof Error ? err.message : "Failed to load email details",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
        <header className="h-16 border-b bg-card px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <img src={SodhiLogo} alt="Sodhi Logo" className="h-8" />
            <h1 className="text-xl font-semibold">Review</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{user?.email}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </header>

        {/* Three-Column Layout */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Email List (Left) - Fixed 360px */}
            <ReviewEmailList
              selectedEmailId={selectedEmailId}
              onSelectEmail={handleSelectEmail}
            />

            {/* Conversation and Attachments (Right) */}
            <div className="flex-1 flex">
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Conversation (Middle) */}
                <ResizablePanel defaultSize={65} minSize={50}>
                  <EmailConversationView
                    email={emailContent}
                    loading={loadingContent}
                  />
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Attachments (Right) */}
                <ResizablePanel defaultSize={35} minSize={25} maxSize={45}>
                  <div className="h-full flex flex-col border-l bg-card">
                    <div className="p-4 border-b">
                      <h2 className="text-lg font-semibold">Attachments</h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedEmail
                          ? selectedEmail.attachments.flagged.length +
                            selectedEmail.attachments.added.length +
                            selectedEmail.attachments.neutral.length
                          : 0}{" "}
                        files
                      </p>
                    </div>
                    <ScrollArea className="flex-1">
                      {selectedEmail ? (
                        <div className="p-4 space-y-4">
                          {/* Flagged Attachments */}
                          {selectedEmail.attachments.flagged.length > 0 && (
                            <div>
                              <h3 className="text-sm font-semibold text-destructive mb-2">
                                Flagged ({selectedEmail.attachments.flagged.length})
                              </h3>
                              <div className="space-y-2">
                                {selectedEmail.attachments.flagged.map((att) => (
                                  <Card
                                    key={att.id}
                                    className="p-3 border-destructive/50 hover:bg-accent transition-colors cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-destructive/10 rounded flex items-center justify-center">
                                        <span className="text-xs font-medium text-destructive">
                                          {att.mime_type?.split('/')[1]?.toUpperCase().slice(0, 3) || 'FILE'}
                                        </span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">
                                          {att.filename}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {formatFileSize(att.size_bytes)}
                                        </div>
                                        {att.error_message && (
                                          <div className="text-xs text-destructive mt-1 truncate">
                                            {att.error_message}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Added Attachments */}
                          {selectedEmail.attachments.added.length > 0 && (
                            <div>
                              <h3 className="text-sm font-semibold text-green-600 mb-2">
                                Added ({selectedEmail.attachments.added.length})
                              </h3>
                              <div className="space-y-2">
                                {selectedEmail.attachments.added.map((att) => (
                                  <Card
                                    key={att.id}
                                    className="p-3 border-green-600/50 hover:bg-accent transition-colors cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-green-600/10 rounded flex items-center justify-center">
                                        <span className="text-xs font-medium text-green-600">
                                          {att.mime_type?.split('/')[1]?.toUpperCase().slice(0, 3) || 'FILE'}
                                        </span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">
                                          {att.filename}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {formatFileSize(att.size_bytes)}
                                        </div>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Neutral Attachments */}
                          {selectedEmail.attachments.neutral.length > 0 && (
                            <div>
                              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                                Neutral ({selectedEmail.attachments.neutral.length})
                              </h3>
                              <div className="space-y-2">
                                {selectedEmail.attachments.neutral.map((att) => (
                                  <Card
                                    key={att.id}
                                    className="p-3 hover:bg-accent transition-colors cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                        <span className="text-xs font-medium text-muted-foreground">
                                          {att.mime_type?.split('/')[1]?.toUpperCase().slice(0, 3) || 'FILE'}
                                        </span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">
                                          {att.filename}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {formatFileSize(att.size_bytes)}
                                        </div>
                                        {att.error_message && (
                                          <div className="text-xs text-destructive mt-1 truncate">
                                            {att.error_message}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedEmail.attachments.flagged.length === 0 &&
                            selectedEmail.attachments.added.length === 0 &&
                            selectedEmail.attachments.neutral.length === 0 && (
                              <div className="text-center text-muted-foreground py-8">
                                No attachments
                              </div>
                            )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Select an email to view attachments
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Review;
