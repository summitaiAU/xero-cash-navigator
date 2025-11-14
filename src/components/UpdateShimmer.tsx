import React, { useEffect, useState } from 'react';

interface UpdateShimmerProps {
  show: boolean;
  children: React.ReactNode;
  duration?: number;
}

export const UpdateShimmer: React.FC<UpdateShimmerProps> = ({ 
  show, 
  children, 
  duration = 2000 
}) => {
  const [isShimmering, setIsShimmering] = useState(false);

  useEffect(() => {
    if (show) {
      setIsShimmering(true);
      const timer = setTimeout(() => {
        setIsShimmering(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  return (
    <div className="relative">
      {children}
      {isShimmering && (
        <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-950/30 animate-pulse pointer-events-none rounded-lg" />
      )}
    </div>
  );
};
