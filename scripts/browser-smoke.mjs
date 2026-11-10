// Uses an isolated Chrome instance started with --remote-debugging-port=9223.
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.TEST_URL || 'http://127.0.0.1:5174';
const debug = 'http://127.0.0.1:9223';
const testRoom = `browser-${Date.now().toString(36)}`;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
class CDP {
  constructor(socket) {
    this.socket = socket; this.id = 0; this.pending = new Map(); this.events = [];
    socket.addEventListener('message', event => {
      const data = JSON.parse(event.data);
      if (data.id) {
        const pending = this.pending.get(data.id); this.pending.delete(data.id); clearTimeout(pending?.timer);
        if (data.error) pending?.reject(new Error(data.error.message)); else pending?.resolve(data.result);
      } else this.events.push(data);
    });
  }
  static async open(url) { const socket = new WebSocket(url); await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); }); return new CDP(socket); }
  send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++this.id; const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Chrome timed out: ${method}`)); }, 45000); this.pending.set(id, { resolve, reject, timer }); this.socket.send(JSON.stringify({ id, method, params })); }); }
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description);
    return result.result.value;
  }
  async wait(expression) {
    const end = Date.now() + 20000;
    while (Date.now() < end) { if (await this.evaluate(expression)) return; await delay(200); }
    throw new Error(`Timed out: ${expression}`);
  }
  close() { this.socket.close(); }
}
const browser = await CDP.open((await (await fetch(`${debug}/json/version`)).json()).webSocketDebuggerUrl);
const contexts = [], pages = [];
async function page(width, height) {
  const { browserContextId } = await browser.send('Target.createBrowserContext'); contexts.push(browserContextId);
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const targets = await (await fetch(`${debug}/json/list`)).json();
  const target = targets.find(t => t.id === targetId);
  const tab = await CDP.open(target.webSocketDebuggerUrl); pages.push(tab);
  await tab.send('Page.bringToFront');
  await tab.send('Runtime.enable'); await tab.send('Page.enable'); await tab.send('Network.enable');
  await tab.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  if (process.env.TEST_LOW_QUALITY) await tab.send('Page.addScriptToEvaluateOnNewDocument', { source: "localStorage.setItem('chua3d.quality', 'low')" });
  await tab.send('Page.navigate', { url: `${base}/?room=${testRoom}` });
  await tab.wait(`!!document.querySelector('#entrance-name')`);
  await tab.evaluate(`(() => { const input = document.querySelector('#entrance-name'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Khách kiểm tra'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await tab.evaluate(`document.querySelector('.entrance form').requestSubmit()`);
  await tab.wait(`document.querySelector('.connection')?.textContent.includes('Đã kết nối')`);
  return tab;
}
try {
  const desktop = await page(1366, 768);
  await desktop.wait(`document.querySelector('canvas')?.width > 0`);
  if (process.env.TEMPLE_PREVIEW) {
    await delay(6800);
    const shot = await desktop.send('Page.captureScreenshot', { format: 'png' });
    await writeFile('/tmp/chua-temple-hall.png', Buffer.from(shot.data, 'base64'));
  }
  await desktop.evaluate(`document.querySelector('[aria-label="Tràng hạt"]').click()`);
  assert.equal(await desktop.evaluate(`document.querySelector('[aria-label="Tràng hạt"]').getAttribute('aria-pressed')`), 'true');
  await desktop.evaluate(`document.querySelector('[aria-label="Hồ sơ và phòng"]').click()`);
  await desktop.wait(`document.querySelector('dialog').open`);
  assert.ok(await desktop.evaluate(`document.activeElement.name === 'name'`));
  await desktop.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await desktop.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await desktop.wait(`!document.querySelector('dialog').open`);
  await desktop.evaluate(`document.querySelectorAll('.meditation-actions button')[0].click()`);
  await desktop.wait(`document.querySelector('[role="timer"]')?.textContent === '1:00'`);
  await desktop.evaluate(`document.querySelectorAll('.meditation-actions button')[0].click()`);
  await desktop.wait(`document.querySelector('.meditation-card').textContent.includes('Tiếp tục')`);
  await desktop.evaluate(`document.querySelectorAll('.meditation-actions button')[0].click(); const original = Date.now; Date.now = () => original() + 61000;`);
  await desktop.wait(`document.querySelector('.meditation-card').textContent.includes('1 thời thiền')`);
  assert.equal(await desktop.evaluate(`JSON.parse(localStorage.getItem('chua3d.meditation')).length`), 1);
  await desktop.evaluate(`location.reload()`);
  await desktop.wait(`document.querySelector('.connection')?.textContent.includes('Đã kết nối')`);
  const mobile = await page(390, 844);
  await desktop.wait(`document.querySelector('[aria-label="Người trong phòng"]').textContent.includes('2')`);
  await mobile.evaluate(`document.querySelector('[aria-label="Người trong phòng"]').click()`);
  await mobile.wait(`document.querySelectorAll('.people-panel li').length === 2`);
  assert.ok(await mobile.evaluate(`document.documentElement.scrollWidth <= innerWidth`));
  await mobile.evaluate(`document.querySelector('[aria-label="Đóng danh sách"]').click()`);
  await desktop.send('Page.bringToFront');
  await desktop.evaluate(`document.querySelector('[aria-label="Chọn đệm ngồi"]').click()`);
  await desktop.wait(`document.querySelectorAll('.seat-grid button').length === 12`);
  await desktop.evaluate(`document.querySelectorAll('.seat-grid button')[0].click()`);
  await desktop.wait(`!document.querySelector('.seats-panel')`);
  await mobile.evaluate(`document.querySelector('[aria-label="Chọn đệm ngồi"]').click()`);
  await mobile.wait(`document.querySelectorAll('.seat-grid button')[0]?.disabled`);
  await desktop.wait(`document.querySelector('[aria-label="Ngồi thiền"]').getAttribute('aria-pressed') === 'true'`);
  await desktop.evaluate(`document.querySelector('[aria-label="Đứng dậy"]').click()`);
  await mobile.wait(`document.querySelectorAll('.seat-grid button')[0]?.disabled === false`);
  await mobile.evaluate(`document.querySelectorAll('.seat-grid button')[0].click()`);
  await mobile.wait(`!document.querySelector('.seats-panel')`);
  await desktop.evaluate(`document.querySelector('[aria-label="Thỉnh chuông"]').click()`);
  await mobile.wait(`document.querySelector('.hall-notice')?.textContent.includes('vừa thỉnh chuông')`);
  await desktop.evaluate(`document.querySelector('[aria-label="Thắp hương"]').click()`);
  await desktop.wait(`!!document.querySelector('[aria-label="Tắt hương"]')`);
  await mobile.wait(`!!document.querySelector('[aria-label="Tắt hương"]')`);
  // Expire our own session and verify the UI joins again without a reload.
  const stateEvent = desktop.events.find(e => e.method === 'Network.requestWillBeSent' && e.params.request.url.endsWith('/api/state'));
  const secret = stateEvent?.params.request.headers.Authorization;
  assert.ok(secret);
  await desktop.evaluate(`fetch('/api/leave', {method:'POST',headers:{Authorization:${JSON.stringify(secret)}}})`);
  await delay(2000);
  await desktop.wait(`document.querySelector('.connection')?.textContent.includes('Đã kết nối')`);
  await desktop.wait(`document.querySelector('[aria-label="Người trong phòng"]').textContent.includes('2')`);
  await desktop.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW' });
  await delay(600);
  await desktop.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW' });
  await delay(300);
  if (process.env.STATUE_PREVIEW) {
    await desktop.send('Page.bringToFront');
    await desktop.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
    await delay(3200);
    await desktop.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
    await delay(1200);
    const shot = await desktop.send('Page.captureScreenshot', { format: 'png' });
    await writeFile('/tmp/chua-statue.png', Buffer.from(shot.data, 'base64'));
  }
  if (process.env.TEMPLE_PREVIEW) {
    await desktop.send('Page.bringToFront');
    await desktop.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 950, y: 410, button: 'left', clickCount: 1 });
    for (let i = 1; i <= 12; i++) await desktop.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 950 - i * 43.64, y: 410, buttons: 1 });
    await desktop.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 426.32, y: 410, button: 'left', clickCount: 1 });
    await delay(1300);
    const shot = await desktop.send('Page.captureScreenshot', { format: 'png' });
    await writeFile('/tmp/chua-temple-entrance.png', Buffer.from(shot.data, 'base64'));
  }
  if (process.env.CHARACTER_PREVIEW) {
    await desktop.send('Page.bringToFront');
    await desktop.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 950, y: 410, button: 'left', clickCount: 1 });
    for (let i = 1; i <= 12; i++) {
      await desktop.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 950 - i * 43.64, y: 410, buttons: 1 });
    }
    await desktop.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 426.32, y: 410, button: 'left', clickCount: 1 });
    for (const [pose, label] of [['stand', 'Đứng dậy'], ['sit', 'Ngồi thiền'], ['bow', 'Chắp tay · Lạy']]) {
      await desktop.evaluate(`document.querySelector('[aria-label="${label}"]').click()`);
      await delay(1300);
      const shot = await desktop.send('Page.captureScreenshot', { format: 'png' });
      await writeFile(`/tmp/chua-character-${pose}.png`, Buffer.from(shot.data, 'base64'));
    }
  }
  for (const [label, tab] of [['desktop', desktop], ['mobile', mobile]]) {
    const errors = tab.events.filter(e => e.method === 'Runtime.exceptionThrown');
    assert.equal(errors.length, 0, `${label}: ${JSON.stringify(errors)}`);
    const shot = await tab.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(`/tmp/chua-${label}.png`, Buffer.from(shot.data, 'base64'));
  }
  console.log('PASS: WebGL scene, rituals, modal Escape/focus, meditation pause/resume/completion/persistence, two clients, seat selection/arrival/exclusion/release, shared bell/incense, mobile layout and expired-session rejoin.');
  console.log('Screenshots: /tmp/chua-desktop.png, /tmp/chua-mobile.png');
} catch (error) {
  for (const tab of pages) console.log('Failure details:', await tab.evaluate(`({text: document.body.innerText, focus: document.activeElement?.tagName})`), JSON.stringify(tab.events.filter(e => e.method === 'Runtime.exceptionThrown')));
  throw error;
} finally {
  pages.forEach(p => p.close());
  for (const browserContextId of contexts) await browser.send('Target.disposeBrowserContext', { browserContextId });
  browser.close();
}
