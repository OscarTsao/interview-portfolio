export const categories=['電子與配件','家電與生活用品','服飾與配件','美妝與個人保養','食品與飲料','居家與家具','運動與戶外','汽機車配件','嬰幼兒用品','書籍與文具','其他'];
type Profile={id:string;account:string;email:string;fullname:string;address:string;phone:string;image:string;password:string;demo:boolean};
type Product={id:string;seller:string;name:string;description:string;category:string;price:number;stock:number;sold:number;images:string[];deleted:boolean};
type Item={id:string;quantity:number};
type Order={id:string;key:string;signature:string;buyer:string;seller:string;items:(Item&{name:string;price:number;image:string})[];total:number;payment:string;fullname:string;phone:string;address:string;status:'pending'|'shipped'|'completed';created:string;shipped:string|null;completed:string|null};
type Store={current:string|null;users:Profile[];products:Product[];carts:Record<string,Item[]>;orders:Order[]};
type Stored={version:number;state_json:string};
type Data=Record<string,unknown>;
class Invalid extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status;}}
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const text=(value:unknown,max:number,label:string)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new Invalid(label+'格式不正確');return value.trim();};
const integer=(value:unknown,min:number,max:number)=>{if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min||value>max)throw new Invalid('數量或金額無效');return value;};
const photo=(value:unknown)=>{if(value==='')return '';if(typeof value!=='string'||value.length>70000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))throw new Invalid('圖片格式或大小無效');return value;};
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
async function passwordHash(password:unknown,salt=crypto.randomUUID().replaceAll('-','')){
  if(typeof password!=='string'||password.length<8||password.length>128)throw new Invalid('展示密碼需為 8 至 128 字');
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const digest=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:100000},key,256);
  return salt+':'+hex(digest);
}
async function passwordMatches(value:unknown,stored:string){const hash=await passwordHash(value,stored.split(':')[0]);let difference=hash.length^stored.length;for(let i=0;i<hash.length;i++)difference|=hash.charCodeAt(i)^(stored.charCodeAt(i)||0);return difference===0;}
let demoHash:Promise<string>|undefined;
async function seed():Promise<Store>{
  const password=await(demoHash??=passwordHash('Demo123!','coursework-demo-password'));
  const users=['buyer','seller-a','seller-b'].map((id,i)=>({id,account:id,email:id+'@example.test',fullname:['示範買家','示範賣家 A','示範賣家 B'][i],address:'展示用地址，無實際配送',phone:'0000000000',image:'',password,demo:true}));
  const names=['機械鍵盤','桌上閱讀燈','日常帆布袋','保溫杯','隨行咖啡組','木製收納盒','健身彈力帶','自行車車燈','棉質圍兜','點陣筆記本'];
  const products=names.map((name,i)=>({id:'demo-product-'+(i+1),seller:i%2?'seller-b':'seller-a',name,description:`${name}的合成展示商品。可用來測試加入購物車、庫存、結帳與出貨，不提供實際交易。`,category:categories[i],price:[129000,89000,39000,68000,45000,59000,28000,72000,25000,18000][i],stock:12,sold:0,images:[],deleted:false}));
  return {current:null,users,products,carts:{},orders:[]};
}
function publicState(state:Store){
  const user=state.users.find(u=>u.id===state.current),{password:_,...profile}=user||{password:''};
  return {mode:'isolated-coursework-demo',categories,user:user?profile:null,sellers:state.users.map(u=>({id:u.id,name:u.fullname,account:u.account})),products:state.products.filter(p=>!p.deleted),cart:state.carts[state.current||'guest']||[],orders:state.orders.filter(o=>o.buyer===state.current||o.seller===state.current).map(({key:_,signature:__,...order})=>order)};
}
function requireUser(state:Store){const user=state.users.find(u=>u.id===state.current);if(!user)throw new Invalid('請先登入展示帳號',401);return user;}
function profileFields(data:Data){
  const account=text(data.account,30,'帳號'),email=text(data.email,120,'Email');
  if(!/^[A-Za-z0-9_-]{3,30}$/.test(account)||!/^\S+@\S+\.\S+$/.test(email))throw new Invalid('帳號需為 3 至 30 個英數字、底線或連字號，並提供有效 Email');
  return {account,email,fullname:text(data.fullname,60,'姓名'),address:text(data.address,180,'地址'),phone:text(data.phone,30,'電話'),image:photo(data.image||'')};
}
function uniqueAccount(state:Store,fields:{account:string;email:string},id?:string){if(state.users.some(u=>u.id!==id&&(u.account.toLowerCase()===fields.account.toLowerCase()||u.email.toLowerCase()===fields.email.toLowerCase())))throw new Invalid('此帳號或 Email 已存在',409);}
function signIn(state:Store,id:string){state.current=id;const guest=state.carts.guest||[];state.carts[id]=state.carts[id]||[];for(const item of guest){if(!state.carts[id].some(i=>i.id===item.id)&&state.products.find(p=>p.id===item.id)?.seller!==id)state.carts[id].push(item);}delete state.carts.guest;}
async function mutate(state:Store,data:Data):Promise<Data>{
  const action=data.type;
  if(action==='demo-login'){const user=state.users.find(u=>u.id===data.role&&u.demo);if(!user)throw new Invalid('展示角色不存在');signIn(state,user.id);return{};}
  if(action==='logout'){state.current=null;return{};}
  if(action==='register'){
    if(state.users.length>=8)throw new Invalid('此展示最多建立 8 個帳號');const fields=profileFields(data);uniqueAccount(state,fields);
    if(data.password!==data.confirm)throw new Invalid('兩次輸入的密碼不一致');const password=await passwordHash(data.password),id=crypto.randomUUID();state.users.push({...fields,password,id,demo:false});signIn(state,id);return{};
  }
  if(action==='login'){
    const account=text(data.account,120,'帳號'),user=state.users.find(u=>[u.account.toLowerCase(),u.email.toLowerCase()].includes(account.toLowerCase()));
    const valid=await passwordMatches(data.password,user?.password||await(demoHash??=passwordHash('Demo123!','coursework-demo-password')));if(!user||!valid)throw new Invalid('帳號或密碼不正確',401);signIn(state,user.id);return{};
  }
  if(action==='cart'){
    const product=state.products.find(p=>p.id===data.id&&!p.deleted);if(!product||product.seller===state.current)throw new Invalid('無法購買此商品');const quantity=integer(data.quantity,0,99);if(quantity>product.stock)throw new Invalid('庫存不足',409);
    const owner=state.current||'guest',cart=state.carts[owner]||[];state.carts[owner]=cart.filter(item=>item.id!==product.id);if(quantity)state.carts[owner].push({id:product.id,quantity});return{};
  }
  const user=requireUser(state);
  if(action==='profile'){const fields=profileFields(data);uniqueAccount(state,fields,user.id);Object.assign(user,fields);return{};}
  if(action==='password'){if(!await passwordMatches(data.currentPassword,user.password))throw new Invalid('目前密碼不正確');if(data.password!==data.confirm)throw new Invalid('兩次輸入的密碼不一致');user.password=await passwordHash(data.password);return{};}
  if(action==='product'){
    let product=data.id?state.products.find(p=>p.id===data.id&&!p.deleted):undefined;if(data.id&&(!product||product.seller!==user.id))throw new Invalid('無法修改其他賣家的商品',403);
    if(!product&&state.products.filter(p=>!p.deleted).length>=30)throw new Invalid('此展示最多保留 30 件商品');
    if(!categories.includes(String(data.category))||!Array.isArray(data.images)||data.images.length>2)throw new Invalid('請選擇分類，圖片最多 2 張');
    const fields={name:text(data.name,80,'商品名稱'),description:text(data.description,1600,'商品介紹'),category:String(data.category),price:integer(data.price,1,100000000),stock:integer(data.stock,0,999),images:data.images.map(photo)};
    if(product)Object.assign(product,fields);else{product={...fields,id:crypto.randomUUID(),seller:user.id,sold:0,deleted:false};state.products.push(product);}return{id:product.id};
  }
  if(action==='delete-product'){
    const product=state.products.find(p=>p.id===data.id&&!p.deleted);if(!product||product.seller!==user.id)throw new Invalid('無法刪除其他賣家的商品',403);product.deleted=true;
    for(const key of Object.keys(state.carts))state.carts[key]=state.carts[key].filter(item=>item.id!==product.id);return{};
  }
  if(action==='checkout'){
    const key=text(data.key,80,'訂單識別碼');if(!/^[a-zA-Z0-9-]{8,80}$/.test(key))throw new Invalid('訂單識別碼無效');
    if(!Array.isArray(data.items)||!data.items.length||data.items.length>20)throw new Invalid('購物車不能為空');
    const requested=data.items.map((item:unknown)=>{if(!item||typeof item!=='object'||Array.isArray(item))throw new Invalid('商品內容格式不正確');const value=item as Data;return{id:text(value.id,80,'商品'),quantity:integer(value.quantity,1,99)};}).sort((a,b)=>a.id.localeCompare(b.id));
    if(new Set(requested.map(i=>i.id)).size!==requested.length)throw new Invalid('商品不能重複');
    const payment=text(data.payment,30,'付款方式'),fullname=text(data.fullname,60,'姓名'),address=text(data.address,180,'地址'),phone=text(data.phone,30,'電話');
    if(!['信用卡（模擬）','貨到付款（模擬）','電子錢包（模擬）','銀行轉帳（模擬）'].includes(payment))throw new Invalid('付款方式無效');
    const signature=JSON.stringify({items:requested,payment,fullname,address,phone}),existing=state.orders.find(o=>o.key===key&&o.buyer===user.id);
    if(existing){if(existing.signature!==signature)throw new Invalid('相同訂單識別碼的內容不一致',409);return{orderId:existing.id};}
    if(state.orders.length>=40)throw new Invalid('此展示最多建立 40 筆訂單，請先重設展示');
    const items=requested.map(item=>{const product=state.products.find(p=>p.id===item.id&&!p.deleted);if(!product||product.seller===user.id)throw new Invalid('商品已下架或無法購買');if(item.quantity>product.stock)throw new Invalid('庫存不足',409);return{product,item};});
    const seller=items[0].product.seller;if(items.some(item=>item.product.seller!==seller))throw new Invalid('請依賣家分開結帳');
    const orderItems=items.map(({product,item})=>({id:product.id,name:product.name,price:product.price,quantity:item.quantity,image:product.images[0]||''}));
    const order:Order={id:crypto.randomUUID(),key,signature,buyer:user.id,seller,items:orderItems,total:orderItems.reduce((total,item)=>total+item.price*item.quantity,0),payment,fullname,address,phone,status:'pending',created:new Date().toISOString(),shipped:null,completed:null};
    for(const{product,item}of items){product.stock-=item.quantity;product.sold+=item.quantity;}
    state.orders.push(order);state.carts[user.id]=(state.carts[user.id]||[]).filter(item=>!requested.some(i=>i.id===item.id));return{orderId:order.id};
  }
  if(action==='order-status'){
    const order=state.orders.find(o=>o.id===data.id);if(!order)throw new Invalid('訂單不存在',404);
    if(data.status==='shipped'&&order.seller===user.id&&order.status==='pending'){order.status='shipped';order.shipped=new Date().toISOString();}
    else if(data.status==='completed'&&order.buyer===user.id&&order.status==='shipped'){order.status='completed';order.completed=new Date().toISOString();}
    else throw new Invalid('此帳號無法變更目前的訂單狀態',409);return{};
  }
  if(action==='delete-account'){
    if(data.confirm!==user.account+'@delete')throw new Invalid('刪除確認文字不符');if(state.orders.some(o=>(o.buyer===user.id||o.seller===user.id)&&o.status!=='completed'))throw new Invalid('請先完成此帳號的訂單',409);
    state.users=state.users.filter(u=>u.id!==user.id);for(const product of state.products)if(product.seller===user.id)product.deleted=true;
    const available=new Set(state.products.filter(p=>!p.deleted).map(p=>p.id));for(const key of Object.keys(state.carts))state.carts[key]=state.carts[key].filter(item=>available.has(item.id));
    delete state.carts[user.id];state.current=null;return{};
  }
  throw new Invalid('不支援的商城操作');
}
async function input(request:Request):Promise<Data>{
  const reader=request.body?.getReader();if(!reader)throw new Invalid('缺少操作內容');let total=0;const chunks:Uint8Array[]=[];
  while(true){const{value,done}=await reader.read();if(done)break;total+=value.length;if(total>200000){await reader.cancel();throw new Invalid('內容過大');}chunks.push(value);}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{const data=JSON.parse(new TextDecoder().decode(bytes));if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return data;}catch{throw new Invalid('操作內容格式不正確');}
}
export async function store(request:Request,db:D1Database,visitor:string){
  try{
    const route=new URL(request.url).pathname;
    if(!((route==='/api/store/state'&&request.method==='GET')||(route==='/api/store/action'&&request.method==='POST')))return json({error:'找不到此功能'},404);
    let row=await db.prepare('SELECT version,state_json FROM coursework_stores WHERE visitor=?').bind(visitor).first<Stored>();
    if(!row){await db.prepare('INSERT OR IGNORE INTO coursework_stores(visitor,version,state_json,updated_at) VALUES (?,0,?,?)').bind(visitor,JSON.stringify(await seed()),Date.now()).run();row=await db.prepare('SELECT version,state_json FROM coursework_stores WHERE visitor=?').bind(visitor).first<Stored>();}
    if(request.method==='GET')return json(publicState(JSON.parse(row!.state_json)));
    const data=await input(request);
    for(let attempt=0;attempt<4;attempt++){
      const state:Store=data.type==='reset'?(data.confirm===true?await seed():(()=>{throw new Invalid('請確認重設展示');})()):JSON.parse(row!.state_json);
      const result=data.type==='reset'?{}:await mutate(state,data),encoded=JSON.stringify(state);
      if(encoded.length>850000)throw new Invalid('展示儲存空間已滿，請減少商品圖片或重設展示');
      const updated=await db.prepare('UPDATE coursework_stores SET state_json=?,version=version+1,updated_at=? WHERE visitor=? AND version=?').bind(encoded,Date.now(),visitor,row!.version).run();
      if(updated.meta.changes){await db.prepare('DELETE FROM coursework_stores WHERE updated_at < ?').bind(Date.now()-86400000).run();return json({...publicState(state),...result});}
      row=await db.prepare('SELECT version,state_json FROM coursework_stores WHERE visitor=?').bind(visitor).first<Stored>();if(!row)throw new Invalid('展示已過期，請重新載入',409);
    }
    throw new Invalid('同時有其他操作，請重新載入後重試',409);
  }catch(error){return json({error:error instanceof Invalid?error.message:'商城暫時無法完成操作，請重試'},error instanceof Invalid?error.status:503);}
}
