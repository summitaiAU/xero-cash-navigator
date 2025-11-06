import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { EmailContent } from "@/services/emailReviewService";
import { format, parseISO } from "date-fns";

interface EmailConversationViewProps {
  email: EmailContent | null;
  loading: boolean;
}

export const EmailConversationView: React.FC<EmailConversationViewProps> = ({
  email,
  loading,
}) => {
  const [showHeaders, setShowHeaders] = React.useState(false);

  const formatEmailDate = (email: EmailContent) => {
    const dateStr = email.display_date_local || email.date_received;
    if (!dateStr) return "";

    try {
      const date = parseISO(dateStr);
      return format(date, "EEE, d MMM yyyy h:mm a");
    } catch {
      return dateStr;
    }
  };

  const getFromDisplay = (email: EmailContent) => {
    if (email.from_name && email.from_email) {
      return `${email.from_name} <${email.from_email}>`;
    }
    return email.from_email || "Unknown Sender";
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="p-6 border-b bg-card">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="space-y-2 pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="p-6 border-b bg-card">
          <h2 className="text-lg font-semibold">Conversation</h2>
          <p className="text-sm text-muted-foreground">
            Select an email to view
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select an email to view its content
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b bg-card">
        <h2 className="text-lg font-semibold line-clamp-2">
          {email.subject || "(No Subject)"}
        </h2>
      </div>

      {/* Email Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {/* Metadata */}
          <div className="space-y-2 pb-4 border-b">
            <div>
              <span className="text-sm font-medium text-muted-foreground">From: </span>
              <span className="text-sm">{getFromDisplay(email)}</span>
            </div>

            {email.to_list && email.to_list.length > 0 && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">To: </span>
                <span className="text-sm">{email.to_list.join(", ")}</span>
              </div>
            )}

            {email.cc_list && email.cc_list.length > 0 && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Cc: </span>
                <span className="text-sm">{email.cc_list.join(", ")}</span>
              </div>
            )}

            {email.reply_to && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Reply-To: </span>
                <span className="text-sm">{email.reply_to}</span>
              </div>
            )}

            <div>
              <span className="text-sm font-medium text-muted-foreground">Date: </span>
              <span className="text-sm">{formatEmailDate(email)}</span>
            </div>

            {/* Optional Headers */}
            {email.headers_slim && Object.keys(email.headers_slim).length > 0 && (
              <Collapsible open={showHeaders} onOpenChange={setShowHeaders}>
                <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      showHeaders ? "rotate-180" : ""
                    }`}
                  />
                  View Headers
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="bg-muted/50 rounded-md p-3 text-xs font-mono space-y-1">
                    {Object.entries(email.headers_slim).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-semibold">{key}:</span>{" "}
                        <span className="text-muted-foreground">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          {/* Email Body */}
          <div className="email-body prose prose-sm max-w-none">
            {email.body_html_safe ? (
              <div
                dangerouslySetInnerHTML={{ __html: email.body_html_safe }}
                className="[&_*]:text-foreground [&_img]:max-w-full [&_img]:h-auto [&_table]:border-collapse [&_table]:w-full"
              />
            ) : email.body_text_fallback ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: email.body_text_fallback.replace(/\n/g, "<br>"),
                }}
                className="whitespace-pre-wrap"
              />
            ) : (
              <p className="text-muted-foreground italic">
                No message body found for this email.
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
