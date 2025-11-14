import { ChevronLeft, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MobileReviewHeaderProps {
  subject: string;
  onBack: () => void;
}

export const MobileReviewHeader = ({ subject, onBack }: MobileReviewHeaderProps) => {
  return (
    <div className="h-14 px-2 border-b bg-background flex items-center justify-between sticky top-0 z-50">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="h-10 w-10"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      {/* Subject (truncated) */}
      <div className="flex-1 min-w-0 px-2">
        <p className="text-sm font-semibold truncate text-center">
          {subject}
        </p>
      </div>

      {/* Overflow Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            View Full Headers
          </DropdownMenuItem>
          <DropdownMenuItem>
            Mark as Reviewed
          </DropdownMenuItem>
          <DropdownMenuItem>
            Refresh
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
