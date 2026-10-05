const get=id=>document.getElementById(id),el=(tag,value)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=value;return node;};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=cents=>new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',minimumFractionDigits:cents%100?2:0}).format(cents/100);
let state=null,busy=false,retry=null,confirmation=null,viewVersion=0;
const main=get('main');
function button(label,action,className='button'){const node=el('button',label);node.type='button';node.className=className;node.onclick=action;return node;}
function link(label,href,className='button'){const node=el('a',label);node.href=href;node.className=className;return node;}
function notice(value){get('status').textContent=value;}
function fail(error,action=null){get('error').textContent=error.message||'無法完成，請重試。';retry=action;get('retry').hidden=!action;}
async function api(data){const response=await fetch('/api/store/'+(data?'action':'state'),{...(data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(12000)});let payload;try{payload=await response.json();}catch{throw Error('商城回應無法讀取，請重試。');}if(!response.ok)throw Error(payload.error||'商城暫時無法完成操作');return payload;}
async function load(){try{state=await api();get('error').textContent='';get('retry').hidden=true;notice('商城已載入');render();}catch(error){fail(error,load);}}
async function act(data,next,success='已完成'){
 if(busy)return;busy=true;main.setAttribute('aria-busy','true');get('error').textContent='';get('retry').hidden=true;
 try{state=await api(data);notice(success);if(next&&location.hash!==next)location.hash=next;else render();return true;}
 catch(error){fail(error,()=>act(data,next,success));return false;}finally{busy=false;main.setAttribute('aria-busy','false');}
}
function confirm(title,description,action){get('confirm-title').textContent=title;get('confirm-description').textContent=description;confirmation=action;get('confirm-dialog').showModal();}
get('confirm-no').onclick=()=>{confirmation=null;get('confirm-dialog').close();};get('confirm-yes').onclick=()=>{const action=confirmation;confirmation=null;get('confirm-dialog').close();action?.();};get('confirm-dialog').addEventListener('cancel',()=>confirmation=null);
get('reset').onclick=()=>confirm('重設我的展示','將清除此瀏覽器的展示帳號、商品與訂單，並恢復初始商品。',()=>act({type:'reset',confirm:true},'#catalog','展示已重設'));
get('retry').onclick=()=>retry?.();
get('search-form').onsubmit=event=>{event.preventDefault();location.hash='#catalog?'+new URLSearchParams({q:get('search').value});};
const seller=id=>state.sellers.find(s=>s.id===id)?.name||'已刪除帳號';
function placeholder(name){const box=el('div',name);box.className='product-placeholder';box.setAttribute('role','img');box.setAttribute('aria-label',name+' · 合成展示商品，無原始照片');return box;}
function carousel(product){
 const box=el('div');box.className='carousel';if(!product.images?.length){box.append(placeholder(product.name));return box;}
 let index=0;const img=new Image();img.className='carousel-image active';img.src=product.images[0];img.alt=product.name;box.append(img);
 if(product.images.length>1){for(const[direction,label,className]of [[-1,'上一張','left'],[1,'下一張','right']]){const control=button(direction<0?'‹':'›',()=>{index=(index+direction+product.images.length)%product.images.length;img.src=product.images[index];img.alt=`${product.name}（${index+1}/${product.images.length}）`;},'carousel-button '+className);control.setAttribute('aria-label',label+'：'+product.name);box.append(control);}}
 return box;
}
function productCard(product,editable=false){
 const card=el('article');card.className='product-card';card.dataset.product=product.id;card.append(carousel(product));const info=el('div');info.className='product-info';info.append(el(editable?'h2':'h3',product.name),el('p',product.category),el('p',money(product.price)),el('p',`庫存 ${product.stock} · 已售 ${product.sold}`),el('p','賣家：'+seller(product.seller)));card.append(info);
 if(editable){const actions=el('div');actions.className='product-actions';actions.append(link('編輯','#edit/'+product.id),button('下架',()=>confirm('下架商品',`確定下架「${product.name}」？既有訂單會保留。`,()=>act({type:'delete-product',id:product.id},null,'商品已下架')),'delete'));card.append(actions);}else card.append(link('查看商品','#product/'+product.id,'view-product-button'));return card;
}
function section(title,heading='h1'){const box=el('section');box.append(el(heading,title));return box;}
function form(id,markup,submit){const node=el('form');node.id=id;node.innerHTML=markup;node.onsubmit=event=>{event.preventDefault();submit(Object.fromEntries(new FormData(node)));};return node;}
function field(name,label,value='',type='text',extra=''){return `<label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${escape(value)}" required ${extra}>`;}
function checkUser(){if(state.user)return true;main.append(el('h1','請先登入'),el('p','使用展示帳號即可完成買賣流程。'),link('前往登入','#login'));return false;}
function render(){
 if(!state)return;viewVersion++;retry=null;get('error').textContent='';get('retry').hidden=true;main.replaceChildren();const[route,query='']=location.hash.slice(1).split('?'),[view='catalog',id]=route.split('/');
 const styles={product:'product',cart:'cart',checkout:'checkout',login:'login',register:'register',account:'user',new:'edit_product',edit:'edit_product'};
 get('page-style').href='css/'+(styles[view]||'index')+'_style.css';document.body.dataset.view=view;
 const nav=get('navigation');nav.replaceChildren(link('聊天室','/hw5/?from=store','nav-link'),link('購物車 '+state.cart.reduce((sum,i)=>sum+i.quantity,0),'#cart','nav-link'));
 if(state.user)nav.append(link(state.user.fullname,'#account/profile','nav-link'),button('登出',()=>act({type:'logout'},'#catalog','已登出'),'nav-link'));else nav.append(link('登入','#login','nav-link'),link('註冊','#register','nav-link'));
 if(view==='catalog'||!view)catalog(new URLSearchParams(query));else if(view==='product')product(id);else if(view==='login'||view==='register')accountForm(view);else if(view==='cart')cart();else if(checkUser()){
  if(view==='checkout')checkout(id);else if(view==='account')account(id||'profile',new URLSearchParams(query));else if(view==='new'||view==='edit')editProduct(id);else{main.append(el('h1','找不到此頁面'),link('返回商城','#catalog'));}
 }
 document.title=(main.querySelector('h1')?.textContent||'商城')+' — My E-Commerce Website';
}
function catalog(params){
 const q=params.get('q')||'',category=params.get('category')||'全部',page=Math.max(1,Number(params.get('page'))||1);get('search').value=q;
 const heading=el('h1','商品目錄');heading.className='sr-only';main.append(heading);
 const categories=section('商品分類','h2');categories.className='categories';const grid=el('div');grid.className='category-grid';
 for(const name of ['全部',...state.categories]){const b=button(name,()=>location.hash='#catalog?'+new URLSearchParams({q,category:name}),'category-button'+(category===name?' active-category':''));b.setAttribute('aria-pressed',String(category===name));grid.append(b);}categories.append(grid);main.append(categories);
 const products=state.products.filter(p=>p.seller!==state.user?.id&&(category==='全部'||p.category===category)&&p.name.toLowerCase().includes(q.toLowerCase())),total=Math.max(1,Math.ceil(products.length/8)),current=Math.min(page,total);
 const items=section(q?'搜尋結果':'商品','h2');items.className='products';const productGrid=el('div');productGrid.className='product-grid';for(const p of products.slice((current-1)*8,current*8))productGrid.append(productCard(p));if(!products.length)productGrid.append(el('p','沒有符合條件的商品。'));items.append(productGrid);main.append(items);
 const pagination=el('nav');pagination.className='pagination';pagination.setAttribute('aria-label','商品分頁');const previous=button('上一頁',()=>location.hash='#catalog?'+new URLSearchParams({q,category,page:current-1}),'pagination-button'),next=button('下一頁',()=>location.hash='#catalog?'+new URLSearchParams({q,category,page:current+1}),'pagination-button');previous.disabled=current===1;next.disabled=current===total;pagination.append(previous,el('span',`第 ${current}／${total} 頁 · ${products.length} 件商品`),next);main.append(pagination);
}
function product(id){
 const p=state.products.find(item=>item.id===id);if(!p){main.append(el('h1','商品已下架'),link('返回商城','#catalog'));return;}main.append(link('← 返回商城','#catalog','back-button'));const box=el('section');box.className='product-container';box.append(carousel(p));const details=el('div');details.className='product-details';details.append(el('h1',p.name),el('p','賣家：'+seller(p.seller)),Object.assign(el('p',money(p.price)),{className:'product-price'}),el('p',p.description));
 const f=form('purchase-form',`${field('quantity','購買數量',1,'number',`min="1" max="${Math.min(99,p.stock)}"`)}<p>庫存 ${p.stock} · 已售 ${p.sold}</p><button class="add-to-cart-button" ${!p.stock||p.seller===state.user?.id?'disabled':''}>${!p.stock?'已售完':p.seller===state.user?.id?'這是你的商品':'加入購物車'}</button>`,data=>act({type:'cart',id:p.id,quantity:Number(data.quantity)+(state.cart.find(i=>i.id===p.id)?.quantity||0)},'#cart','商品已加入購物車'));details.append(f);box.append(details);main.append(box);
}
function accountForm(view){
 const register=view==='register',box=section(register?'註冊展示帳號':'登入商城');box.className=register?'register-container':'login-container';
 box.append(el('p','僅限此瀏覽器的展示帳號。請使用 example.test Email 與示範姓名、地址，不需填入真實個資。'));
 if(!register){const demo=el('div');demo.className='demo-roles';for(const[id,label]of [['buyer','試用買家'],['seller-a','試用賣家 A'],['seller-b','試用賣家 B']])demo.append(button(label,()=>act({type:'demo-login',role:id},'#catalog','已登入展示角色')));box.append(demo,el('p','初始帳號 buyer、seller-a、seller-b；展示密碼 Demo123!'));
 }
 const fields=field('account',register?'帳號（3–30 個英數字、底線或連字號）':'帳號或 Email','','text',register?'pattern="[A-Za-z0-9_-]{3,30}" maxlength="30" autocomplete="username"':'autocomplete="username" maxlength="120"')+(register?field('email','Email（展示用）','','email','placeholder="demo@example.test" maxlength="120"'):'')+field('password','展示密碼（至少 8 字）','','password',`minlength="8" maxlength="128" autocomplete="${register?'new-password':'current-password'}"`)+(register?field('confirm','再次輸入密碼','','password','minlength="8" maxlength="128" autocomplete="new-password"')+profileInputs({fullname:'示範使用者',address:'展示用地址',phone:'0000000000'},false):'');
 const f=form('auth-form',fields+`<button>${register?'註冊':'登入'}</button>`,async data=>{try{const image=register?await uploadOne(get('image').files[0]):'';await act({type:register?'register':'login',...data,...(register?{image}:{})},'#catalog',register?'帳號已建立':'已登入');}catch(error){fail(error);}});box.append(f,link(register?'已有帳號？登入':'建立新展示帳號',register?'#login':'#register','text-link'));main.append(box);
}
function profileInputs(user,identity=true){return(identity?field('account','帳號',user.account,'text','pattern="[A-Za-z0-9_-]{3,30}" maxlength="30"')+field('email','Email',user.email,'email','maxlength="120"'):'')+field('fullname','姓名（展示用）',user.fullname,'text','maxlength="60"')+field('address','地址（展示用）',user.address,'text','maxlength="180"')+field('phone','電話（展示用）',user.phone,'tel','maxlength="30"')+'<label for="image">頭像（選填）</label><input id="image" type="file" accept="image/png,image/jpeg,image/webp"><div id="image-preview"></div>';}
function itemRow(product,quantity,heading='h3'){const row=el('div');row.className='product-item';if(product.image||product.images?.[0]){const img=new Image();img.src=product.image||product.images[0];img.alt=product.name;row.append(img);}else row.append(placeholder(product.name));const info=el('div');info.className='product-details';info.append(el(heading,product.name),el('p',`${money(product.price)} × ${quantity} = ${money(product.price*quantity)}`));row.append(info);return row;}
function cart(){
 main.append(el('h1','購物車'));const groups=Map.groupBy(state.cart.map(i=>({...i,product:state.products.find(p=>p.id===i.id)})).filter(i=>i.product),item=>item.product.seller);
 if(!groups.size){main.append(el('p','購物車尚無商品。'),link('開始選購','#catalog'));return;}
 for(const[sellerId,items]of groups){const box=section('賣家：'+seller(sellerId),'h2');box.className='order-container';let total=0;
  for(const{product,quantity}of items){const row=itemRow(product,quantity),label=el('label','数量：'),input=el('input');input.type='number';input.value=quantity;input.min=0;input.max=Math.min(99,product.stock);input.setAttribute('aria-label',product.name+' 的數量');label.append(input);row.append(label,button('更新',()=>act({type:'cart',id:product.id,quantity:Number(input.value)},null,'購物車已更新')),button('移除',()=>act({type:'cart',id:product.id,quantity:0},null,'商品已移除'),'delete'));total+=product.price*quantity;box.append(row);}
  box.append(el('p','小計：'+money(total)),link('前往結帳',state.user?'#checkout/'+sellerId:'#login','checkout-button'));main.append(box);
 }
}
function checkout(sellerId){
 const items=state.cart.filter(i=>state.products.find(p=>p.id===i.id)?.seller===sellerId);if(!items.length){main.append(el('h1','此賣家的購物車為空'),link('返回購物車','#cart'));return;}
 const box=section('結帳');box.className='checkout-container';let total=0;for(const item of items){const p=state.products.find(p=>p.id===item.id);box.append(itemRow(p,item.quantity,'h2'));total+=p.price*item.quantity;}box.append(el('h2','總計：'+money(total)),el('p','這是模擬訂單，不會要求信用卡資料或實際付款。'));
 const draft=JSON.stringify({user:state.user.id,items});let key;
 try{const saved=JSON.parse(sessionStorage.getItem('store-checkout')||'null');key=saved?.draft===draft?saved.key:crypto.randomUUID();sessionStorage.setItem('store-checkout',JSON.stringify({draft,key}));}catch{key=crypto.randomUUID();}
 const payments=['信用卡（模擬）','貨到付款（模擬）','電子錢包（模擬）','銀行轉帳（模擬）'];
 const f=form('checkout-form','<fieldset><legend>付款方式</legend>'+payments.map((p,i)=>`<label class="radio"><input type="radio" name="payment" value="${p}" ${i===1?'checked':''} required>${p}</label>`).join('')+'</fieldset>'+field('fullname','收件人（展示用）',state.user.fullname)+field('address','收件地址（展示用）',state.user.address)+field('phone','電話（展示用）',state.user.phone,'tel')+'<button class="place-order-button">建立模擬訂單</button>',data=>act({type:'checkout',key,items,...data},'#account/orders','模擬訂單已建立'));box.append(f);main.append(box);
}
function account(tab,params){
 const outer=el('div');outer.className='user-container';const sidebar=el('aside');sidebar.className='sidebar';const img=new Image();img.src=state.user.image||'assets/default_user.jpg';img.alt='展示帳號頭像';img.className='user-photo';sidebar.append(img,el('p',state.user.account));const nav=el('nav');nav.setAttribute('aria-label','會員功能');
 for(const[slug,name]of [['profile','我的帳號'],['password','變更密碼'],['orders','我的訂單'],['products','我的商品'],['delete','刪除帳號']])nav.append(link(name,'#account/'+slug,slug===tab?'active':''));sidebar.append(nav);
 const content=el('div');content.className='content';const box=el('div');box.className='content-wrapper';content.append(box);outer.append(sidebar,content);main.append(outer);
 if(tab==='profile'){
  box.append(el('h1','我的帳號'));const user=state.user;
  const f=form('profile-form',profileInputs(user)+'<label class="radio"><input type="checkbox" name="removeImage">移除目前頭像</label><button>儲存資料</button>',async data=>{try{const image=data.removeImage?'':get('image').files[0]?await uploadOne(get('image').files[0]):user.image;await act({type:'profile',...data,image},null,'個人資料已更新');}catch(error){fail(error);}});box.append(f);previewUpload('image','image-preview');
 }else if(tab==='password'){
  box.append(el('h1','變更密碼'),form('password-form',field('currentPassword','目前密碼','','password','autocomplete="current-password" minlength="8" maxlength="128"')+field('password','新密碼','','password','autocomplete="new-password" minlength="8" maxlength="128"')+field('confirm','再次輸入新密碼','','password','autocomplete="new-password" minlength="8" maxlength="128"')+'<button>更新密碼</button>',data=>act({type:'password',...data},null,'密碼已更新')));
 }else if(tab==='products'){
  box.append(el('h1','我的商品'),link('新增商品','#new'));const grid=el('div');grid.className='product-grid';for(const p of state.products.filter(p=>p.seller===state.user.id))grid.append(productCard(p,true));if(!grid.children.length)grid.append(el('p','尚未上架商品。'));box.append(grid);
 }else if(tab==='delete'){
  box.append(el('h1','刪除展示帳號'),el('p','請先完成此帳號的所有訂單，再輸入 '+state.user.account+'@delete。'),form('delete-form',field('confirm','確認文字')+'<button class="delete">刪除展示帳號</button>',data=>confirm('刪除展示帳號','此帳號與商品將停止使用，已完成的訂單紀錄仍保留於這次展示。',()=>act({type:'delete-account',confirm:data.confirm},'#catalog','展示帳號已刪除'))));
 }else{
  box.append(el('h1','我的訂單'));const type=params.get('type')||'purchased',tags=el('nav');tags.className='purchase-tags';tags.setAttribute('aria-label','訂單分類');for(const[key,label]of [['purchased','購買訂單'],['sold','售出訂單'],['completed','歷史訂單']])tags.append(link(label,'#account/orders?type='+key,key===type?'active':''));box.append(tags);
  const orders=state.orders.filter(o=>type==='completed'?o.status==='completed':o.status!=='completed'&&(type==='sold'?o.seller===state.user.id:o.buyer===state.user.id));
  if(!orders.length)box.append(el('p','尚無此類訂單。'));
  for(const order of orders){const card=section('訂單 '+order.id.slice(0,8),'h2');card.className='order-container';card.append(el('p',`買家：${seller(order.buyer)} · 賣家：${seller(order.seller)}`),el('p','付款方式：'+order.payment),el('p','建立時間：'+new Date(order.created).toLocaleString('zh-TW')),el('p','收件資訊：'+[order.fullname,order.address,order.phone].join(' · ')));for(const item of order.items)card.append(itemRow(item,item.quantity));card.append(el('strong','總計：'+money(order.total)),el('p','狀態：'+({pending:'待出貨',shipped:'已出貨',completed:'已完成'}[order.status])));
   if(order.seller===state.user.id&&order.status==='pending')card.append(button('標示已出貨',()=>act({type:'order-status',id:order.id,status:'shipped'},null,'已標示出貨')));
   if(order.buyer===state.user.id&&order.status==='shipped')card.append(button('確認收貨',()=>act({type:'order-status',id:order.id,status:'completed'},null,'訂單已完成')));box.append(card);
  }
 }
}
function editProduct(id){
 const product=id?state.products.find(p=>p.id===id&&p.seller===state.user.id):{name:'',description:'',price:10000,stock:1,category:state.categories[0],images:[]};if(!product){main.append(el('h1','無法編輯此商品'));return;}
 const box=section(id?'編輯商品':'新增商品');box.className='editor-container';const f=form('product-form',field('name','商品名稱',product.name,'text','maxlength="80"')+field('price','價格（NT$）',product.price/100,'number','min="0.01" max="1000000" step="0.01"')+field('stock','庫存',product.stock,'number','min="0" max="999"')+`<label for="description">商品介紹</label><textarea id="description" name="description" maxlength="1600" rows="5" required>${escape(product.description)}</textarea><label for="category">分類</label><select id="category" name="category">${state.categories.map(c=>`<option ${c===product.category?'selected':''}>${escape(c)}</option>`).join('')}</select><label for="photos">商品照片（最多 2 張，選填）</label><input id="photos" type="file" accept="image/png,image/jpeg,image/webp" multiple><div id="image-preview"></div><label class="radio"><input type="checkbox" name="removeImages">移除目前照片</label><button>${id?'儲存商品':'新增商品'}</button>`,async data=>{
  try{const files=[...get('photos').files];if(files.length>2)throw Error('最多選擇 2 張照片');const images=data.removeImages?[]:files.length?await Promise.all(files.map(uploadOne)):product.images;const price=Math.round(Number(data.price)*100);await act({type:'product',...(id?{id}:{}),name:data.name,description:data.description,category:data.category,price,stock:Number(data.stock),images},'#account/products','商品已儲存');}catch(error){fail(error);}
 });box.append(f,link('返回我的商品','#account/products','text-link'));main.append(box);previewUpload('photos','image-preview');for(const source of product.images){const img=new Image();img.src=source;img.alt=product.name;get('image-preview').append(img);}
}
async function uploadOne(file){if(!file)return '';if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('照片需為 5 MB 以下的 PNG、JPEG 或 WebP');const bitmap=await createImageBitmap(file),scale=Math.min(1,400/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const data=canvas.toDataURL('image/jpeg',.65);if(data.length>70000)throw Error('照片內容過大，請改用較小的照片');return data;}
function previewUpload(input,target){get(input).onchange=async()=>{const version=viewVersion;try{const photos=await Promise.all([...get(input).files].slice(0,2).map(uploadOne));if(version!==viewVersion)return;get(target).replaceChildren(...photos.map(source=>{const img=new Image();img.src=source;img.alt='上傳照片預覽';return img;}));}catch(error){fail(error);}};}
window.addEventListener('hashchange',()=>{render();main.focus();});load();
