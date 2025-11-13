import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Mail, Paperclip, Search, X, Check, Menu } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveStatusBadge } from "@/components/LiveStatusBadge";
import SodhiLogo from "@/assets/sodhi-logo.svg";
import {
  fetchReviewEmailList,
  EmailListItem,
  EmailListFilters,
} from "@/services/emailReviewService";
import { format, isToday, isThisWeek, parseISO } from "date-fns";

interface MobileReviewEmailListProps {
  selectedEmailId: string | null;
  onSelectEmail: (email: EmailListItem) => void;
}

export const MobileReviewEmailList = ({
  selectedEmailId,
  onSelectEmail,
}: MobileReviewEmailListProps) => {
  const [emails, setEmails] = useState<EmailListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasAutoSelectedRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  const fetchEmails = useCallback(
    async (page: number, append = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const filters: EmailListFilters = {
          searchQuery: searchQuery || undefined,
        };

        const { data, error: fetchError, count } = await fetchReviewEmailList(page, filters);

        if (fetchError) {
          throw fetchError;
        }

        if (append) {
          setEmails((prev) => [...prev, ...data]);
        } else {
          setEmails(data);
        }

        setTotalCount(count);
        setHasMore(data.length === 30);
        setError(null);
      } catch (err) {
        console.error("[MobileReviewEmailList] Failed to fetch emails:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [searchQuery]
  );

  // Fetch emails when search changes
  useEffect(() => {
    hasAutoSelectedRef.current = false;
    setCurrentPage(0);
    fetchEmails(0, false);
  }, [searchQuery, fetchEmails]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (scrollTimeoutRef.current) return;
      
      scrollTimeoutRef.current = setTimeout(() => {
        scrollTimeoutRef.current = null;
      }, 100);

      const target = e.currentTarget;
      const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;

      if (bottom && hasMore && !loadingMore && !loading) {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        fetchEmails(nextPage, true);
      }
    },
    [hasMore, loadingMore, loading, currentPage, fetchEmails]
  );

  // Cleanup scroll timeout
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const formatDate = (email: EmailListItem) => {
    const dateStr = email.display_date_local || email.date_received;
    if (!dateStr) return "";

    try {
      const date = parseISO(dateStr);
      if (isToday(date)) {
        return format(date, "HH:mm");
      } else if (isThisWeek(date)) {
        return format(date, "EEE");
      }
      return format(date, "dd MMM");
    } catch {
      return "";
    }
  };

  const getDisplayName = (email: EmailListItem) => {
    return email.from_name || email.from_email || "Unknown Sender";
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header Skeleton */}
        <div className="h-14 px-2 border-b bg-background flex items-center justify-between">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-6" />
        </div>
        <div className="px-4 py-3 border-b bg-card">
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <div className="flex-1 py-2 space-y-1 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Mobile Header */}
      <div className="h-14 px-2 border-b bg-background flex items-center justify-between sticky top-0 z-50">
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <img src={SodhiLogo} alt="Sodhi" className="h-6 w-auto" />
        </div>

        <div className="flex items-center gap-1">
          <LiveStatusBadge />
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3 border-b bg-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-9 rounded-md"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Email count */}
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-muted-foreground">
            {emails.filter(e => !e.reviewed_at).length} pending
          </p>
          {emails.filter(e => e.reviewed_at).length > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
              <Check className="h-3 w-3 mr-1" />
              {emails.filter(e => e.reviewed_at).length} reviewed
            </Badge>
          )}
        </div>
      </div>

      {/* Email List */}
      <ScrollArea className="flex-1" onScrollCapture={handleScroll} ref={scrollRef}>
        <div className="min-h-full pb-12">
          {error && (
            <Alert variant="destructive" className="mx-4 mt-4">
              <AlertDescription className="flex items-center justify-between">
                <span className="text-sm">Unable to load emails</span>
                <Button variant="outline" size="sm" onClick={() => fetchEmails(0, false)}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {emails.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <Mail className="h-12 w-12 mb-3 opacity-20 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                {searchQuery ? "No emails match your search" : "Nothing to review"}
              </p>
              {searchQuery && (
                <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                  Clear search
                </Button>
              )}
            </div>
          )}

          {emails.length > 0 && (
            <div>
              {emails.map((email) => {
                const isSelected = selectedEmailId === email.id;

                return (
                  <button
                    key={email.id}
                    onClick={() => onSelectEmail(email)}
                    className={`w-full px-4 py-3 border-b hover:bg-muted/50 transition-colors text-left ${
                      isSelected ? "bg-primary/5" : ""
                    } ${email.reviewed_at ? "opacity-60" : ""}`}
                  >
                    <div className="flex gap-3">
                      {/* Avatar with checkmark overlay */}
                      <div className="relative w-10 h-10 flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {getDisplayName(email).slice(0, 2).toUpperCase()}
                        </div>
                        
                        {email.reviewed_at && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center border-2 border-white">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* First Line: Sender + Date */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm truncate text-foreground">
                            {getDisplayName(email)}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDate(email)}
                          </span>
                        </div>

                        {/* Second Line: Subject */}
                        <div className="text-sm text-foreground line-clamp-1">
                          {email.subject || "(no subject)"}
                        </div>

                        {/* Third Line: Snippet */}
                        {email.snippet_text && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {email.snippet_text}
                          </div>
                        )}

                        {/* Attachment Badge */}
                        {email.no_of_attachments > 0 && (
                          <div className="flex items-center gap-1 pt-1">
                            <Badge variant="secondary" className="text-xs">
                              <Paperclip className="h-3 w-3 mr-1" />
                              {email.no_of_attachments}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Loading More Indicator */}
              {loadingMore && (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
