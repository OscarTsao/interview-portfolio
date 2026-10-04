import { DurableObject } from 'cloudflare:workers';
import type { Env } from './index';
type Member = { id: string; name: string; lastMessage: number; lastAction: number };
type Fighter = { id: string; x: number; hp: number; blockUntil: number; attackAt: number };
type RoomState = { messages: {id: string; name: string; text: string; at: number}[]; fighters: Fighter[]; winner: string | null };
export class ChatRoom extends DurableObject<Env> {
  private state: RoomState = { messages: [], fighters: [], winner: null };
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => { this.state = await ctx.storage.get<RoomState>('state') || this.state; });
  }
  private sockets() { return this.ctx.getWebSockets().filter(s => s.readyState === WebSocket.OPEN); }
  private members() { return this.sockets().map(s => s.deserializeAttachment() as Member).map(m => ({id:m.id,name:m.name})); }
  private send(socket: WebSocket, data: unknown) { try { socket.send(JSON.stringify(data)); } catch { /* Close events reconcile membership. */ } }
  private broadcast() {
    const data = { type: 'state', ...this.state, members: this.members() };
    for (const socket of this.sockets()) this.send(socket, data);
  }
  private async save() { await this.ctx.storage.put('state', this.state); await this.ctx.storage.setAlarm(Date.now() + 24 * 60 * 60 * 1000); }
  private reconcile() {
    const ids = new Set(this.members().map(m => m.id));
    this.state.fighters = this.state.fighters.filter(f => ids.has(f.id));
    for (const id of ids) if (this.state.fighters.length < 2 && !this.state.fighters.some(f => f.id === id)) this.state.fighters.push({id,x:this.state.fighters.length ? 430 : 170,hp:100,blockUntil:0,attackAt:0});
  }
  async fetch(request: Request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket required', {status:426});
    const id = request.headers.get('X-Demo-Identity');
    if (!id || !/^[a-f0-9]{64}$/.test(id)) return new Response('Invalid identity', {status:403});
    for (const socket of this.sockets()) if ((socket.deserializeAttachment() as Member).id === id) socket.close(4000, '已在另一分頁連線');
    if (this.sockets().length >= 8) return new Response('房間已滿', {status:429});
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.serializeAttachment({id,name:decodeURIComponent(request.headers.get('X-Demo-Name') || '訪客'),lastMessage:0,lastAction:0} satisfies Member);
    this.ctx.acceptWebSocket(server);
    this.reconcile();
    await this.save();
    this.broadcast();
    return new Response(null, {status:101,webSocket:client});
  }
  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== 'string' || raw.length > 2000) { this.send(socket, {type:'error',message:'訊息格式或長度無效'}); return; }
    const member = socket.deserializeAttachment() as Member;
    const now = Date.now();
    try {
      const data = JSON.parse(raw);
      if (data.type === 'chat' && typeof data.text === 'string' && data.text.trim() && data.text.length <= 400) {
        if (now - member.lastMessage < 600) return;
        member.lastMessage = now;
        this.state.messages.push({id:crypto.randomUUID(),name:member.name,text:data.text.trim(),at:now});
        this.state.messages = this.state.messages.slice(-30);
      } else if (data.type === 'action' && ['left','right','attack','block','reset'].includes(data.action)) {
        if (now - member.lastAction < 100) return;
        member.lastAction = now;
        const fighter = this.state.fighters.find(f => f.id === member.id);
        if (!fighter) return;
        if (data.action === 'reset') {
          this.state.winner = null;
          this.state.fighters.forEach((f,i) => Object.assign(f,{x:i ? 430 : 170,hp:100,blockUntil:0,attackAt:0}));
        } else if (!this.state.winner && this.state.fighters.length === 2) {
          if (data.action === 'left') fighter.x = Math.max(30, fighter.x - 18);
          if (data.action === 'right') fighter.x = Math.min(570, fighter.x + 18);
          if (data.action === 'block') fighter.blockUntil = now + 350;
          const opponent = this.state.fighters.find(f => f.id !== member.id)!;
          if (data.action === 'attack' && now - fighter.attackAt >= 500) {
            fighter.attackAt = now;
            if (Math.abs(fighter.x - opponent.x) <= 85) opponent.hp = Math.max(0, opponent.hp - (opponent.blockUntil > now ? 2 : 10));
            if (opponent.hp === 0) this.state.winner = fighter.id;
          }
        }
      } else { this.send(socket,{type:'error',message:'不支援的操作'}); return; }
      socket.serializeAttachment(member);
      await this.save();
      this.broadcast();
    } catch { this.send(socket,{type:'error',message:'無法讀取訊息'}); }
  }
  async webSocketClose(socket: WebSocket, code: number, reason: string) {
    socket.close(code, reason);
    this.reconcile();
    await this.save();
    this.broadcast();
  }
  async webSocketError(socket: WebSocket) { socket.close(1011,'連線中斷'); }
  async alarm() {
    if (this.sockets().length) { await this.save(); return; }
    await this.ctx.storage.deleteAll();
    this.state = {messages:[],fighters:[],winner:null};
  }
}
