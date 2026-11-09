import http from 'node:http';
import { serveStatic } from './static.mjs';
import { networkInterfaces } from 'node:os';
import { readFileSync } from 'node:fs';
const layout = JSON.parse(readFileSync(new URL('../src/world/layout.json', import.meta.url), 'utf8'));
const bounds = layout.movement;
import { randomUUID } from 'node:crypto';
const sessions = new Map();
const rooms = new Map();
const dirtyRooms = new Set();
const roomEffects = new Map();
const seats = Array.from({ length: layout.seating.count }, (_, i) => ({ x: (i % layout.seating.columns - (layout.seating.columns - 1) / 2) * layout.seating.spacingX, z: Math.floor(i / layout.seating.columns) * layout.seating.spacingZ + layout.seating.startZ }));
const rituals = new Set(['stand', 'bow', 'sit', 'beads']);
function sendEffect(room, event, data) {
  for (const token of rooms.get(room) || []) sessions.get(token)?.stream?.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
function spawnPoint(room) {
  const players = [...(rooms.get(room) || [])].map(token => sessions.get(token).player);
  const slots = Array.from({ length: layout.spawn.count }, (_, i) => ({ x: (i % layout.spawn.columns - (layout.spawn.columns - 1) / 2) * layout.spawn.spacingX, z: layout.spawn.startZ + Math.floor(i / layout.spawn.columns) * layout.spawn.spacingZ }));
  slots.sort((a, b) => Math.hypot(a.x, a.z - layout.spawn.centerZ) - Math.hypot(b.x, b.z - layout.spawn.centerZ));
  return slots.find(slot => players.every(p => Math.hypot(p.x - slot.x, p.z - slot.z) >= 1.1)) || slots[0];
}
function broadcast(room) {
  const members = rooms.get(room);
  if (!members) return;
  const data = JSON.stringify([...members].map(token => sessions.get(token)?.player).filter(Boolean));
  for (const token of members) sessions.get(token)?.stream?.write(`data: ${data}\n\n`);
}
function leave(token) {
  const session = sessions.get(token);
  if (!session) return;
  session.stream?.end(); sessions.delete(token);
  const room = rooms.get(session.room); room?.delete(token);
  if (!room?.size) { rooms.delete(session.room); roomEffects.delete(session.room); } else broadcast(session.room);
}
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { res.writeHead(400); res.end(); return; }
  if (!url.pathname.startsWith('/api/')) return serveStatic(req, res);
  const reply = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (url.pathname === '/api/health') return reply(200, { ok: true });
  const token = req.headers.authorization?.replace('Bearer ', '') || url.searchParams.get('token');
  if (url.pathname === '/api/events') {
    const session = sessions.get(token);
    if (!session) return reply(401, { error: 'Session expired' });
    session.stream?.end();
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no', Connection: 'keep-alive' });
    session.stream = res; session.seen = Date.now(); broadcast(session.room);
    res.write(`event: ambience\ndata: ${JSON.stringify({ incense: roomEffects.get(session.room)?.incense || false })}\n\n`);
    res.on('close', () => { if (session.stream === res) session.stream = undefined; });
    return;
  }
  if (req.method !== 'POST') return reply(404, { error: 'Not found' });
  try {
    let raw = '';
    for await (const chunk of req) { raw += chunk; if (raw.length > 2048) return reply(413, { error: 'Too large' }); }
    const body = raw ? JSON.parse(raw) : {};
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { error: 'Invalid body' });
    if (url.pathname === '/api/join') {
      const room = typeof body.room === 'string' ? body.room.trim().slice(0, 24) : 'an-yen';
      if (!/^[a-z0-9-]{1,24}$/.test(room)) return reply(400, { error: 'Invalid room' });
      if ((rooms.get(room)?.size || 0) >= 24) return reply(409, { error: 'Room full' });
      if (sessions.size >= 240) return reply(503, { error: 'Server full' });
      const secret = randomUUID(); const id = randomUUID();
      const name = typeof body.name === 'string' ? body.name.trim().slice(0, 24) || 'Khách' : 'Khách';
      sessions.set(secret, { room, player: { id, name, ...spawnPoint(room), yaw: Math.PI, ritual: 'stand', seatId: null }, seen: Date.now(), movementAt: Date.now(), budget: .5, requests: 0, windowAt: Date.now() });
      if (!rooms.has(room)) rooms.set(room, new Set());
      rooms.get(room).add(secret);
      if (!roomEffects.has(room)) roomEffects.set(room, { incense: false, bellAt: 0 });
      reply(200, { id, secret, player: sessions.get(secret).player }); broadcast(room); return;
    }
    const session = sessions.get(token);
    if (!session) return reply(401, { error: 'Session expired' });
    if (url.pathname === '/api/leave') { leave(token); return reply(200, { ok: true }); }
    const requestTime = Date.now();
    if (requestTime - session.windowAt > 1000) { session.windowAt = requestTime; session.requests = 0; }
    if (++session.requests > 30) return reply(429, { error: 'Too many requests' });
    if (url.pathname === '/api/bell') {
      const effects = roomEffects.get(session.room);
      if (Date.now() - effects.bellAt < 4000) return reply(429, { error: 'Bell cooling down' });
      effects.bellAt = Date.now(); session.seen = Date.now();
      sendEffect(session.room, 'bell', { id: randomUUID(), by: session.player.name });
      return reply(200, { ok: true });
    }
    if (url.pathname === '/api/incense') {
      if (typeof body.active !== 'boolean') return reply(400, { error: 'Invalid incense state' });
      const effects = roomEffects.get(session.room); effects.incense = body.active; session.seen = Date.now();
      sendEffect(session.room, 'ambience', { incense: effects.incense });
      return reply(200, { ok: true });
    }
    if (url.pathname === '/api/seat') {
      const seatId = body.seatId;
      if (seatId !== null && (!Number.isInteger(seatId) || !seats[seatId])) return reply(400, { error: 'Invalid seat' });
      if (seatId !== null && [...rooms.get(session.room)].some(t => t !== token && sessions.get(t)?.player.seatId === seatId)) return reply(409, { error: 'Seat occupied' });
      session.player.seatId = seatId; session.seen = Date.now();
      broadcast(session.room); return reply(200, { player: session.player });
    }
    if (url.pathname !== '/api/state') return reply(404, { error: 'Not found' });
    if (![body.x, body.z, body.yaw].every(Number.isFinite) || !rituals.has(body.ritual)) return reply(400, { error: 'Invalid state' });
    const now = Date.now();
    session.budget = Math.min(.8, session.budget + (now - session.movementAt) / 1000 * 3.8);
    session.movementAt = now;
    const maxStep = session.budget;
    const dx = body.x - session.player.x, dz = body.z - session.player.z;
    const distance = Math.hypot(dx, dz); const ratio = Math.min(1, maxStep / (distance || 1));
    session.budget -= Math.min(distance, maxStep);
    session.player.x = Math.max(bounds.minX, Math.min(bounds.maxX, session.player.x + dx * ratio));
    session.player.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, session.player.z + dz * ratio));
    session.player.yaw = body.yaw % (Math.PI * 2); session.player.ritual = body.ritual; session.seen = now;
    dirtyRooms.add(session.room); reply(200, { player: session.player });
  } catch { reply(400, { error: 'Invalid request' }); }
});
setInterval(() => { for (const room of dirtyRooms) broadcast(room); dirtyRooms.clear(); }, 100).unref();
setInterval(() => {
  for (const [token, session] of sessions) {
    if (Date.now() - session.seen > 20000) leave(token);
    else session.stream?.write(': heartbeat\n\n');
  }
}, 5000).unref();
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Cổng ${port} đang được dùng. Dừng máy chủ cũ hoặc chọn PORT khác.` : error.message);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  const actualPort = server.address().port;
  console.log(`Chùa An Yên · http://127.0.0.1:${actualPort}`);
  if (host === '0.0.0.0') {
    const addresses = new Set(Object.values(networkInterfaces()).flat().filter(item => item && item.family === 'IPv4' && !item.internal).map(item => item.address));
    for (const address of addresses) console.log(`Cùng mạng: http://${address}:${actualPort}/?room=an-yen`);
    console.log('Giữ terminal này mở. Ctrl+C để dừng.');
  }
});
