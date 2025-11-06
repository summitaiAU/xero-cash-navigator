import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Mail, Paperclip, AlertCircle, Search, Filter, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  fetchReviewEmailList,
  EmailListItem,
  EmailListFilters,
} from "@/services/emailReviewService";
import { format, isToday, isThisWeek, parseISO, subDays } from "date-fns";

interface ReviewEmailListProps {
  selectedEmailId: string | null;
  onSelectEmail: (email: EmailListItem) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "review":
      return "destructive";
    case "completed":
      return "default";
    case "processing":
      return "secondary";
    case "queued":
      return "outline";
    case "error":
      return "destructive";
    default:
      return "secondary";
  }
};

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
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filters, setFilters] = useState<EmailListFilters>({
    statuses: ["review"],
    sortBy: "newest",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchEmails = useCallback(
    async (page: number, append = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
          setSeenIds(new Set());
        }

        const { data, error: fetchError, count } = await fetchReviewEmailList(page, {
          ...filters,
          searchQuery: searchQuery || undefined,
        });

        if (fetchError) throw fetchError;

        const newEmails = data.filter((email) => !seenIds.has(email.id));
        const newSeenIds = new Set(seenIds);
        newEmails.forEach((email) => newSeenIds.add(email.id));
        setSeenIds(newSeenIds);

        if (append) {
          setEmails((prev) => [...prev, ...newEmails]);
        } else {
          setEmails(newEmails);
          // Auto-select first email if none selected
          if (newEmails.length > 0 && !selectedEmailId) {
            onSelectEmail(newEmails[0]);
          }
        }

        setTotalCount(count);
        setHasMore(newEmails.length === 30);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch emails:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters, searchQuery, seenIds, selectedEmailId, onSelectEmail]
  );

  useEffect(() => {
    setCurrentPage(0);
    fetchEmails(0, false);
  }, [filters, searchQuery]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
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

  const formatDate = (email: EmailListItem) => {
    const dateStr = email.display_date_local || email.date_received || email.created_at;
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

  const handleFilterChange = (key: keyof EmailListFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ statuses: ["review"], sortBy: "newest" });
    setSearchQuery("");
  };

  const activeFilterCount = () => {
    let count = 0;
    if (filters.statuses && filters.statuses.length > 1) count++;
    if (filters.hasAttachments !== null && filters.hasAttachments !== undefined) count++;
    if (filters.hasErrors) count++;
    if (filters.reviewProcessed !== null && filters.reviewProcessed !== undefined) count++;
    if (filters.startDate || filters.endDate) count++;
    if (searchQuery) count++;
    return count;
  };

  if (loading) {
    return (
      <div className="w-[360px] flex-shrink-0 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Email Queue</h2>
        </div>
        <div className="flex-1 p-2 space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg border space-y-2">
              <div className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
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
      {/* Header with count and filters */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Email Queue</h2>
          {totalCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {totalCount}
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
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

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Status Filter */}
          <Select
            value={filters.statuses?.[0] || "all"}
            onValueChange={(value) => {
              if (value === "all") {
                handleFilterChange("statuses", undefined);
              } else {
                handleFilterChange("statuses", [value]);
              }
            }}
          >
            <SelectTrigger className="w-[110px] h-8">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={filters.sortBy || "newest"}
            onValueChange={(value: any) => handleFilterChange("sortBy", value)}
          >
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="priority">High priority</SelectItem>
              <SelectItem value="attempts">Most attempts</SelectItem>
            </SelectContent>
          </Select>

          {/* More Filters */}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 relative">
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {activeFilterCount() > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                  >
                    {activeFilterCount()}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Filters</h4>
                  {activeFilterCount() > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear all
                    </Button>
                  )}
                </div>

                {/* Attachments Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Attachments</label>
                  <Select
                    value={
                      filters.hasAttachments === true
                        ? "with"
                        : filters.hasAttachments === false
                        ? "without"
                        : "any"
                    }
                    onValueChange={(value) => {
                      if (value === "any") handleFilterChange("hasAttachments", null);
                      else if (value === "with") handleFilterChange("hasAttachments", true);
                      else handleFilterChange("hasAttachments", false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="with">With attachments</SelectItem>
                      <SelectItem value="without">No attachments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Errors Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Errors</label>
                  <Select
                    value={filters.hasErrors ? "yes" : "any"}
                    onValueChange={(value) => {
                      handleFilterChange("hasErrors", value === "yes" ? true : null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="yes">Errors only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Review Processed Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Review Processed</label>
                  <Select
                    value={
                      filters.reviewProcessed === true
                        ? "yes"
                        : filters.reviewProcessed === false
                        ? "no"
                        : "any"
                    }
                    onValueChange={(value) => {
                      if (value === "any") handleFilterChange("reviewProcessed", null);
                      else handleFilterChange("reviewProcessed", value === "yes");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Presets */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        handleFilterChange("startDate", today.toISOString());
                        handleFilterChange("endDate", undefined);
                      }}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleFilterChange("startDate", subDays(new Date(), 7).toISOString());
                        handleFilterChange("endDate", undefined);
                      }}
                    >
                      7 days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleFilterChange("startDate", subDays(new Date(), 30).toISOString());
                        handleFilterChange("endDate", undefined);
                      }}
                    >
                      30 days
                    </Button>
                    {(filters.startDate || filters.endDate) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleFilterChange("startDate", undefined);
                          handleFilterChange("endDate", undefined);
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Email List */}
      <ScrollArea className="flex-1" onScrollCapture={handleScroll} ref={scrollRef}>
        {error && (
          <Alert variant="destructive" className="m-2">
            <AlertDescription className="flex items-center justify-between">
              <span>Unable to load emails</span>
              <Button variant="outline" size="sm" onClick={() => fetchEmails(0, false)}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {emails.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground p-4">
            <Mail className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm text-center">No emails match your filters</p>
            {activeFilterCount() > 0 && (
              <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            )}
          </div>
        )}

        {emails.length > 0 && (
          <div className="p-2 space-y-1">
            {emails.map((email) => {
              const isSelected = selectedEmailId === email.id;
              const hasError = email.error_message && email.error_message.trim() !== "";

              return (
                <button
                  key={email.id}
                  onClick={() => onSelectEmail(email)}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    isSelected ? "bg-accent border-primary" : "hover:bg-accent/50"
                  }`}
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
                        <span className="font-medium text-sm truncate">
                          {getDisplayName(email)}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatDate(email)}
                        </span>
                      </div>

                      {/* Second Line: Subject */}
                      <div className="font-medium text-sm truncate">
                        {email.subject || "(no subject)"}
                      </div>

                      {/* Third Line: Snippet */}
                      {email.snippet_text && (
                        <div className="text-xs text-muted-foreground truncate">
                          {email.snippet_text}
                        </div>
                      )}

                      {/* Badges Row */}
                      <div className="flex flex-wrap gap-1 items-center">
                        <Badge variant={getStatusColor(email.status)} className="text-[10px] px-1.5 py-0">
                          {email.status}
                        </Badge>
                        {email.no_of_attachments > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                            <Paperclip className="h-2.5 w-2.5" />
                            {email.no_of_attachments}
                          </Badge>
                        )}
                        {hasError && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] px-1.5 py-0 gap-1"
                            title={email.error_message || undefined}
                          >
                            <AlertCircle className="h-2.5 w-2.5" />
                            Error
                          </Badge>
                        )}
                        {email.attempt_count > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {email.attempt_count}/{email.max_attempts}
                          </Badge>
                        )}
                      </div>
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
