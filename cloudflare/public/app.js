const app = document.querySelector('#app');
const route = location.pathname.split('/')[1];
document.title = ({hw3:'E-Commerce',hw4:'Nutrition Explorer',hw5:'Chat & Game'}[route] || 'Interactive Lab') + ' — Yu-Ning Tsao';
const money = cents => new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',maximumFractionDigits:0}).format(cents/100);
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,data) {
  const response = await fetch(`/api/${path}`,data ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)} : {});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '操作失敗');
  return result;
}
function hero(label,title,text) { return `<div class="eyebrow">${label}</div><h1>${title}</h1><p>${text}</p>`; }
function fail(error) { document.querySelector('#error').textContent=error.message; }
try {
if (route === 'hw3') await store();
else if (route === 'hw4') await nutrition();
else if (route === 'hw5') await arena();
else app.innerHTML=hero('Interactive Lab','把設計，變成可操作的體驗。','選擇一個展示，探索完整的互動流程。')+`<div class="grid">${[['hw3','E-Commerce','挑選商品與模擬結帳'],['hw4','Nutrition','搜尋與比較營養展示資料'],['hw5','Chat & Arena','兩個瀏覽器一起聊天與對戰'],['bitoguard','BitoGuard','探索異常警示的分析介面']].map(([path,name,text])=>`<a class="card" href="/${path}/"><h2>${name} ↗</h2><p>${text}</p></a>`).join('')}</div>`;
} catch {
  app.innerHTML = '<h1>展示暫時無法載入</h1><p role="alert">連線或資料讀取失敗，請重新嘗試。</p><button id="retry-page">重新載入展示</button>';
  document.querySelector('#retry-page').onclick = () => location.reload();
}

