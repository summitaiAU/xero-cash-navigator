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
        <div className="px-4 py-3 border-b bg-card">
          <div className="mb-2">
            <Skeleton className="h-3 w-20 mb-1" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="review-prose">
            <div className="space-y-2 pb-4 border-b mb-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="px-4 py-3 border-b bg-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Review</p>
          <h2 className="text-lg font-semibold">Email Conversation</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Select an email to view its content</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Compact Header */}
      <div className="sticky top-0 z-10 px-4 py-3 border-b bg-card">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h2 className="text-lg font-bold text-foreground line-clamp-1 flex-1">
            {email.subject || "(No Subject)"}
          </h2>
          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
            {formatEmailDate(email)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span className="inline-flex items-center gap-1">
            <span className="font-medium">From:</span>
            <span className="review-chip">{getFromDisplay(email)}</span>
          </span>
          {email.to_list && email.to_list.length > 0 && (
            <>
              <span>→</span>
              <span className="inline-flex items-center gap-1">
                <span className="font-medium">To:</span>
                <span className="review-chip">{email.to_list.join(", ")}</span>
              </span>
            </>
          )}
          {email.cc_list && email.cc_list.length > 0 && (
            <>
              <span>→</span>
              <span className="inline-flex items-center gap-1">
                <span className="font-medium">Cc:</span>
                <span className="review-chip">{email.cc_list.join(", ")}</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Email Body */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="review-prose">
            {/* Additional Metadata (Collapsible) */}
            {(email.reply_to || (email.headers_slim && Object.keys(email.headers_slim).length > 0)) && (
              <div className="pb-4 mb-4 border-b space-y-2">
                {email.reply_to && (
                  <div className="text-xs">
                    <span className="font-medium text-muted-foreground">Reply-To: </span>
                    <span className="text-foreground">{email.reply_to}</span>
                  </div>
                )}
                
                {email.headers_slim && Object.keys(email.headers_slim).length > 0 && (
                  <Collapsible open={showHeaders} onOpenChange={setShowHeaders}>
                    <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronDown
                        className={`h-3 w-3 transition-transform ${
                          showHeaders ? "rotate-180" : ""
                        }`}
                      />
                      View Full Headers
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="bg-muted/30 rounded-md p-2 text-xs font-mono space-y-1">
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
            )}

            {/* Email Body Content */}
            <div className="flex justify-center py-8">
              <div className="w-full max-w-[700px]">
                <div className="prose prose-sm max-w-none [&_*]:break-words review-prose bg-white rounded-[10px] p-6 shadow-[0_1px_2px_rgba(0,0,0,.06)]">
                  {email.body_html_safe ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: email.body_html_safe }}
                      className="[&_*]:text-[#0F172A] [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:border [&_img]:border-[#E6E8EE] [&_table]:border-collapse [&_table]:w-full [&_a]:text-[#2563EB] [&_a]:no-underline hover:[&_a]:underline [&_blockquote]:border-l-[3px] [&_blockquote]:border-[#E5E7EB] [&_blockquote]:pl-4 [&_blockquote]:text-[#6B7280] [&_blockquote]:italic"
                    />
                  ) : email.body_text_fallback ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: email.body_text_fallback.replace(/\n/g, "<br>"),
                      }}
                      className="whitespace-pre-wrap break-words"
                    />
                  ) : (
                    <p className="text-[#6B7280] italic text-sm">
                      No message body found for this email.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default EmailConversationView;
