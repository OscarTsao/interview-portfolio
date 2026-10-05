import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PACKAGE||process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
const contexts=[],errors=[],evidence=[];
try{
 const pages=[];for(let i=0;i<3;i++){
  const context=await browser.newContext({viewport:{width:1440,height:960},permissions:['camera','microphone']});contexts.push(context);
  await context.addInitScript(()=>{window.mediaCalls=0;const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=(...args)=>{window.mediaCalls++;return original(...args);};window.WebSocket=new Proxy(window.WebSocket,{construct(Target,args){const socket=new Target(...args);window.qaSocket=socket;return socket;}});});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));pages.push(page);
 }
 const[a,b,c]=pages,room='qa-'+Date.now();
 for(const[page,name]of [[a,'Alice <b>'],[b,'Bob'],[c,'Carol']]){await page.goto(new URL('hw5/?lobby='+room,(process.env.DEMO_TEST_ORIGIN||'http://127.0.0.1:8787').replace(/\/?$/,'/')).href);await page.locator('#nickname').fill(name);await page.locator('#login-button').click();await page.getByText('已連線 · '+room,{exact:true}).waitFor();}
 for(const page of pages){await page.locator('#online-count').getByText('3',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.mediaCalls),0);}
 await a.locator('#msg-input').fill('<script>group-safe</script>');await a.locator('#send-btn').click();await b.locator('#messages').getByText('<script>group-safe</script>',{exact:true}).waitFor();await c.locator('#messages').getByText('<script>group-safe</script>',{exact:true}).waitFor();assert.equal(await b.locator('#messages script').count(),0);assert.equal(await b.locator('#user-list b').count(),0);
 await a.getByRole('button',{name:'Bob',exact:true}).click();await b.getByRole('button',{name:'Alice <b>',exact:true}).click();await a.locator('#msg-input').fill('private-only');await a.waitForTimeout(400);await a.locator('#send-btn').click();await b.locator('#messages').getByText('private-only',{exact:true}).waitFor();assert.equal(await c.locator('#messages').getByText('private-only',{exact:true}).count(),0);
 await a.locator('#msg-input').fill('typing');await b.locator('#typing').getByText('Alice <b> 正在輸入…',{exact:true}).waitFor();await a.locator('#msg-input').fill('');
 await a.locator('#btn-emoji').click();await a.locator('#emoji-picker').getByRole('button',{name:'👍',exact:true}).click();await a.locator('#send-btn').click();await b.locator('#messages').getByText('👍',{exact:true}).waitFor();
 await a.waitForTimeout(400);await a.locator('#image-input').setInputFiles('products/realtime/pic/chat_icon.png');await b.locator('#messages img').waitFor();await b.waitForFunction(()=>document.querySelector('#messages img').naturalWidth>0);
 evidence.push('3 browsers: presence, safe text, group/private isolation, typing, emoji and image sharing');
 await a.locator('#btn-game').click();await b.locator('#accept-invite').click();await a.locator('#game-dialog[open]').waitFor();await b.locator('#game-dialog[open]').waitFor();
 assert.equal(await c.locator('#game-dialog').isVisible(),false);
 await a.keyboard.down('3');await a.waitForTimeout(2200);await a.keyboard.up('3');
 await a.waitForFunction(()=>!document.querySelector('#health-b').textContent.includes('100 HP'));assert.equal(await a.locator('#health-b').innerText(),await b.locator('#health-b').innerText());
 await a.screenshot({path:'.artifacts/realtime-game-desktop.png',fullPage:true});await a.locator('#close-game').click();await b.locator('#game-dialog').waitFor({state:'hidden'});
 evidence.push('Game invitation, two-player projectile damage, identical health and synchronized exit');
 await a.locator('#btn-video-start').click();await b.locator('#invite-title').getByText('Alice <b> 邀請視訊',{exact:true}).waitFor();assert.equal(await b.evaluate(()=>window.mediaCalls),0);await b.locator('#decline-invite').click();await a.getByText('對方已婉拒視訊邀請',{exact:true}).waitFor();assert.equal(await a.locator('#video-local').evaluate(el=>el.srcObject),null);
 await a.locator('#btn-video-start').click();await b.locator('#invite-dialog[open]').waitFor();await a.locator('#btn-video-leave').click();await b.locator('#invite-dialog').waitFor({state:'hidden',timeout:3000});assert.equal(await b.evaluate(()=>window.mediaCalls),0);
 await a.locator('#btn-video-start').click();await b.locator('#accept-invite').click();for(const page of [a,b]){await page.getByText('視訊已連線',{exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('#video-remote').videoWidth>0);}
 await a.locator('#btn-toggle-camera').click();assert.equal(await a.locator('#video-local').evaluate(el=>el.srcObject.getVideoTracks()[0].enabled),false);
 await a.locator('#btn-toggle-mic').click();assert.equal(await a.locator('#video-local').evaluate(el=>el.srcObject.getAudioTracks()[0].enabled),false);
 await a.screenshot({path:'.artifacts/realtime-chat-desktop.png',fullPage:true});await a.locator('#btn-video-leave').click();await b.getByText('視訊已結束',{exact:true}).waitFor();for(const page of [a,b])assert.equal(await page.locator('#video-local').evaluate(el=>el.srcObject),null);
 evidence.push('Fake-device WebRTC: explicit consent, decline, actual remote video, mute/camera controls and track cleanup');
 const axe=await readFile(require.resolve('axe-core/axe.min.js'),'utf8');
 for(const width of [320,390,768,1440]){await a.setViewportSize({width,height:960});assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow ${width}`);await a.addScriptTag({content:axe});const violations=await a.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});assert.deepEqual(violations,[],`axe ${width}`);}
 await a.setViewportSize({width:390,height:844});await a.screenshot({path:'.artifacts/realtime-chat-mobile.png',fullPage:true});
 await b.evaluate(()=>window.qaSocket.close(4001,'test disconnect'));await b.locator('#reconnect').waitFor();await b.locator('#reconnect').click();await b.getByText('已連線 · '+room,{exact:true}).waitFor();await b.getByRole('button',{name:'Alice <b>',exact:true}).click();await b.locator('#messages').getByText('private-only',{exact:true}).waitFor();
 evidence.push('320/390/768/1440 layout, automated WCAG checks and reconnect restores own private messages');assert.deepEqual(errors,[]);
 await writeFile('.artifacts/realtime-browser-verification.json',JSON.stringify({at:new Date().toISOString(),evidence},null,2));console.log(evidence.join('\n'));
}finally{for(const context of contexts)await context.close();await browser.close();}
