import {setupVideo} from './video.js';
import {setupGame} from './game.js';
const get=id=>document.getElementById(id),text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
let socket=null,id='',room='group',users=[],history=[],nickname='',lobby='',typingTimer,pendingMessage='',lastContact=0;
const handlers=new Map();
const status=value=>get('status').textContent=value;
const error=value=>get('error').textContent=value;
function send(type,data){if(socket?.readyState!==WebSocket.OPEN){error('連線已中斷，請重新連線後再操作。');return false;}socket.send(JSON.stringify({type,data}));return true;}
function on(type,fn){handlers.set(type,[...(handlers.get(type)||[]),fn]);}
const peer=()=>room==='group'?null:users.find(user=>user.id!==id&&room.split('-').includes(user.id));
let invitation=null;
function invite(title,description,accept,decline){
 if(invitation){decline();return()=>{};}get('invite-title').textContent=title;get('invite-description').textContent=description;const current={accept,decline};invitation=current;get('invite-dialog').showModal();
 return()=>{if(invitation===current){invitation=null;get('invite-dialog').close();}};
}
function resolveInvite(accepted){const pending=invitation;invitation=null;get('invite-dialog').close();if(pending)(accepted?pending.accept:pending.decline)();}
get('accept-invite').onclick=()=>resolveInvite(true);get('decline-invite').onclick=()=>resolveInvite(false);get('invite-dialog').addEventListener('cancel',event=>{event.preventDefault();resolveInvite(false);});
const video=setupVideo({get,send,on,peer,error,status,invite});
const game=setupGame({get,send,on,peer,error,invite,identity:()=>id});
function selectRoom(next){
 room=next;get('chat-with').textContent=room==='group'?'群組':peer()?.name||'已離線的使用者';get('typing').textContent='';get(room==='group'?'star-group':'star-private').textContent='';renderHistory();
}
function renderHistory(){get('messages').replaceChildren(...history.filter(m=>m.room===room).map(messageNode));get('messages').scrollTop=get('messages').scrollHeight;}
function messageNode(message){const el=document.createElement('article');el.className=message.from===id?'msg-you':'msg-other';el.append(Object.assign(text('span',`${message.nickname} · ${new Date(message.at).toLocaleTimeString('zh-TW')}`),{className:'message-meta'}));if(message.image){const img=new Image();img.alt=message.nickname+' 傳送的圖片';img.src=message.image;el.append(img);}else el.append(text('span',message.text));return el;}
on('welcome',data=>{id=data.id;history=data.history;get('login-view').hidden=true;get('container').hidden=false;get('lobby-name').textContent=lobby;get('username').textContent=nickname;selectRoom('group');status('已連線 · '+lobby);get('reconnect').hidden=true;get('login-button').disabled=false;});
on('users',data=>{users=data;get('online-count').textContent=users.length;get('user-list').replaceChildren(...users.filter(user=>user.id!==id).map(user=>{const li=document.createElement('li'),button=text('button',user.name);button.type='button';button.dataset.user=user.id;button.onclick=()=>selectRoom([id,user.id].sort().join('-'));li.append(button);return li;}));if(room!=='group'&&!peer())selectRoom('group');});
on('message',message=>{if(message.from===id&&message.text===pendingMessage)pendingMessage='';history.push(message);history=history.slice(-120);if(message.room===room){get('messages').append(messageNode(message));get('messages').scrollTop=get('messages').scrollHeight;}else get(message.room==='group'?'star-group':'star-private').textContent='●';get('typing').textContent='';});
on('typing',data=>{if(data.room===room&&data.from!==id){get('typing').textContent=data.active?data.name+' 正在輸入…':'';clearTimeout(typingTimer);typingTimer=setTimeout(()=>get('typing').textContent='',1500);}});
function restorePending(){if(pendingMessage&&!get('msg-input').value)get('msg-input').value=pendingMessage;pendingMessage='';}
on('error',data=>{restorePending();error(data.message);});on('notice',data=>status(data.message));
async function connect(){
 error('');get('login-button').disabled=true;status('正在連線…');
 try{
  const session=await fetch('/api/session');if(!session.ok)throw Error('無法建立展示連線，請重試。');
  let client=sessionStorage.getItem('chat-client-id');if(!client){client=crypto.randomUUID().replaceAll('-','');sessionStorage.setItem('chat-client-id',client);}
  const address=new URL(`/api/chat/${lobby}/websocket`,location.href);address.protocol=location.protocol==='https:'?'wss:':'ws:';address.search=new URLSearchParams({name:nickname,client});
  const active=new WebSocket(address);socket=active;lastContact=Date.now();
  active.onmessage=event=>{if(socket!==active)return;lastContact=Date.now();try{const{type,data}=JSON.parse(event.data);for(const handler of handlers.get(type)||[])handler(data);}catch{error('無法讀取回傳訊息。');}};
  active.onclose=()=>{if(socket!==active)return;restorePending();video.stop(false);game.close(false);status('連線已中斷');get('reconnect').hidden=false;get('login-button').disabled=false;};
  active.onerror=()=>error('無法連線，請確認服務與房間人數後重試。');
 }catch(e){error(e.message);get('login-button').disabled=false;get('reconnect').hidden=false;}
}
get('lobby').value=new URLSearchParams(location.search).get('lobby')?.match(/^[a-z0-9-]{1,40}$/)?.[0]||'demo-'+crypto.randomUUID().slice(0,8);
get('login-form').onsubmit=event=>{event.preventDefault();nickname=get('nickname').value.trim();lobby=get('lobby').value.trim();if(!nickname)return;sessionStorage.setItem('chat-nickname',nickname);history=[];connect();};
get('nickname').value=sessionStorage.getItem('chat-nickname')||'';
if(new URLSearchParams(location.search).get('from')==='store')fetch('/api/store/state').then(response=>response.json()).then(data=>{if(data.user){get('nickname').value=data.user.fullname;status('已帶入商城暱稱，選擇房間後即可進入。');}}).catch(()=>status('可直接輸入暱稱進入聊天室。'));
get('reconnect').onclick=()=>{if(nickname&&lobby)connect();else get('nickname').focus();};
get('btn-quit').onclick=()=>{video.stop();game.close();socket?.close();socket=null;get('container').hidden=true;get('login-view').hidden=false;get('reconnect').hidden=true;status('已離開聊天室');};
get('btn-group').onclick=()=>selectRoom('group');get('btn-private').onclick=()=>{status('選擇線上使用者以開始私人對話。');get('user-list').querySelector('button')?.focus();};
get('copy-invite').onclick=async()=>{const url=new URL(location.href);url.search=new URLSearchParams({lobby});try{await navigator.clipboard.writeText(url.href);status('已複製邀請連結');}catch{status('邀請連結：'+url.href);}};
get('chat-input').onsubmit=event=>{event.preventDefault();const value=get('msg-input').value.trim();if(value&&send('chat',{room,text:value})){pendingMessage=value;get('msg-input').value='';send('typing',{room,active:false});error('');}};
let lastTyping=0;get('msg-input').oninput=()=>{if(Date.now()-lastTyping>500){send('typing',{room,active:true});lastTyping=Date.now();}};
get('btn-emoji').onclick=()=>{get('emoji-picker').hidden=!get('emoji-picker').hidden;get('btn-emoji').setAttribute('aria-expanded',String(!get('emoji-picker').hidden));};
for(const button of get('emoji-picker').querySelectorAll('button'))button.onclick=()=>{get('msg-input').value+=button.textContent;get('emoji-picker').hidden=true;get('btn-emoji').setAttribute('aria-expanded','false');get('msg-input').focus();};
get('btn-image').onclick=()=>get('image-input').click();
get('image-input').onchange=async()=>{
 const file=get('image-input').files[0];if(!file)return;
 try{
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('請選擇 5 MB 以下的 PNG、JPEG 或 WebP 圖片。');
  const bitmap=await createImageBitmap(file),scale=Math.min(1,640/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const image=canvas.toDataURL('image/jpeg',.7);if(image.length>170000)throw Error('圖片內容過大，請選擇較小的圖片。');send('image',{room,image});
 }catch(e){error(e.message);}finally{get('image-input').value='';}
};
window.addEventListener('pagehide',()=>{video.stop(false);socket?.close();});
window.addEventListener('offline',()=>socket?.close());
setInterval(()=>{if(socket?.readyState===WebSocket.OPEN){if(Date.now()-lastContact>13000)socket.close(4001,'連線逾時');else send('ping',{});}},5000);
