import { useCallback, useEffect, useRef, useState } from 'react';
import type { Correction, Player } from './types';

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
async function request(path: string, body: unknown, secret = '', signal?: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 5000);
  try {
    const response = await fetch(`/api/${path}`, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(secret ? { Authorization: `Bearer ${secret}` } : {}) },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new ApiError(response.status, data.error || 'Lỗi kết nối');
    return data;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
function leave(secret: string) {
  if (secret) void fetch('/api/leave', { method: 'POST', headers: { Authorization: `Bearer ${secret}` }, keepalive: true }).catch(() => {});
}
export function useRoom(name: string, room: string) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState('Đang kết nối');
  const [connected, setConnected] = useState(false);
  const [incense, setIncense] = useState(false);
  const [bell, setBell] = useState<{ id: string; by: string } | null>(null);
  const self = useRef(''); const token = useRef('');
  const latest = useRef<Player | null>(null);
  const correction = useRef<Correction | null>(null);
  const seatId = useRef<number | null>(null);
  const generation = useRef(0);
  const seatQueue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let disposed = false, busy = false;
    let source: EventSource | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const controller = new AbortController();
    self.current = ''; token.current = ''; latest.current = null; correction.current = null; seatId.current = null;
    setPlayers([]); setConnected(false); setIncense(false); setBell(null); setStatus('Đang kết nối');
    generation.current++;
    const reconnect = () => {
      if (disposed) return;
      source?.close(); source = undefined;
      leave(token.current); token.current = ''; self.current = ''; seatId.current = null;
      generation.current++; setConnected(false); setPlayers([]);
      clearTimeout(retry); retry = setTimeout(join, Math.min(1000 * 2 ** failures++, 10000));
    };
    async function join() {
      try {
        const data = await request('join', { name, room });
        if (disposed) { leave(data.secret); return; }
        self.current = data.id; token.current = data.secret;
        correction.current = { x: data.player.x, z: data.player.z, reset: true };
        const secret = data.secret;
        source = new EventSource(`/api/events?token=${encodeURIComponent(secret)}`);
        source.onmessage = event => {
          if (disposed || token.current !== secret) return;
          try {
            const snapshot: Player[] = JSON.parse(event.data);
            if (!Array.isArray(snapshot)) return;
            setPlayers(snapshot); setConnected(true); setStatus('Đã kết nối'); failures = 0;
            seatId.current = snapshot.find(p => p.id === self.current)?.seatId ?? null;
          } catch { setStatus('Lỗi dữ liệu phòng'); }
        };
        source.addEventListener('ambience', event => {
          if (disposed || token.current !== secret) return;
          try { setIncense(JSON.parse((event as MessageEvent).data).incense === true); } catch { /* Ignore malformed events. */ }
        });
        source.addEventListener('bell', event => {
          if (disposed || token.current !== secret) return;
          try { setBell(JSON.parse((event as MessageEvent).data)); } catch { /* Ignore malformed events. */ }
        });
        source.onerror = () => {
          if (!disposed) { setConnected(false); setStatus('Đang kết nối lại'); }
        };
      } catch (error) {
        if (disposed) return;
        setStatus(error instanceof ApiError && error.status === 409 ? 'Phòng đã đủ người · đang thử lại' : 'Chế độ cá nhân · đang thử kết nối');
        reconnect();
      }
    }
    const onPageHide = () => leave(token.current);
    window.addEventListener('pagehide', onPageHide);
    void join();
    const timer = setInterval(async () => {
      if (disposed || busy || !token.current || !latest.current) return;
      busy = true;
      const secret = token.current, sent = { ...latest.current };
      try {
        const data = await request('state', sent, secret, controller.signal);
        if (disposed || token.current !== secret) return;
        // Keep input made after this request while applying the server's correction.
        const prior = correction.current;
        if (!prior?.reset) correction.current = {
          x: (prior?.x ?? 0) + data.player.x - sent.x,
          z: (prior?.z ?? 0) + data.player.z - sent.z,
        };
        if (source?.readyState === EventSource.CLOSED) reconnect();
      } catch (error) {
        if (disposed) return;
        setConnected(false); setStatus('Đang kết nối lại');
        if (error instanceof ApiError && error.status === 401) reconnect();
      } finally { busy = false; }
    }, 100);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      disposed = true; controller.abort(); source?.close(); clearInterval(timer); clearTimeout(retry);
      leave(token.current); token.current = ''; generation.current++;
    };
  }, [name, room]);

  const reserve = useCallback((id: number | null): Promise<boolean> => {
    const secret = token.current, currentGeneration = generation.current;
    const operation = seatQueue.current.catch(() => {}).then(async () => {
      if (generation.current !== currentGeneration) return false;
      if (!secret) { seatId.current = id; return true; }
      const result = await request('seat', { seatId: id }, secret);
      if (generation.current !== currentGeneration) return false;
      seatId.current = result.player.seatId;
      return true;
    });
    seatQueue.current = operation;
    return operation;
  }, []);
  const ringBell = useCallback(async () => {
    if (!token.current) { setBell({ id: String(Date.now()), by: name }); return; }
    await request('bell', {}, token.current);
  }, [name]);
  const changeIncense = useCallback(async (active: boolean) => {
    if (!token.current) { setIncense(active); return; }
    await request('incense', { active }, token.current);
  }, []);
  return { players, status, connected, self, latest, correction, seatId, reserve, incense, bell, ringBell, changeIncense };
}
