import { useEffect, useRef, useState } from 'react';
export type MeditationRecord = { date: string; seconds: number };
export function useMeditation(onComplete: () => void) {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState(false);
  const deadline = useRef(0); const total = useRef(0);
  const complete = useRef(onComplete); complete.current = onComplete;
  const [history, setHistory] = useState<MeditationRecord[]>(() => {
    try {
      const data = JSON.parse(localStorage.getItem('chua3d.meditation') || '[]');
      return Array.isArray(data) ? data.filter(item => item && typeof item.date === 'string' && Number.isFinite(item.seconds) && item.seconds > 0).slice(-100) : [];
    } catch { return []; }
  });
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(left);
      if (!left) {
        setRunning(false); setActive(false);
        setHistory(previous => {
          const next = [...previous, { date: new Date().toISOString(), seconds: total.current }].slice(-100);
          try { localStorage.setItem('chua3d.meditation', JSON.stringify(next)); } catch { /* Keep history in memory. */ }
          return next;
        });
        complete.current();
      }
    };
    const timer = setInterval(tick, 250); return () => clearInterval(timer);
  }, [running]);
  return {
    remaining, running, active, history,
    start(seconds: number) { total.current = seconds; deadline.current = Date.now() + seconds * 1000; setRemaining(seconds); setActive(true); setRunning(true); },
    pause() { setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))); setRunning(false); },
    resume() { deadline.current = Date.now() + remaining * 1000; setRunning(true); },
    stop() { setRunning(false); setActive(false); setRemaining(0); },
  };
}
