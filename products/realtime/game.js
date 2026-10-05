export function setupGame({get,send,on,peer,error,invite,identity}){
 const canvas=get('game-canvas'),ctx=canvas.getContext('2d'),dialog=get('game-dialog');
 let room=null,state=null;
 const keys={l:false,r:false,j:false,close:false,def:false,s:false};
 const mappings={ArrowLeft:'l',ArrowRight:'r',ArrowUp:'j','1':'close','2':'def','3':'s',a:'l',d:'r',w:'j',j:'close',k:'def',l:'s'};
 function clearKeys(){for(const key of Object.keys(keys))keys[key]=false;for(const button of get('game-controls').children)button.classList.remove('active');}
 function close(notify=true){if(notify&&room)send('game close',{room});room=null;state=null;clearKeys();dialog.close();}
 get('btn-game').onclick=()=>{const person=peer();if(!person){error('請先選擇一位線上使用者。');return;}send('game invite',{room:[identity(),person.id].sort().join('-')});};
 on('game invite',data=>invite(`${data.name} 邀請格鬥遊戲`,'兩分鐘對戰：移動、跳躍、近身攻擊、防禦與射擊。',()=>send('game reply',{room:data.room,accept:true}),()=>send('game reply',{room:data.room,accept:false})));
 on('game ended',()=>close(false));
 on('game state',data=>{
  if(room!==data.room){clearKeys();room=data.room;get('game-result').textContent='';if(!dialog.open)dialog.showModal();}
  state=data;const role=data.players.findIndex(p=>p.id===identity());get('game-player').textContent=role===0?'Player A':'Player B';
  get('health-a').textContent='Player A · '+data.players[0].health+' HP';get('health-b').textContent='Player B · '+data.players[1].health+' HP';get('game-timer').textContent=Math.max(0,120-Math.floor(data.frame/60))+' 秒';
  if(!data.running){clearKeys();get('game-result').textContent=data.winner==='draw'?'平手':data.winner===identity()?'你贏了！':'對方獲勝';}
  draw(data);
 });
 function draw(data){
  ctx.clearRect(0,0,600,400);ctx.fillStyle='#8B4513';ctx.fillRect(0,320,600,80);
  data.players.forEach((p,i)=>{
   ctx.fillStyle=i?'#0000ff':'#00ff00';
   if(p.action==='defend'){ctx.fillRect(p.x+10,p.y+20,20,60);ctx.fillStyle='#ffff00';ctx.fillRect(p.x+(p.facing>0?30:0),p.y+10,10,40);}
   else{ctx.fillRect(p.x,p.y,40,80);if(p.action==='close'){ctx.fillStyle='#ff0000';ctx.fillRect(p.x+(p.facing>0?40:-20),p.y+30,20,10);}}
   ctx.fillStyle='#102335';ctx.font='14px Arial';ctx.fillText('Player '+(i?'B':'A'),p.x,p.y-5);
  });
  ctx.fillStyle='#ffff00';data.bullets.forEach(b=>{ctx.beginPath();ctx.arc(b.x,b.y,5,0,Math.PI*2);ctx.fill();});
 }
 for(const eventName of ['keydown','keyup'])window.addEventListener(eventName,event=>{if(!dialog.open||!state?.running)return;const key=mappings[event.key];if(key){event.preventDefault();keys[key]=eventName==='keydown';get('game-controls').querySelector(`[data-key="${key}"]`).classList.toggle('active',keys[key]);}});
 for(const button of get('game-controls').children){
  const key=button.dataset.key;
  button.onpointerdown=event=>{event.preventDefault();button.setPointerCapture(event.pointerId);keys[key]=true;button.classList.add('active');};
  button.onpointerup=button.onpointercancel=()=>{keys[key]=false;button.classList.remove('active');};
  button.onkeydown=event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();keys[key]=true;}};button.onkeyup=()=>{keys[key]=false;};
 }
 setInterval(()=>{if(room&&state?.running)send('game input',{room,keys});},50);
 window.addEventListener('blur',clearKeys);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearKeys();});
 get('close-game').onclick=()=>close();dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 return{close};
}
