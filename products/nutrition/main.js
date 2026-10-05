'use strict';
const get=id=>document.getElementById(id);
const storageKey='nutrition-favorite-ids-v1';
let query='',page=0,screen='search',returnScreen='search',selected=null,chart=null,retryAction=null,requestVersion=0;
let favorites=[];
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))favorites=[...new Set(saved.filter(id=>typeof id==='string'&&/^\d{1,20}$/.test(id)))].slice(0,40);}catch{}
const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
function button(text,action,className){const el=node('button',text);el.type='button';if(className)el.className=className;el.addEventListener('click',action);return el;}
function show(next){screen=next;get('results-section').hidden=next!=='search';get('pagination').hidden=next!=='search';document.querySelector('.hero').hidden=next!=='search';get('pie-chart-section').hidden=next!=='detail';get('favorites-section').hidden=next!=='favorites';}
function updateCount(){get('favorite-count').textContent=String(favorites.length);}
function toggle(id){
  const next=favorites.includes(id)?favorites.filter(value=>value!==id):[...favorites,id];
  if(next.length>40)throw Error('最多收藏 40 項食物。');
  try{localStorage.setItem(storageKey,JSON.stringify(next));}catch{throw Error('瀏覽器無法保存收藏，請確認儲存空間或隱私設定。');}
  favorites=next;updateCount();
}
function report(error,action){get('error-message').textContent=error.message||'暫時無法載入，請重試。';retryAction=action;get('retry-button').hidden=!action;}
async function fetchData(path){const response=await fetch('/api/nutrition/'+path,{signal:AbortSignal.timeout(12000)});const data=await response.json();if(!response.ok)throw Error(data.error||'暫時無法取得資料。');return data;}
async function run(action,work){
  const version=++requestVersion;get('error-message').textContent='';get('retry-button').hidden=true;get('loading-status').textContent='正在向 FatSecret 取得資料…';
  try{const value=await work();if(version!==requestVersion)return;if(get('loading-status').textContent==='正在向 FatSecret 取得資料…')get('loading-status').textContent='';return value;}catch(error){if(version===requestVersion){get('loading-status').textContent='';report(error,action);}}finally{if(version===requestVersion)document.querySelector('main').setAttribute('aria-busy','false');}
}
function table(headers){const table=node('table'),head=node('thead'),row=node('tr'),body=node('tbody');for(const title of headers)row.append(node('th',title));head.append(row);table.append(head,body);return{table,body};}
function foodRow(body,item,remove=false){
  const row=node('tr'),name=node('td'),description=node('td',item.description||'開啟查看份量與營養資訊'),action=node('td');
  name.append(button(item.name,()=>details(item.id),'food-link'));
  const control=button(remove?'移除收藏':favorites.includes(item.id)?'移除收藏':'加入收藏',()=>{
    try{toggle(item.id);if(remove){row.remove();if(!favorites.length)get('favorites-table').replaceChildren(node('p','尚未收藏食物。'));}else{control.textContent=favorites.includes(item.id)?'移除收藏':'加入收藏';control.className=favorites.includes(item.id)?'remove-btn':'add-btn';}}catch(error){report(error,null);}
  },remove||favorites.includes(item.id)?'remove-btn':'add-btn');
  control.setAttribute('aria-label',(remove?'移除收藏：':'切換收藏：')+item.name);action.append(control);row.append(name,description,action);body.append(row);
}
async function search(nextPage=0){
  const nextQuery=get('searchInput').value.trim();if(!nextQuery){get('searchInput').reportValidity();return;}
  show('search');get('results-section').replaceChildren();get('pagination').replaceChildren();document.querySelector('main').setAttribute('aria-busy','true');
  const version=requestVersion+1;
  await run(()=>search(nextPage),async()=>{
    const data=await fetchData('search?'+new URLSearchParams({q:nextQuery,page:String(nextPage)}));if(version!==requestVersion)return;
    query=nextQuery;page=data.page;get('results-section').append(node('h2','搜尋結果'));
    if(!data.foods.length){get('results-section').append(node('p','沒有符合的食物，請試試其他名稱。'));return;}
    const rows=table(['食物名稱','每份摘要','收藏']);for(const item of data.foods)foodRow(rows.body,item);get('results-section').append(rows.table);
    const prev=button('上一頁',()=>search(page-1)),next=button('下一頁',()=>search(page+1));prev.disabled=page===0;next.disabled=(page+1)*data.pageSize>=data.total;
    get('pagination').append(prev,node('span',`第 ${page+1}／${Math.ceil(data.total/data.pageSize)} 頁 · ${data.total} 筆`),next);
    get('loading-status').textContent=`已載入 ${data.foods.length} 筆食物。`;
  });
}
async function details(id){
  if(screen!=='detail')returnScreen=screen;
  show('detail');get('food-name').textContent='';get('serving-select').replaceChildren();get('nutrition-values').replaceChildren();get('nutritionChart').hidden=true;get('detail-favorite').hidden=true;get('food-source').hidden=true;get('calories-value').textContent='—';
  const version=requestVersion+1;
  await run(()=>details(id),async()=>{
    const data=await fetchData('food?id='+encodeURIComponent(id));if(version!==requestVersion)return;
    selected=data;get('food-name').textContent=data.name;get('serving-select').replaceChildren(...data.servings.map((s,i)=>new Option(s.description,String(i))));
    get('detail-favorite').hidden=false;get('detail-favorite').textContent=favorites.includes(id)?'移除收藏':'加入收藏';
    if(data.url){get('food-source').href=data.url;get('food-source').hidden=false;}
    renderNutrition();get('food-name').focus();
  });
}
function renderNutrition(){
  if(!selected)return;const serving=selected.servings[Number(get('serving-select').value)];if(!serving)return;
  get('calories-value').textContent=serving.calories??'未提供';
  const rows=table(['營養素','每份含量']);for(const [label,key] of [['脂肪','fat'],['碳水化合物','carbs'],['蛋白質','protein']]){const row=node('tr');row.append(node('th',label),node('td',serving[key]===null?'未提供':serving[key]+' g'));rows.body.append(row);}get('nutrition-values').replaceChildren(rows.table);
  chart?.destroy();chart=null;const values=[serving.fat,serving.carbs,serving.protein];get('nutritionChart').hidden=values.some(value=>value===null)||values.every(value=>value===0);
  if(!get('nutritionChart').hidden&&window.Chart)chart=new Chart(get('nutritionChart'),{type:'pie',data:{labels:['脂肪','碳水化合物','蛋白質'],datasets:[{data:values,backgroundColor:['#b44242','#2864ab','#b86b19'],borderWidth:2}]},options:{animation:!matchMedia('(prefers-reduced-motion: reduce)').matches,plugins:{legend:{position:'bottom',labels:{font:{size:14},color:'#182332'}}}}});
}
async function showFavorites(){
  show('favorites');get('favorites-table').replaceChildren();get('favorites-title').focus();const version=requestVersion+1;
  await run(showFavorites,async()=>{
    if(!favorites.length){get('favorites-table').append(node('p','尚未收藏食物。'));return;}
    const rows=table(['食物名稱','資料','收藏']);get('favorites-table').append(rows.table);
    for(const id of favorites){if(version!==requestVersion)return;try{const food=await fetchData('food?id='+encodeURIComponent(id));if(version!==requestVersion)return;foodRow(rows.body,food,true);}catch{const row=node('tr'),cell=node('td','此項食物暫時無法讀取：'+id);cell.colSpan=2;const action=node('td');action.append(button('移除收藏',()=>{try{toggle(id);row.remove();}catch(error){report(error,null);}},'remove-btn'));row.append(cell,action);rows.body.append(row);report(Error('部分收藏暫時無法讀取。'),showFavorites);}}
  });
}
get('search-form').addEventListener('submit',event=>{event.preventDefault();search(0);});
get('favorites-button').addEventListener('click',showFavorites);
function backToSearch(){requestVersion++;show('search');if(query){get('searchInput').value=query;search(page);}get('searchInput').focus();}
get('favorites-back').addEventListener('click',backToSearch);
get('detail-back').addEventListener('click',()=>{if(returnScreen==='favorites')showFavorites();else backToSearch();});
get('serving-select').addEventListener('change',renderNutrition);
get('detail-favorite').addEventListener('click',()=>{if(!selected)return;try{toggle(selected.id);get('detail-favorite').textContent=favorites.includes(selected.id)?'移除收藏':'加入收藏';}catch(error){report(error,null);}});
get('retry-button').addEventListener('click',()=>retryAction?.());
updateCount();
fetchData('status').then(data=>{get('source-status').textContent=data.configured?'FatSecret 即時資料 · 收藏僅儲存食物編號':'FatSecret 尚未連接';}).catch(()=>{get('source-status').textContent='暫時無法確認連線';});
