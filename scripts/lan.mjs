import { access } from 'node:fs/promises';
try { await access(new URL('../dist/index.html', import.meta.url)); }
catch { console.error('Chưa có bản web. Chạy npm run build rồi thử lại.'); process.exit(1); }
process.env.HOST = '0.0.0.0';
process.env.PORT ||= '4173';
await import('../server/index.mjs');
