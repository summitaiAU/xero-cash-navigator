import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileFloatingNavProps {
  currentIndex: number;
  totalInvoices: number;
  onPrevious: () => void;
  onNext: () => void;
}

export const MobileFloatingNav = ({
  currentIndex,
  totalInvoices,
  onPrevious,
  onNext,
}: MobileFloatingNavProps) => {
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < totalInvoices - 1;

  return (
    <>
      {/* Previous Button */}
      {hasPrevious && (
        <Button
          onClick={onPrevious}
          className="fixed bottom-24 left-4 h-14 w-14 rounded-full bg-primary/90 hover:bg-primary shadow-lg z-40 transition-all active:scale-95"
          size="icon"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      )}

      {/* Next Button */}
      {hasNext && (
        <Button
          onClick={onNext}
          className="fixed bottom-24 right-4 h-14 w-14 rounded-full bg-primary/90 hover:bg-primary shadow-lg z-40 transition-all active:scale-95"
          size="icon"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      )}
    </>
  );
};
