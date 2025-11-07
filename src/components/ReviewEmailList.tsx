import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Mail, Paperclip, Search, X, ArrowUpDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchReviewEmailList,
  EmailListItem,
  EmailListFilters,
} from "@/services/emailReviewService";
import { format, isToday, isThisWeek, parseISO } from "date-fns";

interface ReviewEmailListProps {
  selectedEmailId: string | null;
  onSelectEmail: (email: EmailListItem) => void;
}

export const ReviewEmailList: React.FC<ReviewEmailListProps> = ({
  selectedEmailId,
  onSelectEmail,
}) => {
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

  // Simplified filters - only search and sort
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  const fetchEmails = useCallback(
    async (page: number, append = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        console.log("[ReviewEmailList] Fetching emails:", { page, append, searchQuery, sortBy });

        const filters: EmailListFilters = {
          searchQuery: searchQuery || undefined,
          sortBy,
        };

        const { data, error: fetchError, count } = await fetchReviewEmailList(page, filters);

        console.log("[ReviewEmailList] Fetch result:", { 
          dataCount: data.length, 
          totalCount: count, 
          error: fetchError,
          firstEmail: data[0]
        });

        if (fetchError) {
          console.error("[ReviewEmailList] Fetch error:", fetchError);
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
        console.error("[ReviewEmailList] Failed to fetch emails:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [searchQuery, sortBy]
  );

  // Fetch emails when search or sort changes
  useEffect(() => {
    hasAutoSelectedRef.current = false; // Reset auto-select flag on search/sort change
    setCurrentPage(0);
    fetchEmails(0, false);
  }, [searchQuery, sortBy]);

  // Auto-select first email when list loads and nothing is selected
  useEffect(() => {
    if (emails.length > 0 && !selectedEmailId && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      onSelectEmail(emails[0]);
    }
  }, [emails, selectedEmailId]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      // Throttle scroll events
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

  const toggleSort = () => {
    setSortBy((prev) => (prev === 'newest' ? 'oldest' : 'newest'));
  };

  if (loading) {
    return (
      <div className="w-[360px] flex-shrink-0 border-r bg-[hsl(246_8%_97%)] flex flex-col">
        <div className="px-4 py-3 border-b bg-card">
          <h2 className="text-lg font-semibold">Emails</h2>
        </div>
        <div className="flex-1 py-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="review-email-row">
              <div className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-[360px] flex-shrink-0 border-r bg-[hsl(246_8%_97%)] flex flex-col">
      {/* Header with count */}
      <div className="px-4 py-3 border-b bg-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Emails 
            {totalCount > 0 && <span className="text-muted-foreground ml-2">({totalCount})</span>}
          </h2>
        </div>

        {/* Search and Sort */}
        <div className="flex gap-2">
          <div className="relative flex-1">
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
          
          {/* Sort Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSort}
            className="flex-shrink-0 h-9"
            title={sortBy === 'newest' ? 'Newest first' : 'Oldest first'}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Email List */}
      <ScrollArea className="flex-1" onScrollCapture={handleScroll} ref={scrollRef}>
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
            {searchQuery ? (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="text-xs">
                Go to Payable
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
                  className={`review-email-row ${isSelected ? "active" : ""}`}
                >
                  <div className="flex gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-primary">
                      {getDisplayName(email).slice(0, 2).toUpperCase()}
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
                      <div className="text-sm text-foreground line-clamp-1 text-fade">
                        {email.subject || "(no subject)"}
                      </div>

                      {/* Third Line: Snippet */}
                      {email.snippet_text && (
                        <div className="text-xs text-muted-foreground line-clamp-1 text-fade">
                          {email.snippet_text}
                        </div>
                      )}

                      {/* Attachment Badge */}
                      {email.no_of_attachments > 0 && (
                        <div className="flex items-center gap-1 pt-1">
                          <span className="review-chip">
                            <Paperclip className="h-3 w-3 mr-1" />
                            {email.no_of_attachments}
                          </span>
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
      </ScrollArea>
    </div>
  );
};

export default ReviewEmailList;
