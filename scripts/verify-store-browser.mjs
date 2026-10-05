import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PACKAGE||process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})}),evidence=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const origin=new URL('hw3/',(process.env.DEMO_TEST_ORIGIN||'http://127.0.0.1:8787').replace(/\/?$/,'/')).href;async function route(hash){await page.goto(origin+hash);await page.reload();await page.getByText('商城已載入',{exact:true}).waitFor();}
 await route('#catalog');assert.equal(await page.locator('.product-card').count(),8);await page.getByRole('button',{name:'下一頁',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.product-card').length===2);
 await page.getByRole('button',{name:'書籍與文具',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.product-card').length===1);await page.locator('.product-card').getByRole('heading',{name:'點陣筆記本',exact:true}).waitFor();
 await route('#login');await page.getByRole('button',{name:'試用買家',exact:true}).click();await page.getByRole('link',{name:'示範買家',exact:true}).waitFor();
 await page.locator('[data-product="demo-product-1"]').getByRole('link',{name:'查看商品'}).click();await page.locator('#quantity').fill('2');await page.getByRole('button',{name:'加入購物車',exact:true}).click();await page.getByRole('link',{name:'前往結帳',exact:true}).click();await page.getByRole('button',{name:'建立模擬訂單',exact:true}).click();await page.getByText('狀態：待出貨',{exact:true}).waitFor();assert.match(await page.locator('.order-container').innerText(),/2,580/);
 await route('#login');await page.getByRole('button',{name:'試用賣家 A',exact:true}).click();await page.getByRole('link',{name:'示範賣家 A',exact:true}).waitFor();await route('#account/orders?type=sold');await page.getByRole('button',{name:'標示已出貨',exact:true}).click();await page.getByText('狀態：已出貨',{exact:true}).waitFor();
 await route('#login');await page.getByRole('button',{name:'試用買家',exact:true}).click();await page.getByRole('link',{name:'示範買家',exact:true}).waitFor();await route('#account/orders');await page.getByRole('button',{name:'確認收貨',exact:true}).click();await page.getByRole('link',{name:'歷史訂單',exact:true}).click();await page.getByText('狀態：已完成',{exact:true}).waitFor();
 evidence.push('Original categories, pagination, product details, cart, checkout, seller shipping and buyer completion');
 await route('#register');for(const[id,value]of Object.entries({account:'browseruser',email:'browser@example.test',password:'Browser123!',confirm:'Browser123!',fullname:'測試 <b>使用者</b>'}))await page.locator('#'+id).fill(value);
 await page.locator('#auth-form button').click();await page.getByRole('link',{name:'測試 <b>使用者</b>',exact:true}).waitFor();assert.equal(await page.locator('#navigation b').count(),0);
 await route('#new');for(const[id,value]of Object.entries({name:'自己的 <script>商品',price:'123.45',stock:'4',description:'可編輯的展示商品'}))await page.locator('#'+id).fill(value);await page.locator('#photos').setInputFiles(['products/realtime/pic/chat_icon.png','products/realtime/pic/user_icon.png']);await page.getByRole('button',{name:'新增商品',exact:true}).click();await page.locator('.product-card').getByText('自己的 <script>商品',{exact:true}).waitFor();assert.equal(await page.locator('.product-card script').count(),0);
 const before=await page.locator('.carousel-image').getAttribute('src');await page.getByRole('button',{name:'下一張：自己的 <script>商品',exact:true}).click();assert.notEqual(await page.locator('.carousel-image').getAttribute('src'),before);
 await page.getByRole('link',{name:'編輯',exact:true}).click();await page.locator('#stock').fill('7');await page.getByRole('button',{name:'儲存商品',exact:true}).click();await page.getByText('庫存 7 · 已售 0',{exact:true}).waitFor();
 await route('#account/profile');await page.locator('#fullname').fill('更新後的名字');await page.getByRole('button',{name:'儲存資料',exact:true}).click();await page.getByRole('link',{name:'更新後的名字',exact:true}).waitFor();
 await page.getByRole('link',{name:'聊天室',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#nickname')?.value==='更新後的名字');
 await route('#account/password');await page.locator('#currentPassword').fill('Browser123!');await page.locator('#password').fill('NewBrowser123!');await page.locator('#confirm').fill('NewBrowser123!');await page.getByRole('button',{name:'更新密碼',exact:true}).click();await page.getByText('密碼已更新',{exact:true}).waitFor();
 await page.getByRole('button',{name:'登出',exact:true}).click();await page.getByRole('link',{name:'登入',exact:true}).click();await page.locator('#account').fill('browseruser');await page.locator('#password').fill('NewBrowser123!');await page.locator('#auth-form button').click();await page.getByRole('link',{name:'更新後的名字',exact:true}).waitFor();
 evidence.push('Registration, safe text, two-photo carousel, seller editing, profile/password changes and shared chat nickname');
 const second=await browser.newPage();await second.goto(origin);await second.getByText('商城已載入',{exact:true}).waitFor();assert.equal(await second.getByText('自己的 <script>商品',{exact:true}).count(),0);await second.goto(origin+'#account/orders');await second.getByRole('heading',{name:'請先登入',exact:true}).waitFor();await second.close();
 const axe=await readFile(require.resolve('axe-core/axe.min.js'),'utf8'),issues=[];
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:960});
  for(const hash of ['#catalog','#product/demo-product-2','#cart','#login','#register','#account/profile','#account/password','#account/orders','#account/products','#account/delete','#new']){
   await route(hash);if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))issues.push({hash,width,overflow:true});
   if(hash==='#catalog'&&width<=760)assert.equal(await page.locator('.category-grid').evaluate(el=>el.firstElementChild.getBoundingClientRect().left>=el.getBoundingClientRect().left),true,'First category is reachable on mobile');
   await page.addScriptTag({content:axe});const violations=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});if(violations.length)issues.push({hash,width,violations});
  }
 }
 await route('#catalog');await page.screenshot({path:'.artifacts/store-catalog-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.artifacts/store-catalog-mobile.png'});
 await route('#account/products');await page.getByRole('button',{name:'下架',exact:true}).click();await page.locator('#confirm-no').click();assert.equal(await page.locator('.product-card').count(),1);await page.getByRole('button',{name:'下架',exact:true}).click();await page.locator('#confirm-yes').click();await page.getByText('尚未上架商品。',{exact:true}).waitFor();
 await page.route('**/api/store/state',r=>r.fulfill({status:503,json:{error:'測試暫時無法連線'}}));await page.reload();await page.locator('#retry').waitFor();await page.unroute('**/api/store/state');await page.locator('#retry').click();await page.getByText('商城已載入',{exact:true}).waitFor();
 evidence.push('Visitor isolation, 11 views at 4 widths with automated WCAG checks, cancel/confirm deletion and failed load retry');assert.deepEqual(errors,[]);
 await writeFile('.artifacts/store-browser-verification.json',JSON.stringify({at:new Date().toISOString(),evidence,issues},null,2));assert.deepEqual(issues,[]);console.log(evidence.join('\n'));
}finally{await browser.close();}
