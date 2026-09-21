import { useState, useEffect, useRef } from 'react';

export default function Toast({ message, onHide }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!message) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onHide, 3200);
    return () => clearTimeout(timerRef.current);
  }, [message, onHide]);

  return (
    <div className={`toast${message ? ' active' : ''}`} aria-live="polite">
      {message}
    </div>
  );
}
