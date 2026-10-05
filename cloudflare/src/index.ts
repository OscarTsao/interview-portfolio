import { ChatRoom } from './room';
import { bitoguard } from './bitoguard';
import { nutrition, type NutritionEnv } from './nutrition';
import { CourseworkChat } from './coursework-chat';
import { store } from './store';
export { ChatRoom, CourseworkChat };

export interface Env extends NutritionEnv { ASSETS: Fetcher; DEMO_DB: D1Database; ROOMS: DurableObjectNamespace<ChatRoom>; COURSEWORK_CHAT: DurableObjectNamespace<CourseworkChat>; }
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const foods = [
  { id: 'rice', name: '示範飯碗', category: '主食', calories: 250, protein: 5, carbs: 52, fat: 2 },
  { id: 'salad', name: '示範沙拉', category: '蔬菜', calories: 120, protein: 4, carbs: 12, fat: 6 },
  { id: 'chicken', name: '示範雞肉餐', category: '蛋白質', calories: 310, protein: 32, carbs: 14, fat: 14 },
  { id: 'milk', name: '示範飲品', category: '飲品', calories: 150, protein: 8, carbs: 12, fat: 8 },
];
async function identity(request: Request) {
  const match = request.headers.get('Cookie')?.match(/(?:^|;\s*)demo_visitor=([a-f0-9]{64})(?:;|$)/);
  const sid = match?.[1] || Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sid));
  const publicId = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  return { sid, publicId, cookie: match ? null : `demo_visitor=${sid}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}` };
}
async function body(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('格式錯誤');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new Error('內容過大'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let value;
  try { value = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error('格式錯誤'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('格式錯誤');
  return value;
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if ((request.method !== 'GET' || request.headers.get('Upgrade') === 'websocket') && request.headers.get('Origin') !== url.origin) return json({ error: '請從本站操作' }, 403);
    const visitor = await identity(request);
    let response: Response;
    try {
      if (url.pathname.startsWith('/api/nutrition/')) response = await nutrition(request, env);
      else if (url.pathname.startsWith('/api/store/')) response = await store(request,env.DEMO_DB,visitor.sid);
      else if (url.pathname.startsWith('/api/bitoguard/')) response = await bitoguard(request, env, visitor.sid, body);
      else if (url.pathname === '/api/session' && request.method === 'GET') response = json({ id: visitor.publicId });
      else if (url.pathname === '/api/products' && request.method === 'GET') response = json((await env.DEMO_DB.prepare('SELECT * FROM products ORDER BY id').all()).results);
      else if (url.pathname === '/api/nutrition' && request.method === 'GET') response = json({ source: 'synthetic-interface-fixtures', foods: foods.filter(f => f.name.includes(url.searchParams.get('q') || '') || f.category.includes(url.searchParams.get('q') || '')) });
      else if (url.pathname === '/api/orders' && request.method === 'GET') response = json((await env.DEMO_DB.prepare('SELECT id, items_json, total_cents, created_at FROM orders WHERE visitor = ? ORDER BY created_at DESC LIMIT 30').bind(visitor.sid).all()).results);
      else if (url.pathname === '/api/orders' && request.method === 'POST') {
        const data = await body(request);
        if (typeof data.key !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(data.key) || !Array.isArray(data.items) || !data.items.length || data.items.length > 10) throw new Error('訂單格式錯誤');
        const products = (await env.DEMO_DB.prepare('SELECT id, name, price_cents FROM products').all<{id: string; name: string; price_cents: number}>()).results;
        const seen = new Set<string>();
        const items = data.items.map((item: {id?: unknown; quantity?: unknown}) => {
          const product = products.find(p => p.id === item.id);
          if (!product || seen.has(product.id) || !Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 9) throw new Error('商品或數量無效');
          seen.add(product.id);
          return { ...product, quantity: Number(item.quantity) };
        }).sort((a,b) => a.id.localeCompare(b.id));
        const itemsJson = JSON.stringify(items);
        const total = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
        await env.DEMO_DB.prepare('INSERT OR IGNORE INTO orders (id, visitor, request_key, items_json, total_cents, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), visitor.sid, data.key, itemsJson, total, new Date().toISOString()).run();
        const order = await env.DEMO_DB.prepare('SELECT id, items_json, total_cents, created_at FROM orders WHERE visitor = ? AND request_key = ?').bind(visitor.sid, data.key).first<{id: string; items_json: string; total_cents: number}>();
        response = order?.items_json === itemsJson ? json(order, 201) : json({ error: '同一訂單識別碼不能更換內容' }, 409);
      } else if (url.pathname === '/api/orders/reset' && request.method === 'POST') {
        await env.DEMO_DB.prepare('DELETE FROM orders WHERE visitor = ?').bind(visitor.sid).run();
        response = json({ ok: true });
      } else {
        const lobby=url.pathname.match(/^\/api\/chat\/([a-z0-9-]{1,40})\/websocket$/);
        if(lobby&&request.method==='GET'&&request.headers.get('Upgrade')==='websocket'){
          const tab=url.searchParams.get('client')||'';
          if(!/^[a-f0-9]{32}$/.test(tab))return json({error:'分頁識別碼無效'},400);
          const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(visitor.publicId+tab));
          const headers=new Headers(request.headers);headers.set('X-Demo-Identity',Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''));
          headers.set('X-Demo-Name',encodeURIComponent((url.searchParams.get('name')||'訪客').trim().slice(0,24)||'訪客'));
          return env.COURSEWORK_CHAT.get(env.COURSEWORK_CHAT.idFromName(lobby[1])).fetch(new Request(request,{headers}));
        }
        const room = url.pathname.match(/^\/api\/rooms\/([a-z0-9-]{1,40})\/websocket$/);
        if (room && request.method === 'GET' && request.headers.get('Upgrade') === 'websocket') {
          const headers = new Headers(request.headers);
          headers.set('X-Demo-Identity', visitor.publicId);
          const name = (url.searchParams.get('name') || '訪客').trim().slice(0, 24);
          headers.set('X-Demo-Name', encodeURIComponent(name));
          return env.ROOMS.get(env.ROOMS.idFromName(room[1])).fetch(new Request(request, {headers}));
        }
        response = json({ error: '找不到此功能' }, 404);
      }
    } catch (error) {
      const invalid = error instanceof Error && ['內容過大','格式錯誤','訂單格式錯誤','商品或數量無效'].includes(error.message);
      response = json({ error: invalid ? error.message : '服務暫時無法完成操作，請稍後重試' }, invalid ? 400 : 503);
    }
    if (visitor.cookie) response.headers.set('Set-Cookie', visitor.cookie);
    return response;
  }
} satisfies ExportedHandler<Env>;
