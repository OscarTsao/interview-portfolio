export interface NutritionEnv { FATSECRET_KEY?: string; FATSECRET_SECRET?: string; }
type RecordValue = Record<string, unknown>;
const endpoint='https://platform.fatsecret.com/rest/server.api';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const encode=(value:string)=>encodeURIComponent(value).replace(/[!'()*]/g,char=>'%'+char.charCodeAt(0).toString(16).toUpperCase());
const object=(value:unknown):RecordValue=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as RecordValue:{};
const list=(value:unknown):RecordValue[]=>value===undefined?[]:(Array.isArray(value)?value:[value]).map(object);
const number=(value:unknown)=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value))&&Number(value)>=0?Number(value):null;

export async function signedNutritionUrl(parameters:Record<string,string>,credentials:{key:string;secret:string},nonce=crypto.randomUUID(),timestamp=String(Math.floor(Date.now()/1000))){
  const params:Record<string,string>={...parameters,oauth_consumer_key:credentials.key,oauth_nonce:nonce,oauth_signature_method:'HMAC-SHA1',oauth_timestamp:timestamp,oauth_version:'1.0'};
  const normalized=Object.keys(params).sort().map(key=>encode(key)+'='+encode(params[key])).join('&');
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(encode(credentials.secret)+'&'),{name:'HMAC',hash:'SHA-1'},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('GET&'+encode(endpoint)+'&'+encode(normalized)));
  params.oauth_signature=btoa(String.fromCharCode(...new Uint8Array(signature)));
  return endpoint+'?'+new URLSearchParams(params);
}

export async function nutrition(request:Request,env:NutritionEnv,transport:typeof fetch=fetch):Promise<Response>{
  const url=new URL(request.url),route=url.pathname.replace('/api/nutrition/','');
  if(request.method!=='GET')return reply({error:'此功能僅接受讀取'},405);
  const configured=Boolean(env.FATSECRET_KEY&&env.FATSECRET_SECRET);
  if(route==='status')return reply({source:'fatsecret-live',configured});
  if(!['search','food'].includes(route))return reply({error:'找不到此功能'},404);
  const q=(url.searchParams.get('q')||'').trim(),id=url.searchParams.get('id')||'',page=Number(url.searchParams.get('page')||0);
  if(route==='search'&&(!q||q.length>120||!Number.isInteger(page)||page<0||page>1000))return reply({error:'請輸入搜尋詞與有效頁碼'},400);
  if(route==='food'&&!/^\d{1,20}$/.test(id))return reply({error:'食物編號無效'},400);
  if(!configured)return reply({error:'目前未連接 FatSecret，請稍後重試。',code:'not_configured'},503);
  try{
    const parameters:Record<string,string>=route==='search'?{method:'foods.search',format:'json',search_expression:q,max_results:'20',page_number:String(page)}:{method:'food.get',format:'json',food_id:id};
    const upstream=await transport(await signedNutritionUrl(parameters,{key:env.FATSECRET_KEY!,secret:env.FATSECRET_SECRET!}),{signal:AbortSignal.timeout(10000)});
    if(!upstream.ok)throw Error('upstream');
    const data=object(await upstream.json());
    if(data.error)throw Error('provider');
    if(route==='search'){
      const foods=object(data.foods);
      if(!data.foods||number(foods.total_results)===null)throw Error('schema');
      return reply({source:'fatsecret-live',page,total:number(foods.total_results),pageSize:20,foods:list(foods.food).map(food=>({id:String(food.food_id),name:String(food.food_name||''),description:String(food.food_description||'')}))});
    }
    const food=object(data.food),servings=list(object(food.servings).serving);
    if(!food.food_name||!servings.length)throw Error('schema');
    return reply({source:'fatsecret-live',id,name:String(food.food_name),url:typeof food.food_url==='string'&&food.food_url.startsWith('https://foods.fatsecret.com/')?food.food_url:null,servings:servings.map(serving=>({id:String(serving.serving_id||''),description:String(serving.serving_description||''),calories:number(serving.calories),fat:number(serving.fat),carbs:number(serving.carbohydrate),protein:number(serving.protein)}))});
  }catch{return reply({error:'FatSecret 暫時無法提供資料。請重新載入；目前不顯示替代數值。',code:'upstream_unavailable'},502);}
}
