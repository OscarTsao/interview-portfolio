import test from 'node:test';
import assert from 'node:assert/strict';
const origin=process.env.DEMO_TEST_ORIGIN||'http://127.0.0.1:8787';
async function visitor(){const r=await fetch(origin+'/api/session');return r.headers.get('set-cookie').split(';')[0];}
async function read(cookie){const r=await fetch(origin+'/api/store/state',{headers:{cookie}});assert.equal(r.status,200);return r.json();}
async function act(cookie,data){const r=await fetch(origin+'/api/store/action',{method:'POST',headers:{cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)});return{status:r.status,data:await r.json()};}
const orderData=(id,quantity=1)=>({type:'checkout',key:crypto.randomUUID(),items:[{id,quantity,price:1}],payment:'貨到付款（模擬）',fullname:'展示買家',address:'展示地址',phone:'0000000000'});
test('malformed checkout is rejected and removed sellers leave no stale cart items',async()=>{
 const cookie=await visitor();await act(cookie,{type:'demo-login',role:'buyer'});
 assert.equal((await act(cookie,{...orderData('demo-product-1'),items:[null]})).status,400);
 await act(cookie,{type:'cart',id:'demo-product-1',quantity:1});
 await act(cookie,{type:'demo-login',role:'seller-a'});
 assert.equal((await act(cookie,{type:'delete-account',confirm:'seller-a@delete'})).status,200);
 const result=await act(cookie,{type:'demo-login',role:'buyer'});
 assert.deepEqual(result.data.cart,[]);assert.equal(result.data.products.some(p=>p.seller==='seller-a'),false);
});
test('store preserves catalog, account flows, ownership, checkout, shipping and isolation',async()=>{
 const a=await visitor(),b=await visitor();let state=await read(a);assert.equal(state.products.length,10);assert.equal(state.user,null);assert.equal(JSON.stringify(state).includes('password'),false);
 assert.equal((await act(a,{type:'product'})).status,401);
 state=(await act(a,{type:'demo-login',role:'seller-a'})).data;
 let created=await act(a,{type:'product',name:'測試 <script>',description:'展示商品',price:19900,stock:3,category:state.categories[0],images:[]});assert.equal(created.status,200);const id=created.data.id;
 await act(a,{type:'demo-login',role:'buyer'});assert.equal((await act(a,{type:'delete-product',id})).status,403);
 let cart=await act(a,{type:'cart',id,quantity:2});assert.equal(cart.data.cart[0].quantity,2);
 const payload=orderData(id,2),first=await act(a,payload);assert.equal(first.status,200);const order=first.data.orders[0];assert.equal(order.total,39800);assert.equal(first.data.products.find(p=>p.id===id).stock,1);assert.equal(first.data.cart.length,0);
 const duplicate=await act(a,payload);assert.equal(duplicate.data.orderId,order.id);assert.equal(duplicate.data.orders.length,1);assert.equal((await act(a,{...payload,items:[{id,quantity:1}]})).status,409);
 assert.equal((await act(a,orderData(id,2))).status,409);assert.equal((await act(a,{type:'order-status',id:order.id,status:'completed'})).status,409);
 assert.equal((await act(a,{type:'order-status',id:order.id,status:'shipped'})).status,409);
 await act(a,{type:'demo-login',role:'seller-a'});assert.equal((await act(a,{type:'order-status',id:order.id,status:'shipped'})).data.orders[0].status,'shipped');
 await act(a,{type:'demo-login',role:'buyer'});assert.equal((await act(a,{type:'order-status',id:order.id,status:'completed'})).data.orders[0].status,'completed');
 const isolated=await read(b);assert.equal(isolated.products.some(p=>p.id===id),false);assert.equal(isolated.orders.length,0);
 const fields={account:'testuser',email:'test@example.test',fullname:'測試使用者',address:'展示用',phone:'000',image:''};
 const register=await act(a,{type:'register',...fields,password:'Example123!',confirm:'Example123!'});assert.equal(register.status,200);assert.equal(register.data.user.account,'testuser');
 assert.equal((await act(a,{type:'profile',...fields,fullname:'更新姓名'})).data.user.fullname,'更新姓名');
 assert.equal((await act(a,{type:'password',currentPassword:'wrong123',password:'Updated123!',confirm:'Updated123!'})).status,400);
 assert.equal((await act(a,{type:'password',currentPassword:'Example123!',password:'Updated123!',confirm:'Updated123!'})).status,200);
 await act(a,{type:'logout'});assert.equal((await act(a,{type:'login',account:'testuser',password:'Example123!'})).status,401);assert.equal((await act(a,{type:'login',account:'test@example.test',password:'Updated123!'})).status,200);
 assert.equal((await act(a,{type:'delete-account',confirm:'testuser@delete'})).data.user,null);
});
test('concurrent checkout decrements stock atomically and rejects forged data',async()=>{
 const cookie=await visitor();let state=await read(cookie);await act(cookie,{type:'demo-login',role:'seller-a'});
 const created=await act(cookie,{type:'product',name:'最後一件',description:'並行測試',price:3000,stock:1,category:state.categories[0],images:[]});const id=created.data.id;
 await act(cookie,{type:'demo-login',role:'buyer'});
 const results=await Promise.all([act(cookie,orderData(id)),act(cookie,orderData(id))]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);state=await read(cookie);assert.equal(state.products.find(p=>p.id===id).stock,0);assert.equal(state.orders.length,1);
 assert.equal((await act(cookie,{type:'cart',id,quantity:-1})).status,400);
 assert.equal((await act(cookie,{type:'reset',confirm:false})).status,400);
 const cross=await fetch(origin+'/api/store/action',{method:'POST',headers:{cookie,Origin:'https://other.invalid','Content-Type':'application/json'},body:JSON.stringify({type:'reset',confirm:true})});assert.equal(cross.status,403);
 const reset=await act(cookie,{type:'reset',confirm:true});assert.equal(reset.status,200);assert.equal(reset.data.products.length,10);assert.equal(reset.data.user,null);
});
