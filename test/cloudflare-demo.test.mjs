import test from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
const origin=process.env.DEMO_TEST_ORIGIN || 'http://127.0.0.1:8787';
async function visitor(){const r=await fetch(`${origin}/api/session`);assert.equal(r.status,200);return {cookie:r.headers.get('set-cookie').split(';')[0],...(await r.json())};}
async function api(visitor,path,data,extra={}){const r=await fetch(`${origin}/api/${path}`,{method:data?'POST':'GET',headers:{Cookie:visitor.cookie,Origin:origin,'Content-Type':'application/json',...extra},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,data:await r.json()};}
function connection(visitor,room){const socket=new WebSocket(`${origin.replace('http','ws')}/api/rooms/${room}/websocket?name=Tester`,{headers:{Cookie:visitor.cookie,Origin:origin}});const states=[];socket.on('error',()=>{});socket.on('message',raw=>{const data=JSON.parse(raw.toString());if(data.type==='state')states.push(data);});return {socket,states};}
async function until(check){const deadline=Date.now()+5000;while(Date.now()<deadline){if(check())return;await new Promise(r=>setTimeout(r,30));}assert.fail('等待狀態逾時');}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
test('orders validate server prices, idempotency and visitor isolation',async()=>{
 const a=await visitor(),b=await visitor();
 const products=await api(a,'products');assert.equal(products.data.length,6);
 const key=crypto.randomUUID();const payload={key,items:[{id:'notebook',quantity:2,price_cents:1}]};
 const first=await api(a,'orders',payload);assert.equal(first.status,201);assert.equal(first.data.total_cents,36000);
 const repeated=await api(a,'orders',payload);assert.equal(repeated.data.id,first.data.id);
 assert.equal((await api(a,'orders',{key,items:[{id:'notebook',quantity:3}]})).status,409);
 assert.equal((await api(b,'orders')).data.length,0);
 assert.equal((await api(a,'orders',{key:crypto.randomUUID(),items:[{id:'unknown',quantity:1}]})).status,400);
 assert.equal((await api(a,'orders',{key:crypto.randomUUID(),items:[{id:'notebook',quantity:100}]})).status,400);
 const oversized=await fetch(`${origin}/api/orders`,{method:'POST',headers:{Cookie:a.cookie,Origin:origin},body:'x'.repeat(9000)});assert.equal(oversized.status,400);
 const malformed=await fetch(`${origin}/api/orders`,{method:'POST',headers:{Cookie:a.cookie,Origin:origin},body:'invalid-json'});assert.equal(malformed.status,400);
 assert.equal((await api(a,'orders/reset',{}, {Origin:'https://other.invalid'})).status,403);
 await api(b,'orders/reset',{});assert.equal((await api(a,'orders')).data.length,1);
 await api(a,'orders/reset',{});assert.equal((await api(a,'orders')).data.length,0);
});
test('room chat, isolation, server-controlled damage, spectator and reconnect',async()=>{
 const room=`test-${crypto.randomUUID().slice(0,24)}`;const a=await visitor(),b=await visitor(),c=await visitor();
 const connections=[];
 async function join(person,name){const client=connection(person,name);connections.push(client);await until(()=>client.states.length);return client;}
 try{
  // Seats follow server arrival order, so establish each test role before joining the next.
  const one=await join(a,room),two=await join(b,room),spectator=await join(c,room),isolated=await join(await visitor(),`other-${crypto.randomUUID().slice(0,24)}`);
  await until(()=>one.states.at(-1)?.members.length===3 && two.states.at(-1)?.fighters.length===2 && isolated.states.length);
  assert.deepEqual(one.states.at(-1).fighters.map(f=>f.id),[a.id,b.id]);
  one.socket.send(JSON.stringify({type:'chat',text:'room-isolated-message'}));
  await until(()=>two.states.at(-1).messages.some(m=>m.text==='room-isolated-message'));
  assert.equal(isolated.states.at(-1).messages.length,0);
  assert.equal(JSON.stringify(one.states).includes(a.cookie.split('=')[1]),false);
  spectator.socket.send(JSON.stringify({type:'action',action:'attack',damage:1000}));
  one.socket.send(JSON.stringify({type:'action',action:'attack',damage:1000,target:b.id}));
  await pause(200);assert.equal(two.states.at(-1).fighters.find(f=>f.id===b.id).hp,100);
  for(let i=0;i<11;i++){
   const before=one.states.at(-1).fighters.find(f=>f.id===a.id).x;
   one.socket.send(JSON.stringify({type:'action',action:'right'}));
   await until(()=>one.states.at(-1).fighters.find(f=>f.id===a.id).x===before+18);
   await pause(130);
  }
  await pause(500);one.socket.send(JSON.stringify({type:'action',action:'attack',damage:1000}));
  await until(()=>two.states.at(-1).fighters.find(f=>f.id===b.id).hp===90);
  // A new connection with the same cookie replaces the old tab without a third slot.
  const reconnected=connection(a,room);
  try{await until(()=>reconnected.states.at(-1)?.members.length===3);assert.equal(reconnected.states.at(-1).messages.at(-1).text,'room-isolated-message');assert.equal(reconnected.states.at(-1).fighters.filter(f=>f.id===a.id).length,1);}
  finally{reconnected.socket.close();}
 }finally{for(const client of connections)client.socket.close();}
});
test('BitoGuard preserves API contract, graph hops and visitor-specific decisions',async()=>{
 const a=await visitor(),b=await visitor();
 const list=await api(a,'bitoguard/alerts?page=1&page_size=2');assert.equal(list.data.items.length,2);assert.equal(list.data.has_next,true);
 assert.equal((await api(a,'bitoguard/alerts?risk_level=critical')).data.total,1);
 const id='demo-alert-001';
 const report=await api(a,`bitoguard/alerts/${id}/report`);assert.deepEqual(report.data.allowed_decisions,['confirm_suspicious','dismiss_false_positive','escalate','request_monitoring']);
 const one=await api(a,'bitoguard/users/demo-user-001/graph?max_hops=1');const two=await api(a,'bitoguard/users/demo-user-001/graph?max_hops=2');assert.equal(one.data.nodes.length,3);assert.equal(two.data.nodes.length,4);
 assert.equal((await api(a,`bitoguard/alerts/${id}/decision`,{decision:'escalate',actor:'analyst',note:'展示審查'})).status,200);
 assert.equal((await api(a,`bitoguard/alerts/${id}/report`)).data.case.latest_decision,'escalate');
 assert.equal((await api(b,`bitoguard/alerts/${id}/report`)).data.case.latest_decision,null);
 assert.equal((await api(a,`bitoguard/alerts/${id}/decision`,{decision:'confirm_suspicious',actor:'analyst',note:''})).status,200);
 assert.deepEqual((await api(a,`bitoguard/alerts/${id}/report`)).data.allowed_decisions,[]);
 assert.equal((await api(a,`bitoguard/alerts/${id}/decision`,{decision:'escalate',actor:'analyst',note:''})).status,409);
 assert.equal((await api(a,'bitoguard/train',{})).status,404);
});
test('BitoGuard reset reopens only this visitor cases and preserves other demo data',async()=>{
 const a=await visitor(),b=await visitor();const path='bitoguard/alerts/demo-alert-001';
 await api(a,`${path}/decision`,{decision:'confirm_suspicious',actor:'analyst',note:'closed'});
 await api(b,`${path}/decision`,{decision:'escalate',actor:'analyst',note:'keep'});
 await api(a,'orders',{key:crypto.randomUUID(),items:[{id:'notebook',quantity:1}]});
 assert.equal((await api(a,'bitoguard/demo/reset',{}, {Origin:'https://other.invalid'})).status,403);
 assert.equal((await api(a,`${path}/report`)).data.case.status,'closed_confirmed');
 assert.equal((await api(a,'bitoguard/demo/reset',{})).status,200);
 assert.equal((await api(a,`${path}/report`)).data.case.status,'open');
 assert.equal((await api(a,`${path}/report`)).data.allowed_decisions.length,4);
 assert.equal((await api(b,`${path}/report`)).data.case.latest_decision,'escalate');
 assert.equal((await api(a,'orders')).data.length,1);
 assert.equal((await api(a,'bitoguard/demo/reset',{})).status,200);
 assert.equal((await api(a,'bitoguard/demo/reset')).status,404);
 await api(a,'orders/reset',{});
});
