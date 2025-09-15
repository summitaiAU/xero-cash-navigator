import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Rugged measurement hook that returns dynamic heights for header and nav.
 * - Measures on mount, next animation frames, window load, resize, and orientation changes
 * - Re-measures when fonts finish loading
 * - Uses ResizeObserver on the elements themselves
 * - Provides sensible fallbacks if measurement returns 0
 */
export const useSafeOffsets = (
  headerEl: HTMLElement | null,
  navEl: HTMLElement | null,
  options?: { headerFallback?: number; navFallback?: number }
) => {
  const headerFallback = options?.headerFallback ?? 64; // px
  const navFallback = options?.navFallback ?? 56; // px

  const [heights, setHeights] = useState(() => ({
    header: headerEl?.getBoundingClientRect().height || headerFallback,
    nav: navEl?.getBoundingClientRect().height || navFallback,
  }));

  const rafId = useRef<number | null>(null);
  const measure = useMemo(() => {
    const fn = () => {
      const header = Math.max(
        Math.round(headerEl?.getBoundingClientRect().height || 0),
        headerFallback
      );
      const nav = Math.max(
        Math.round(navEl?.getBoundingClientRect().height || 0),
        navFallback
      );
      setHeights({ header, nav });
    };
    return fn;
  }, [headerEl, navEl, headerFallback, navFallback]);

  useEffect(() => {
    // Initial measurement + a couple of animation frames to settle layout
    measure();
    rafId.current = requestAnimationFrame(() => {
      measure();
      rafId.current = requestAnimationFrame(() => measure());
    });

    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.addEventListener('load', onResize);

    // Fonts loading can change heights
    // @ts-ignore - not all browsers have document.fonts
    if (document.fonts?.ready) {
      // @ts-ignore
      document.fonts.ready.then(() => measure());
    }

    // ResizeObserver on elements
    const observers: ResizeObserver[] = [];
    if (headerEl) {
      const ro = new ResizeObserver(() => measure());
      ro.observe(headerEl);
      observers.push(ro);
    }
    if (navEl) {
      const ro = new ResizeObserver(() => measure());
      ro.observe(navEl);
      observers.push(ro);
    }

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.removeEventListener('load', onResize);
      observers.forEach(o => o.disconnect());
    };
  }, [measure, headerEl, navEl]);

  return {
    header: heights.header,
    nav: heights.nav,
    total: heights.header + heights.nav,
  };
};
