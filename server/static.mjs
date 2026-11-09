import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
export async function serveStatic(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.includes('\\') || pathname.split('/').some(part => part.startsWith('.'))) { res.writeHead(404); res.end(); return; }
    const filename = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!filename.startsWith(root + sep)) { res.writeHead(404); res.end(); return; }
    const actual = await realpath(filename);
    const actualRoot = await realpath(root);
    if (!actual.startsWith(actualRoot + sep)) { res.writeHead(404); res.end(); return; }
    const file = await stat(actual);
    if (!file.isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {
      'Content-Type': mime[extname(actual)] || 'application/octet-stream',
      'Content-Length': file.size,
      'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    if (req.method === 'HEAD') { res.end(); return; }
    const stream = createReadStream(actual);
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Không tìm thấy trang. Chạy npm run build trước khi mở game.'); }
}
