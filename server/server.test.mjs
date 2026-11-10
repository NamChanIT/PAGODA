import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

async function withServer(run) {
  const port = 31000 + Math.floor(Math.random() * 10000);
  const child = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  const base = `http://127.0.0.1:${port}`;
  const post = (path, body, token) => fetch(`${base}/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Server start timeout: ${stderr}`)), 4000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited (${code}): ${stderr}`)); });
      child.stdout.once('data', () => { clearTimeout(timer); resolve(); });
    });
    await run({ base, post });
  } finally { child.kill(); }
}

test('room streams isolate members, validate movement and remove departures', { timeout: 10000 }, () => withServer(async ({ base, post }) => {
  const first = await (await post('join', { name: 'Một', room: 'test' })).json();
  const second = await (await post('join', { name: 'Hai', room: 'test' })).json();
  await post('join', { name: 'Khác', room: 'other' });
  assert.equal((await post('join', { room: '../bad' })).status, 400);
  assert.equal((await post('join', null)).status, 400);
  assert.equal((await post('state', { x: 0, z: 0, yaw: 0, ritual: 'sit' }, 'fake')).status, 401);
  assert.equal((await post('state', { x: 'bad', z: 0, yaw: 0, ritual: 'sit' }, first.secret)).status, 400);
  const controller = new AbortController();
  try {
    const response = await fetch(`${base}/api/events?token=${first.secret}`, { signal: controller.signal });
    const reader = response.body.getReader();
    let buffer = '';
    async function snapshot() {
      while (true) {
        const index = buffer.indexOf('\n\n');
        if (index !== -1) {
          const line = buffer.slice(0, index); buffer = buffer.slice(index + 2);
          if (line.startsWith('data: ')) return JSON.parse(line.slice(6));
        } else {
          const { value, done } = await reader.read(); if (done) throw new Error('Stream closed');
          buffer += new TextDecoder().decode(value);
        }
      }
    }
    assert.equal((await snapshot()).length, 2);
    const moved = await (await post('state', { x: 999, z: -999, yaw: 3, ritual: 'bow' }, second.secret)).json();
    assert.ok(Math.hypot(moved.player.x - second.player.x, moved.player.z - second.player.z) <= .81);
    const changed = (await snapshot()).find(p => p.id === second.id);
    assert.equal(changed.ritual, 'bow'); assert.ok(Math.abs(changed.x) < 3); assert.ok(changed.z > 5);
    await post('leave', {}, second.secret);
    assert.equal((await snapshot()).length, 1);
  } finally { controller.abort(); }
}));

test('seat claims are exclusive, room-scoped and released on leave', { timeout: 10000 }, () => withServer(async ({ post }) => {
  const join = async room => (await post('join', { room })).json();
  const a = await join('test'), b = await join('test'), c = await join('other');
  const claims = await Promise.all([post('seat', { seatId: 2 }, a.secret), post('seat', { seatId: 2 }, b.secret)]);
  assert.deepEqual(claims.map(r => r.status).sort(), [200, 409]);
  assert.equal((await post('seat', { seatId: 2 }, c.secret)).status, 200);
  assert.equal((await post('seat', { seatId: -1 }, a.secret)).status, 400);
  assert.equal((await post('seat', { seatId: '2' }, a.secret)).status, 400);
  const winner = claims[0].status === 200 ? a : b, loser = winner === a ? b : a;
  await post('leave', {}, winner.secret);
  assert.equal((await post('seat', { seatId: 2 }, loser.secret)).status, 200);
  assert.equal((await post('seat', { seatId: null }, loser.secret)).status, 200);
  assert.equal((await post('state', { x: 0, z: 8, yaw: 0, ritual: 'stand' }, winner.secret)).status, 401);
}));

test('movement budget cannot be bypassed by sending rapid requests', { timeout: 10000 }, () => withServer(async ({ post }) => {
  const session = await (await post('join', { room: 'budget' })).json();
  const started = Date.now(); let player;
  for (let i = 0; i < 20; i++) {
    const response = await post('state', { x: 7.8, z: -3, yaw: 0, ritual: 'stand' }, session.secret);
    assert.equal(response.status, 200); player = (await response.json()).player;
  }
  const distance = Math.hypot(player.x - session.player.x, player.z - session.player.z);
  assert.ok(distance <= .8 + (Date.now() - started) / 1000 * 3.8, `Unexpected distance ${distance}`);
  let limited = false;
  for (let i = 0; i < 20; i++) if ((await post('state', { x: 0, z: 8, yaw: 0, ritual: 'stand' }, session.secret)).status === 429) limited = true;
  assert.ok(limited);
}));

test('24 room spawns are separated and room capacity is enforced', { timeout: 10000 }, () => withServer(async ({ post }) => {
  const players = [];
  for (let i = 0; i < 24; i++) {
    const response = await post('join', { room: 'spawn', name: `Khách ${i}` });
    assert.equal(response.status, 200);
    const { player } = await response.json();
    assert.ok(players.every(p => Math.hypot(p.x - player.x, p.z - player.z) >= 1.1));
    players.push(player);
  }
  assert.equal((await post('join', { room: 'spawn' })).status, 409);
}));

test('incense is shared per room and bell events have a room cooldown', { timeout: 10000 }, () => withServer(async ({ post, base }) => {
  const a = await (await post('join', { room: 'ritual', name: 'An' })).json();
  const b = await (await post('join', { room: 'ritual', name: 'Bình' })).json();
  const c = await (await post('join', { room: 'other' })).json();
  const controller = new AbortController();
  const response = await fetch(`${base}/api/events?token=${b.secret}`, { signal: controller.signal });
  const reader = response.body.getReader(); let buffer = '';
  async function event(kind) {
    while (true) {
      const index = buffer.indexOf('\n\n');
      if (index === -1) { const { value, done } = await reader.read(); if (done) throw new Error('Closed'); buffer += new TextDecoder().decode(value); continue; }
      const frame = buffer.slice(0, index); buffer = buffer.slice(index + 2);
      if (frame.startsWith(`event: ${kind}\n`)) return JSON.parse(frame.split('\ndata: ')[1]);
    }
  }
  try {
    assert.equal((await event('ambience')).incense, false);
    assert.equal((await post('incense', { active: 'yes' }, a.secret)).status, 400);
    assert.equal((await post('incense', { active: true }, a.secret)).status, 200);
    assert.equal((await event('ambience')).incense, true);
    assert.equal((await post('bell', {}, a.secret)).status, 200);
    assert.equal((await event('bell')).by, 'An');
    assert.equal((await post('bell', {}, b.secret)).status, 429);
    assert.equal((await post('bell', {}, c.secret)).status, 200);
    const other = await fetch(`${base}/api/events?token=${c.secret}`, { signal: controller.signal });
    const otherReader = other.body.getReader(); let initial = '';
    while (!initial.includes('event: ambience')) initial += new TextDecoder().decode((await otherReader.read()).value);
    assert.ok(initial.includes('"incense":false'));
    const late = await (await post('join', { room: 'ritual' })).json();
    const lateResponse = await fetch(`${base}/api/events?token=${late.secret}`, { signal: controller.signal });
    const lateReader = lateResponse.body.getReader(); let state = '';
    while (!state.includes('event: ambience')) state += new TextDecoder().decode((await lateReader.read()).value);
    assert.ok(state.includes('"incense":true'));
  } finally { controller.abort(); }
}));

test('expanded hall keeps rear spawn positions and allows the new side aisles', { timeout: 10000 }, () => withServer(async ({ post }) => {
  const sessions = [];
  for (let i = 0; i < 24; i++) sessions.push(await (await post('join', { room: 'expanded' })).json());
  const session = sessions.reduce((a, b) => a.player.x > b.player.x ? a : b);
  assert.ok(session.player.z > 9);
  const stationary = await (await post('state', session.player, session.secret)).json();
  assert.equal(stationary.player.z, session.player.z);
  let player = stationary.player;
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 180));
    const response = await post('state', { ...player, x: 100 }, session.secret);
    assert.equal(response.status, 200); player = (await response.json()).player;
  }
  assert.ok(player.x > 9, `New aisle inaccessible: ${player.x}`);
  assert.ok(player.x <= 12.5, 'The hall side wall must stop sideways movement');
  assert.equal((await post('seat', { seatId: 11 }, session.secret)).status, 200);
}));

test('server accepts walking through the entrance into the shared courtyard', { timeout: 10000 }, () => withServer(async ({ post }) => {
  const session = await (await post('join', { room: 'garden-walk' })).json();
  let player = session.player;
  for (let i = 0; i < 17; i++) {
    await new Promise(resolve => setTimeout(resolve, 180));
    const response = await post('state', { ...player, z: player.z + .65 }, session.secret);
    assert.equal(response.status, 200); player = (await response.json()).player;
  }
  assert.ok(player.z > 21, `Could not leave the hall: ${player.z}`);
  assert.ok(Math.abs(player.x) < 7.3, 'Walk through the central doorway');
}));

test('garden transfer releases seats and ignores stale movement before allowing normal walking', { timeout: 10000 }, () => withServer(async ({ post, base }) => {
  const a = await (await post('join', { room: 'garden-transfer' })).json();
  const b = await (await post('join', { room: 'garden-transfer' })).json();
  assert.equal((await post('garden', {}, 'invalid')).status, 401);
  assert.equal((await post('seat', { seatId: 1 }, a.secret)).status, 200);
  const transfer = await (await post('garden', {}, a.secret)).json();
  assert.equal(transfer.player.x, 0); assert.equal(transfer.player.z, 23);
  assert.equal(transfer.player.seatId, null); assert.equal(transfer.player.ritual, 'stand');
  assert.equal((await post('seat', { seatId: 1 }, b.secret)).status, 200);
  // This state was already in flight when the visitor clicked Ra sân.
  const stale = await (await post('state', { ...a.player, revision: 0 }, a.secret)).json();
  assert.equal(stale.player.z, 23);
  const controller = new AbortController();
  try {
    const response = await fetch(`${base}/api/events?token=${b.secret}`, { signal: controller.signal });
    const reader = response.body.getReader();
    let frame = '';
    while (!frame.includes('\n\n')) frame += new TextDecoder().decode((await reader.read()).value);
    const snapshot = JSON.parse(frame.split('\n')[0].slice(6));
    assert.equal(snapshot.find(player => player.id === a.id).z, 23);
  } finally { controller.abort(); }
  const moved = await (await post('state', { ...transfer.player, z: 23.1, revision: transfer.revision }, a.secret)).json();
  assert.equal(moved.player.z, 23.1, 'Walking must work after the transfer');
}));

test('built website and API share a port without exposing source files', { timeout: 10000 }, () => withServer(async ({ base }) => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const html = await response.text();
  const asset = html.match(/src="([^"]+\.js)"/)[1];
  const script = await fetch(base + asset);
  assert.equal(script.status, 200);
  assert.match(script.headers.get('content-type'), /javascript/);
  assert.match(script.headers.get('cache-control'), /immutable/);
  const head = await fetch(base + asset, { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  for (const path of ['/server/index.mjs', '/src/main.tsx', '/package.json', '/.env', '/%2e%2e/server/index.mjs', '/assets/missing.js']) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
  assert.equal((await fetch(base + '/api/missing')).status, 404);
}));
