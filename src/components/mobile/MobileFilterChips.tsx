import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileFilterChipsProps {
  chips: Array<{ key: string; label: string; value: string }>;
  onRemove: (key: string, value: string) => void;
}

export const MobileFilterChips: React.FC<MobileFilterChipsProps> = ({
  chips,
  onRemove,
}) => {
  return (
    <div className="px-2 py-2 border-b border-border bg-muted/30">
      <div
        className="flex gap-2 pb-1 overflow-x-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {chips.map((chip, index) => (
          <Button
            key={`${chip.key}-${chip.value}-${index}`}
            variant="outline"
            size="sm"
            className="h-7 px-2 py-1 gap-1 rounded-full bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 flex-shrink-0"
            onClick={() => onRemove(chip.key, chip.value)}
          >
            <span className="text-xs font-medium whitespace-nowrap">
              {chip.label}: {chip.value}
            </span>
            <X className="h-3 w-3" />
          </Button>
        ))}
      </div>
    </div>
  );
};
