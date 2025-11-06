import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Mail, Paperclip } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchReviewEmailList,
  EmailListItem,
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
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const seenIds = useRef(new Set<string>());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load first page
  useEffect(() => {
    loadPage(0, true);
  }, []);

  // Auto-select first email on initial load
  useEffect(() => {
    if (emails.length > 0 && !selectedEmailId) {
      onSelectEmail(emails[0]);
    }
  }, [emails.length, selectedEmailId, onSelectEmail]);

  const loadPage = async (page: number, isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
        seenIds.current.clear();
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const { data, error: fetchError, count } = await fetchReviewEmailList(page);

      if (fetchError) {
        throw fetchError;
      }

      // Filter out duplicates
      const newEmails = data.filter((email) => {
        if (seenIds.current.has(email.id)) {
          return false;
        }
        seenIds.current.add(email.id);
        return true;
      });

      if (isInitial) {
        setEmails(newEmails);
      } else {
        setEmails((prev) => [...prev, ...newEmails]);
      }

      setTotalCount(count);
      setCurrentPage(page);
      setHasMore(seenIds.current.size < count);
    } catch (err) {
      console.error("Failed to load emails:", err);
      setError(err instanceof Error ? err.message : "Failed to load emails");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

      // Load more when within 200px of bottom
      if (scrollBottom < 200 && !loadingMore && hasMore) {
        loadPage(currentPage + 1, false);
      }
    },
    [currentPage, loadingMore, hasMore]
  );

  const handleRetry = () => {
    loadPage(0, true);
  };

  const handleKeyDown = (event: React.KeyboardEvent, email: EmailListItem) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectEmail(email);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const currentIndex = emails.findIndex((e) => e.id === selectedEmailId);
      const nextIndex =
        event.key === "ArrowDown"
          ? Math.min(currentIndex + 1, emails.length - 1)
          : Math.max(currentIndex - 1, 0);
      
      if (nextIndex !== currentIndex) {
        onSelectEmail(emails[nextIndex]);
      }
    }
  };

  const formatDate = (email: EmailListItem) => {
    const dateStr = email.display_date_local || email.date_received;
    if (!dateStr) return "";

    try {
      const date = parseISO(dateStr);
      
      if (isToday(date)) {
        return format(date, "HH:mm");
      } else if (isThisWeek(date)) {
        return format(date, "EEE");
      } else {
        return format(date, "dd MMM");
      }
    } catch {
      return "";
    }
  };

  const getAvatarInitials = (email: EmailListItem) => {
    if (email.from_avatar_initials) {
      return email.from_avatar_initials;
    }
    
    const name = email.from_name || email.from_email || "?";
    const words = name.split(/[\s@]+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getDisplayName = (email: EmailListItem) => {
    return email.from_name || email.from_email || "Unknown Sender";
  };

  if (loading) {
    return (
      <div className="w-[360px] flex-shrink-0 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Needs Review</h2>
        </div>
        <div className="flex-1 p-2 space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg border space-y-2">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
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
    <div className="w-[360px] flex-shrink-0 border-r bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Needs Review</h2>
          {totalCount > 0 && (
            <Badge variant="secondary">{totalCount}</Badge>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertDescription className="flex items-center justify-between">
            <span>Could not load review emails</span>
            <Button size="sm" variant="outline" onClick={handleRetry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Email List */}
      <ScrollArea
        className="flex-1"
        onScrollCapture={handleScroll}
        ref={scrollRef}
      >
        {emails.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No review emails found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try again later or adjust filters
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {emails.map((email) => {
              const isSelected = selectedEmailId === email.id;
              const initials = getAvatarInitials(email);
              const displayName = getDisplayName(email);
              const hasPriority = email.priority > 0;

              return (
                <button
                  key={email.id}
                  role="button"
                  tabIndex={0}
                  className={`
                    w-full p-3 rounded-lg border text-left transition-colors
                    hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring
                    ${isSelected ? "bg-accent" : ""}
                    ${hasPriority ? "border-l-4 border-l-primary" : ""}
                  `}
                  onClick={() => onSelectEmail(email)}
                  onKeyDown={(e) => handleKeyDown(e, email)}
                >
                  <div className="flex gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                      {initials}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Name and Date */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm truncate">
                          {displayName}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDate(email)}
                        </span>
                      </div>

                      {/* Subject */}
                      <div className="text-sm truncate">
                        {email.subject || "(No Subject)"}
                      </div>

                      {/* Snippet */}
                      <div className="text-xs text-muted-foreground truncate">
                        {email.snippet_text || ""}
                      </div>

                      {/* Attachment Badge */}
                      {email.no_of_attachments > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Paperclip className="h-3 w-3" />
                          <span>{email.no_of_attachments}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Loading More Indicator */}
            {loadingMore && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ReviewEmailList;