async function store() {
  const products = await api('products');
  const cart = new Map();
  let pendingKey = null;
  app.innerHTML=hero('WWW / 03','小商店，完整的購物流程。','從商品目錄到訂單查詢，價格與數量由伺服器再次驗證。')+`<p class="notice">所有商品與金額都是虛構展示資料。結帳不會付款；訂單只顯示於目前瀏覽器。</p><div class="grid">${products.map(p=>`<article class="card"><span class="tag">${escape(p.category)}</span><h2>${escape(p.name)}</h2><p>${escape(p.description)}</p><div class="price">${money(p.price_cents)}</div><button data-add="${p.id}">加入購物車</button></article>`).join('')}</div><div class="split"><section class="panel"><h2>購物車</h2><div id="cart"></div><p id="total"></p><button id="checkout" disabled>模擬結帳</button><p id="error" class="error" role="alert"></p></section><section class="panel"><h2>我的展示訂單</h2><div id="orders"></div><button id="reset" class="secondary">清除我的訂單</button></section></div>`;
  function renderCart() {
    document.querySelector('#cart').innerHTML=Array.from(cart).map(([id,quantity])=>{const p=products.find(p=>p.id===id);return `<label>${escape(p.name)} <input aria-label="${escape(p.name)} 數量" type="number" min="0" max="9" value="${quantity}" data-quantity="${id}"></label>`;}).join('') || '<p>先挑選一件商品。</p>';
    document.querySelector('#total').textContent=`合計 ${money(Array.from(cart).reduce((s,[id,q])=>s+products.find(p=>p.id===id).price_cents*q,0))}`;
    document.querySelector('#checkout').disabled=!cart.size;
    document.querySelectorAll('[data-quantity]').forEach(input=>input.onchange=()=>{const q=Number(input.value);if(!Number.isInteger(q)||q<0||q>9){renderCart();return;}q?cart.set(input.dataset.quantity,q):cart.delete(input.dataset.quantity);pendingKey=null;renderCart();});
  }
  async function orders() { document.querySelector('#orders').innerHTML=(await api('orders')).map(o=>`<p><strong>${money(o.total_cents)}</strong><br><small>${escape(o.created_at)}<br>${escape(o.id)}</small></p>`).join('') || '<p>尚未建立訂單。</p>'; }
  document.querySelectorAll('[data-add]').forEach(button=>button.onclick=()=>{cart.set(button.dataset.add,Math.min(9,(cart.get(button.dataset.add)||0)+1));pendingKey=null;renderCart();});
  document.querySelector('#checkout').onclick=async()=>{const button=document.querySelector('#checkout');button.disabled=true;document.querySelector('#error').textContent='';pendingKey ||= crypto.randomUUID();try{await api('orders',{key:pendingKey,items:Array.from(cart,([id,quantity])=>({id,quantity}))});cart.clear();pendingKey=null;await orders();}catch(e){fail(e);}finally{renderCart();}};
  document.querySelector('#reset').onclick=async()=>{try{await api('orders/reset',{});await orders();}catch(e){fail(e);}};
  renderCart();await orders();
}
async function nutrition() {
  app.innerHTML=hero('WWW / 04','看懂餐盤裡的數字。','搜尋食物與比較蛋白質、碳水化合物及脂肪。')+`<p class="notice">目前使用合成介面資料，數值不代表真實食物，不提供營養建議。正式 FatSecret 串接尚未啟用。</p><label>搜尋名稱或類別 <input id="search" placeholder="例如：主食"></label><div id="foods" class="grid"></div><section class="panel"><h2>比較餐盤</h2><div id="comparison">選擇食物開始比較。</div></section><p id="error" class="error" role="alert"></p>`;
  const selected=new Map();
  async function search(){const {foods}=await api(`nutrition?q=${encodeURIComponent(document.querySelector('#search').value)}`);document.querySelector('#foods').innerHTML=foods.map(f=>`<article class="card"><span class="tag">${f.category}</span><h2>${f.name}</h2><p>${f.calories} kcal · 蛋白質 ${f.protein} g</p><button data-food="${f.id}">${selected.has(f.id)?'移除比較':'加入比較'}</button></article>`).join('') || '<p>沒有符合的展示資料。</p>';document.querySelectorAll('[data-food]').forEach(b=>b.onclick=()=>{const f=foods.find(f=>f.id===b.dataset.food);selected.has(f.id)?selected.delete(f.id):selected.set(f.id,f);document.querySelector('#comparison').innerHTML=Array.from(selected.values()).map(f=>`<h3>${f.name}</h3>${[['蛋白質',f.protein],['碳水',f.carbs],['脂肪',f.fat]].map(([n,v])=>`<small>${n} ${v} g</small><div class="bar"><span style="width:${v}%"></span></div>`).join('')}`).join('') || '選擇食物開始比較。';search().catch(fail);});}
  document.querySelector('#search').oninput=()=>search().catch(fail);await search();
}
async function arena() {
  const session=await api('session');
  let socket,state,manual=false,retries=0,room,name;
  app.innerHTML=hero('WWW / 05','一起聊天，來一場對戰。','每個房間保存最近 30 則訊息。前兩位訪客成為玩家，其餘訪客可以觀戰。')+`<div class="row"><label>暱稱 <input id="name" value="訪客" maxlength="24"></label><label>房間 <input id="room" value="interview" pattern="[a-z0-9-]{1,40}"></label><button id="join">進入房間</button><button id="leave" class="secondary" disabled>離開</button></div><p id="status" role="status">尚未連線</p><p id="error" class="error" role="alert"></p><div class="split"><section class="panel"><h2>房間聊天</h2><ul id="messages" aria-live="polite"></ul><form id="chat" class="row"><input id="message" placeholder="寫下訊息…" maxlength="400" aria-label="聊天訊息"><button id="send" disabled>送出</button></form></section><section class="panel"><h2>雙人 Arena</h2><canvas id="arena" width="600" height="300" aria-label="雙人對戰場地"></canvas><p id="players">等待兩位玩家</p><div class="row">${[['left','← 左移'],['right','右移 →'],['attack','攻擊'],['block','防禦'],['reset','重新開始']].map(([a,t])=>`<button data-action="${a}" disabled>${t}</button>`).join('')}</div><small>鍵盤：← → 移動、空白鍵攻擊、B 防禦。靠近對手才可命中。</small></section></div><p class="notice">此版改用伺服器裁決的簡化對戰；原版 WebRTC 視訊、跳躍與投射物尚未移植。</p>`;
  function controls(connected){document.querySelector('#send').disabled=!connected;document.querySelector('#leave').disabled=!connected;document.querySelectorAll('[data-action]').forEach(b=>b.disabled=!connected||!state?.fighters.some(f=>f.id===session.id));}
  function render(){document.querySelector('#messages').innerHTML=state.messages.map(m=>`<li><span class="chat-name">${escape(m.name)} · ${new Date(m.at).toLocaleTimeString('zh-TW')}</span>${escape(m.text)}</li>`).join('');document.querySelector('#messages').scrollTop=1e6;const names=new Map(state.members.map(m=>[m.id,m.name]));document.querySelector('#players').textContent=state.winner?`${names.get(state.winner)||'玩家'} 獲勝！`:state.fighters.map((f,i)=>`P${i+1} ${names.get(f.id)||'玩家'} · HP ${f.hp}${f.id===session.id?'（你）':''}`).join(' / ') || '等待玩家';const ctx=document.querySelector('canvas').getContext('2d');ctx.clearRect(0,0,600,300);ctx.strokeStyle='#57757a';ctx.beginPath();ctx.moveTo(0,240);ctx.lineTo(600,240);ctx.stroke();state.fighters.forEach((f,i)=>{ctx.fillStyle=i?'#e8ad62':'#6ed5c2';ctx.fillRect(f.x-18,175,36,65);ctx.beginPath();ctx.arc(f.x,155,16,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='14px system-ui';ctx.fillText(`P${i+1} · ${f.hp}`,f.x-30,115);});controls(socket?.readyState===1);}
  function connect(){socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/rooms/${room}/websocket?name=${encodeURIComponent(name)}`);socket.onopen=()=>{retries=0;document.querySelector('#status').textContent=`已連線 · ${room}`;};socket.onmessage=e=>{const data=JSON.parse(e.data);if(data.type==='state'){state=data;render();}else if(data.type==='error')document.querySelector('#error').textContent=data.message;};socket.onclose=e=>{controls(false);if(!manual&&e.code!==4000&&retries++<3){document.querySelector('#status').textContent='連線中斷，正在重連…';setTimeout(connect,1000*retries);}else{document.querySelector('#status').textContent=e.code===4000?'此瀏覽器已在另一分頁連線':'已離線';document.querySelector('#join').disabled=false;}};socket.onerror=()=>{document.querySelector('#error').textContent='無法連線，請確認房間與本機服務。';};}
  document.querySelector('#join').onclick=()=>{room=document.querySelector('#room').value.trim();name=document.querySelector('#name').value.trim()||'訪客';if(!/^[a-z0-9-]{1,40}$/.test(room)){document.querySelector('#error').textContent='房間只能使用小寫英文、數字與連字號，最多 40 字。';return;}manual=true;socket?.close();manual=false;state=null;document.querySelector('#join').disabled=true;document.querySelector('#error').textContent='';connect();};
  document.querySelector('#leave').onclick=()=>{manual=true;socket?.close();};
  document.querySelector('#chat').onsubmit=e=>{e.preventDefault();const input=document.querySelector('#message');if(socket?.readyState===1&&input.value.trim()){socket.send(JSON.stringify({type:'chat',text:input.value}));input.value='';}};
  function action(value){if(socket?.readyState===1&&state?.fighters.some(f=>f.id===session.id))socket.send(JSON.stringify({type:'action',action:value}));}
  document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
  document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;const value={ArrowLeft:'left',ArrowRight:'right',' ':'attack',b:'block',B:'block'}[e.key];if(value){e.preventDefault();action(value);}});
}
