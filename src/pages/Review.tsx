import React, { useState, useEffect } from "react";
import { SimpleSidebar } from "@/components/SimpleSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, User, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import SodhiLogo from "@/assets/sodhi-logo.svg";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  fetchReviewEmails,
  fetchEmailById,
  NormalizedEmail,
} from "@/services/emailReviewService";

type View = "payable" | "paid" | "flagged";

export const Review: React.FC = () => {
  const [viewState, setViewState] = useState<View>("payable");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem("sidebar-collapsed") === "true"
  );
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  
  // Real Supabase data state
  const [emails, setEmails] = useState<NormalizedEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<NormalizedEmail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 20;

  const { user, signOut } = useAuth();
  const { toast } = useToast();

  // Load emails on mount
  useEffect(() => {
    loadEmails();
  }, [currentPage]);

  // Load selected email details when selection changes
  useEffect(() => {
    if (selectedEmailId) {
      loadEmailDetails(selectedEmailId);
    } else {
      setSelectedEmail(null);
    }
  }, [selectedEmailId]);

  const loadEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      const offset = currentPage * PAGE_SIZE;
      const { data, error: fetchError, count } = await fetchReviewEmails(PAGE_SIZE, offset);

      if (fetchError) {
        throw fetchError;
      }

      setEmails(data);
      setTotalCount(count);
    } catch (err) {
      console.error("Failed to load emails:", err);
      setError(err instanceof Error ? err.message : "Failed to load emails");
      toast({
        title: "Error loading emails",
        description: err instanceof Error ? err.message : "Failed to load emails",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full hidden lg:flex"
          >
            {/* Email List (Left) - 25% */}
            <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
              <div className="h-full flex flex-col border-r bg-card">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Emails</h2>
                  <p className="text-sm text-muted-foreground">
                    {totalCount} email{totalCount !== 1 ? 's' : ''} in review queue
                  </p>
                </div>
                <ScrollArea className="flex-1">
                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : error ? (
                    <Alert variant="destructive" className="m-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : emails.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No emails in review queue
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {emails.map((email) => (
                        <Card
                          key={email.id}
                          className={`p-3 cursor-pointer hover:bg-accent transition-colors ${
                            selectedEmailId === email.id ? 'bg-accent' : ''
                          }`}
                          onClick={() => setSelectedEmailId(email.id)}
                        >
                          <div className="text-sm font-medium truncate">
                            {email.subject}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {email.from}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDate(email.date)}
                          </div>
                          {(email.attachments.flagged.length > 0 ||
                            email.attachments.added.length > 0 ||
                            email.attachments.neutral.length > 0) && (
                            <div className="flex gap-2 mt-2 text-xs">
                              {email.attachments.flagged.length > 0 && (
                                <span className="text-destructive">
                                  {email.attachments.flagged.length} flagged
                                </span>
                              )}
                              {email.attachments.added.length > 0 && (
                                <span className="text-green-600">
                                  {email.attachments.added.length} added
                                </span>
                              )}
                              {email.attachments.neutral.length > 0 && (
                                <span className="text-muted-foreground">
                                  {email.attachments.neutral.length} neutral
                                </span>
                              )}
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Conversation (Middle) - 50% */}
            <ResizablePanel defaultSize={50} minSize={40}>
              <div className="h-full flex flex-col bg-background">
                <div className="p-4 border-b bg-card">
                  <h2 className="text-lg font-semibold">Conversation</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedEmail ? selectedEmail.subject : "Select an email to view"}
                  </p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-6">
                    {selectedEmail ? (
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">
                            From
                          </div>
                          <div className="text-base">{selectedEmail.from}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">
                            To
                          </div>
                          <div className="text-base">{selectedEmail.to}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">
                            Date
                          </div>
                          <div className="text-base">{formatDate(selectedEmail.date)}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">
                            Subject
                          </div>
                          <div className="text-base">{selectedEmail.subject}</div>
                        </div>
                        <div className="pt-4 border-t">
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            Body
                          </div>
                          <div className="prose prose-sm max-w-none">
                            {selectedEmail.body ? (
                              <div dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />
                            ) : (
                              <p className="text-muted-foreground italic">No content available</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Select an email to view the conversation
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Attachments (Right) - 25% */}
            <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
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

          {/* Mobile Stacked Layout */}
          <div className="lg:hidden h-full flex flex-col">
            <ScrollArea className="flex-1">
              <div className="space-y-4 p-4">
                {/* Email List */}
                <Card className="p-4">
                  <h2 className="text-lg font-semibold mb-3">Emails</h2>
                  <div className="space-y-2">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => setSelectedEmailId(`email-${item}`)}
                      >
                        <div className="text-sm font-medium">
                          Email Subject {item}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          sender@example.com
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Conversation */}
                {selectedEmailId && (
                  <Card className="p-4">
                    <h2 className="text-lg font-semibold mb-3">
                      Conversation
                    </h2>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          From
                        </div>
                        <div className="text-base">sender@example.com</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">
                          Subject
                        </div>
                        <div className="text-base">Email Subject</div>
                      </div>
                      <div className="pt-3 border-t">
                        <p className="text-sm">
                          Placeholder email body content.
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Attachments */}
                <Card className="p-4">
                  <h2 className="text-lg font-semibold mb-3">Attachments</h2>
                  <div className="space-y-2">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 p-3 border rounded-lg"
                      >
                        <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            PDF
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            attachment_{item}.pdf
                          </div>
                          <div className="text-xs text-muted-foreground">
                            1.2 MB
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Review;
