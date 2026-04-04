"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const THRESHOLD = 80;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0 && window.scrollY === 0) {
      // Apply resistance
      const distance = Math.min(diff * 0.4, 120);
      setPullDistance(distance);
      setPulling(true);

      if (distance > 10) {
        e.preventDefault();
      }
    } else {
      isPulling.current = false;
      setPulling(false);
      setPullDistance(0);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }

    setPulling(false);
    setPullDistance(0);
  }, [pullDistance, onRefresh]);

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pulling, refreshing, pullDistance, threshold: THRESHOLD };
}
