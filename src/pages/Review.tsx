import React, { useState } from "react";
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
import { Card } from "@/components/ui/card";

type View = "payable" | "paid" | "flagged";

export const Review: React.FC = () => {
  const [viewState, setViewState] = useState<View>("payable");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem("sidebar-collapsed") === "true"
  );
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  
  // Placeholder state for future Supabase data
  const [emails, setEmails] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);

  const { user, signOut } = useAuth();
  const { toast } = useToast();

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
                  <p className="text-sm text-muted-foreground">Review queue</p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-2">
                    {/* Placeholder email list items */}
                    {[1, 2, 3, 4, 5].map((item) => (
                      <Card
                        key={item}
                        className="p-3 cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => setSelectedEmailId(`email-${item}`)}
                      >
                        <div className="text-sm font-medium">
                          Email Subject {item}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          sender@example.com
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date().toLocaleDateString()}
                        </div>
                      </Card>
                    ))}
                  </div>
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
                    {selectedEmailId
                      ? `Viewing ${selectedEmailId}`
                      : "Select an email to view"}
                  </p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-6">
                    {selectedEmailId ? (
                      <div className="space-y-4">
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
                          <div className="text-base">
                            Email Subject Placeholder
                          </div>
                        </div>
                        <div className="pt-4 border-t">
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            Body
                          </div>
                          <div className="prose prose-sm max-w-none">
                            <p>
                              This is a placeholder for the email body content.
                              The actual email conversation will be loaded from
                              Supabase.
                            </p>
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
                    {attachments.length} files
                  </p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-3">
                    {/* Placeholder attachment tiles */}
                    {[1, 2, 3].map((item) => (
                      <Card
                        key={item}
                        className="p-4 hover:bg-accent transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
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
                      </Card>
                    ))}
                  </div>
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
