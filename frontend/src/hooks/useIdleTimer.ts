"use client";
import { useEffect, useRef } from "react";

export function useIdleTimer(onIdle: () => void, onActive: () => void, timeoutMs = 60_000) {
  const timerRef    = useRef<NodeJS.Timeout | null>(null);
  // Use refs so the timer always calls the *latest* callbacks.
  // Without this, onIdle captures piSession=null at mount and incorrectly
  // triggers idle even when the Pi is connected.
  const onIdleRef   = useRef(onIdle);
  const onActiveRef = useRef(onActive);

  useEffect(() => { onIdleRef.current   = onIdle;   }, [onIdle]);
  useEffect(() => { onActiveRef.current = onActive; }, [onActive]);

  useEffect(() => {
    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onIdleRef.current(), timeoutMs);
      onActiveRef.current();
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeoutMs]);
}
