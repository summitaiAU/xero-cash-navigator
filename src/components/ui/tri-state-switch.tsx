import * as React from "react";
import { cn } from "@/lib/utils";

interface TriStateSwitchProps {
  value: 'payable' | 'paid' | 'flagged';
  onValueChange: (value: 'payable' | 'paid' | 'flagged') => void;
  className?: string;
}

const TriStateSwitch = React.forwardRef<HTMLDivElement, TriStateSwitchProps>(
  ({ value, onValueChange, className }, ref) => {
    const getPosition = () => {
      switch (value) {
        case 'payable': return 'translate-x-0';
        case 'paid': return 'translate-x-full';
        case 'flagged': return 'translate-x-[200%]';
        default: return 'translate-x-0';
      }
    };

    const getBackgroundColor = () => {
      switch (value) {
        case 'payable': return 'bg-muted';
        case 'paid': return 'bg-green-600';
        case 'flagged': return 'bg-amber-600';
        default: return 'bg-muted';
      }
    };

    const handleClick = (newValue: 'payable' | 'paid' | 'flagged') => {
      onValueChange(newValue);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex h-6 w-20 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          getBackgroundColor(),
          className
        )}
      >
        {/* Track segments */}
        <div className="absolute inset-0 flex">
          <button
            type="button"
            onClick={() => handleClick('payable')}
            className="flex-1 h-full rounded-l-full focus:outline-none"
            aria-label="Payable"
          />
          <button
            type="button"
            onClick={() => handleClick('paid')}
            className="flex-1 h-full focus:outline-none"
            aria-label="Paid"
          />
          <button
            type="button"
            onClick={() => handleClick('flagged')}
            className="flex-1 h-full rounded-r-full focus:outline-none"
            aria-label="Flagged"
          />
        </div>
        
        {/* Thumb */}
        <div
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ease-in-out",
            getPosition()
          )}
        />
      </div>
    );
  }
);

TriStateSwitch.displayName = "TriStateSwitch";

export { TriStateSwitch };