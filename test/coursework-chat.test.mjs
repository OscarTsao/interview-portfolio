import test from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
const origin=process.env.DEMO_TEST_ORIGIN||'http://127.0.0.1:8787';
async function identity(){const r=await fetch(origin+'/api/session');return{cookie:r.headers.get('set-cookie').split(';')[0],client:crypto.randomUUID().replaceAll('-','')};}
async function until(check){const end=Date.now()+5000;while(Date.now()<end){if(check())return;await new Promise(resolve=>setTimeout(resolve,25));}assert.fail('WebSocket event timed out');}
async function join(person,lobby){
 const socket=new WebSocket(origin.replace('http','ws')+'/api/chat/'+lobby+'/websocket?name=Tester&client='+person.client,{headers:{Cookie:person.cookie,Origin:origin}}),events=[];
 socket.on('message',raw=>events.push(JSON.parse(raw.toString())));await until(()=>events.some(e=>e.type==='welcome'));
 return{socket,events,id:events.find(e=>e.type==='welcome').data.id,send:(type,data)=>socket.send(JSON.stringify({type,data}))};
}
test('coursework chat rejects forged participants and isolates lobbies, signals and game control',async()=>{
 const lobby='qa-'+crypto.randomUUID().slice(0,20),clients=[];
 try{
  const people=await Promise.all([identity(),identity(),identity(),identity()]);
  for(let i=0;i<4;i++)clients.push(await join(people[i],i===3?lobby+'-other':lobby));
  const[a,b,c,other]=clients,room=[a.id,b.id].sort().join('-');
  a.send('chat',{room:'group',text:'group-test'});await until(()=>c.events.some(e=>e.type==='message'&&e.data.text==='group-test'));
  a.send('chat',{room,text:'private-test'});await until(()=>b.events.some(e=>e.type==='message'&&e.data.text==='private-test'));
  c.send('chat',{room,text:'forged'});await until(()=>c.events.some(e=>e.type==='error'));
  a.send('signal',{target:other.id,signal:{type:'offer',sdp:'not-a-real-offer'}});await until(()=>a.events.some(e=>e.type==='error'));
  a.send('game invite',{room});await until(()=>b.events.some(e=>e.type==='game invite'));b.send('game reply',{room,accept:true});await until(()=>a.events.some(e=>e.type==='game state'));
  c.events.length=0;c.send('game input',{room,keys:{s:true},damage:999});await until(()=>c.events.some(e=>e.type==='error'));
  const match=a.events.filter(e=>e.type==='game state').at(-1).data;assert.deepEqual(match.players.map(p=>p.health),[100,100]);
  assert.equal(c.events.some(e=>['message','game state'].includes(e.type)&&e.data.room===room),false);
  assert.equal(other.events.some(e=>['message','signal','game state'].includes(e.type)),false);
  const reconnect=await join(people[0],lobby);clients.push(reconnect);assert.equal(reconnect.id,a.id);assert.ok(reconnect.events.find(e=>e.type==='welcome').data.history.some(m=>m.text==='private-test'));
  assert.equal(JSON.stringify(reconnect.events).includes(people[0].cookie.split('=')[1]),false);
 }finally{for(const c of clients)c.socket.close();}
});
