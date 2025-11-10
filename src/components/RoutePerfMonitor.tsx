import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { telemetry } from '@/services/telemetry';

export const RoutePerfMonitor: React.FC = () => {
  const location = useLocation();
  const prevPathRef = useRef<string>(location.pathname);
  const routeStartRef = useRef<number>(0);

  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = prevPathRef.current;

    // Skip if same route
    if (currentPath === previousPath) {
      return;
    }

    // Log route change start
    const startTime = performance.now();
    routeStartRef.current = startTime;

    telemetry.logUIEvent('route_change_start', {
      from: previousPath,
      to: currentPath,
      timestamp: Date.now(),
    });

    console.info(`[RoutePerf] Navigation: ${previousPath} → ${currentPath}`);

    // Wait for next paint to measure route change completion
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        telemetry.logPerf('route_change_end', {
          to: currentPath,
          from: previousPath,
          duration,
          timestamp: Date.now(),
        });

        console.info(`[RoutePerf] Navigation complete: ${currentPath} (${duration.toFixed(2)}ms)`);
      });
    }, 300); // 300ms timeout for TTI-like measurement

    // Update ref
    prevPathRef.current = currentPath;

    return () => {
      clearTimeout(timeoutId);
    };
  }, [location.pathname]);

  return null;
};
