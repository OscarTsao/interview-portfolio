import {DurableObject} from 'cloudflare:workers';
import type {Env} from './index';
import {createMatch,idleControls,stepMatch,type Controls,type Match} from './fighter';
type Member={id:string;name:string;socket:WebSocket;messageTimes:number[];lastInput:number};
type Message={id:string;room:string;from:string;nickname:string;at:number;text?:string;image?:string};
export class CourseworkChat extends DurableObject<Env>{
  private members=new Map<string,Member>();
  private history:Message[]=[];
  private invites=new Map<string,{from:string;to:string;at:number}>();
  private matches=new Map<string,Match>();
  private inputs:Record<string,Controls>={};
  private loop:ReturnType<typeof setInterval>|null=null;
  private send(member:Member,type:string,data:unknown){try{member.socket.send(JSON.stringify({type,data}));}catch{this.leave(member);}}
  private broadcast(type:string,data:unknown){for(const member of this.members.values())this.send(member,type,data);}
  private pair(room:string){return room.split('-');}
  private authorized(member:Member,room:unknown):room is string{return room==='group'||typeof room==='string'&&/^[a-f0-9]{64}-[a-f0-9]{64}$/.test(room)&&this.pair(room).includes(member.id)&&this.pair(room).every(id=>this.members.has(id))&&this.pair(room)[0]!==this.pair(room)[1]&&this.pair(room).sort().join('-')===room;}
  private toRoom(room:string,type:string,data:unknown){for(const member of this.members.values())if(room==='group'||this.pair(room).includes(member.id))this.send(member,type,data);}
  private presence(){this.broadcast('users',[...this.members.values()].map(({id,name})=>({id,name})));}
  async fetch(request:Request){
    if(request.headers.get('Upgrade')!=='websocket')return new Response('WebSocket required',{status:426});
    const id=request.headers.get('X-Demo-Identity'),name=decodeURIComponent(request.headers.get('X-Demo-Name')||'訪客');
    if(!id||!/^[a-f0-9]{64}$/.test(id))return new Response('Invalid identity',{status:403});
    const previous=this.members.get(id);if(previous){previous.socket.close(4000,'已在其他分頁連線');this.leave(previous);}
    if(this.members.size>=8)return new Response('房間已滿',{status:429});
    const[client,server]=Object.values(new WebSocketPair());server.accept();
    const member={id,name,socket:server,messageTimes:[],lastInput:0};this.members.set(id,member);
    server.addEventListener('message',event=>this.message(member,event.data));
    server.addEventListener('close',()=>this.leave(member));server.addEventListener('error',()=>this.leave(member));
    this.send(member,'welcome',{id,history:this.history.filter(m=>m.room==='group'||this.pair(m.room).includes(id))});this.presence();
    return new Response(null,{status:101,webSocket:client});
  }
  private leave(member:Member){
    if(this.members.get(member.id)!==member)return;this.members.delete(member.id);delete this.inputs[member.id];
    for(const[room,match]of this.matches)if(match.players.some(p=>p.id===member.id)){this.toRoom(room,'game ended',{reason:'對方已離線'});this.matches.delete(room);}
    for(const[room,invite]of this.invites)if(invite.from===member.id||invite.to===member.id)this.invites.delete(room);
    this.broadcast('left',{id:member.id});this.presence();this.stopIdleLoop();
    if(!this.members.size)this.history=[];
  }
  private stopIdleLoop(){if(![...this.matches.values()].some(m=>m.running)&&this.loop){clearInterval(this.loop);this.loop=null;}}
  private startLoop(){
    if(this.loop)return;
    this.loop=setInterval(()=>{
      for(const[room,match]of this.matches){
        if(!match.running)continue;
        for(const player of match.players)if(Date.now()-(this.members.get(player.id)?.lastInput||0)>500)this.inputs[player.id]=idleControls();
        stepMatch(match,this.inputs);stepMatch(match,this.inputs);this.toRoom(room,'game state',{room,...match});
      }
      this.stopIdleLoop();
    },1000/30);
  }
  private message(member:Member,raw:unknown){
    if(this.members.get(member.id)!==member)return;
    if(typeof raw!=='string'||raw.length>180000){this.send(member,'error',{message:'訊息過大或格式不正確'});return;}
    try{
      const data=JSON.parse(raw),type=data.type,payload=data.data||{},room=payload.room,now=Date.now();
      if(type==='ping'){this.send(member,'pong',{});return;}
      if(type==='signal'){
        const peer=this.members.get(payload.target),signal=payload.signal;
        if(!peer||peer.id===member.id||!signal||!['offer','answer','ice','hangup','decline'].includes(signal.type)||JSON.stringify(signal).length>20000)throw Error('視訊對象或訊號無效');
        this.send(peer,'signal',{from:member.id,name:member.name,signal});return;
      }
      if(!this.authorized(member,room))throw Error('請選擇有效的聊天對象');
      if(type==='chat'||type==='image'){
        member.messageTimes=member.messageTimes.filter(at=>now-at<10000);
        if(member.messageTimes.length>=30)throw Error('傳送次數過多，請稍候再試');
        if(type==='chat'&&(typeof payload.text!=='string'||!payload.text.trim()||payload.text.length>1000))throw Error('訊息需為 1 至 1000 字');
        if(type==='image'&&(typeof payload.image!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(payload.image)||payload.image.length>170000))throw Error('圖片需小於 120 KB');
        member.messageTimes.push(now);
        const message:Message={id:crypto.randomUUID(),room,from:member.id,nickname:member.name,at:now,...(type==='chat'?{text:payload.text.trim()}:{image:payload.image})};
        this.history.push(message);this.history=this.history.slice(-60);this.toRoom(room,'message',message);return;
      }
      if(type==='typing'){this.toRoom(room,'typing',{room,from:member.id,name:member.name,active:payload.active===true});return;}
      if(type==='game invite'){
        if(room==='group')throw Error('請先選擇一位對手');
        const opponent=this.pair(room).find(id=>id!==member.id)!;
        if([...this.matches.values()].some(m=>m.running&&m.players.some(p=>p.id===member.id||p.id===opponent)))throw Error('其中一位玩家正在對戰');
        this.invites.set(room,{from:member.id,to:opponent,at:now});this.send(this.members.get(opponent)!,'game invite',{room,from:member.id,name:member.name});this.send(member,'notice',{message:'已送出遊戲邀請'});return;
      }
      if(type==='game reply'){
        const invite=this.invites.get(room);if(!invite||invite.to!==member.id||now-invite.at>30000)throw Error('邀請已失效');this.invites.delete(room);
        if(payload.accept!==true){this.toRoom(room,'notice',{message:'遊戲邀請已婉拒'});return;}
        if([...this.matches.values()].some(m=>m.running&&m.players.some(p=>p.id===member.id||p.id===invite.from)))throw Error('其中一位玩家正在對戰');
        const match=createMatch([invite.from,member.id]);for(const p of match.players)this.inputs[p.id]=idleControls();this.matches.set(room,match);this.toRoom(room,'game state',{room,...match});this.startLoop();return;
      }
      if(type==='game input'){
        const match=this.matches.get(room);if(!match?.running||!match.players.some(p=>p.id===member.id))throw Error('尚未開始對戰');
        if(now-member.lastInput<20)return;member.lastInput=now;
        const keys=idleControls();for(const key of Object.keys(keys)as(keyof Controls)[])keys[key]=payload.keys?.[key]===true;this.inputs[member.id]=keys;return;
      }
      if(type==='game close'){
        const match=this.matches.get(room);if(!match?.players.some(p=>p.id===member.id))return;
        this.matches.delete(room);this.toRoom(room,'game ended',{reason:'對戰已結束'});this.stopIdleLoop();return;
      }
      throw Error('不支援的操作');
    }catch(error){this.send(member,'error',{message:error instanceof Error&&error.name!=='SyntaxError'?error.message:'訊息格式不正確'});}
  }
}
