import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {nutrition,signedNutritionUrl} from '../cloudflare/src/nutrition.ts';
const env={FATSECRET_KEY:'test-key',FATSECRET_SECRET:'test-secret'};
const req=path=>new Request('https://demo.invalid/api/nutrition/'+path);
const upstream=value=>async()=>Response.json(value);
test('OAuth signature signs the encoded, sorted parameters',async()=>{
 const url=new URL(await signedNutritionUrl({method:'foods.search',search_expression:"apple & pear's",format:'json'},{key:'test-key',secret:'a&b'},'nonce','12345'));
 const signature=url.searchParams.get('oauth_signature');url.searchParams.delete('oauth_signature');
 const encode=value=>encodeURIComponent(value).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
 const pairs=[...url.searchParams].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>encode(k)+'='+encode(v)).join('&');
 const expected=createHmac('sha1','a%26b&').update('GET&'+encode(url.origin+url.pathname)+'&'+encode(pairs)).digest('base64');
 assert.equal(signature,expected);
});
test('search handles provider single item, empty result and page metadata',async()=>{
 const response=await nutrition(req('search?q=rice&page=1'),env,upstream({foods:{total_results:'21',food:{food_id:'42',food_name:'Rice',food_description:'100 g'}}}));
 assert.deepEqual(await response.json(),{source:'fatsecret-live',page:1,total:21,pageSize:20,foods:[{id:'42',name:'Rice',description:'100 g'}]});
 const empty=await nutrition(req('search?q=none'),env,upstream({foods:{total_results:'0'}}));assert.deepEqual((await empty.json()).foods,[]);
});
test('missing nutrients stay missing while genuine zero remains zero',async()=>{
 const response=await nutrition(req('food?id=42'),env,upstream({food:{food_name:'Food',servings:{serving:{serving_id:'1',serving_description:'1 cup',fat:'0',protein:'',calories:'45'}}}}));
 assert.deepEqual((await response.json()).servings,[{id:'1',description:'1 cup',fat:0,protein:null,carbs:null,calories:45}]);
});
test('invalid input does not reach provider and provider failures never become fixture values',async()=>{
 const never=()=>{throw Error('should not reach provider');};
 for(const path of ['search?q=','search?q=rice&page=-1','search?q=rice&page=1.5','food?id=bad'])assert.equal((await nutrition(req(path),env,never)).status,400);
 assert.equal((await nutrition(req('search?q=rice'),{},never)).status,503);
 assert.equal((await nutrition(new Request(req('search?q=rice'),{method:'POST'}),env,never)).status,405);
 for(const transport of [upstream({error:{message:'test-secret'}}),upstream({foods:{}}),async()=>{throw Error('test-secret');},async()=>new Response('test-secret',{status:500})]){
  const response=await nutrition(req('search?q=rice'),env,transport);assert.equal(response.status,502);const text=await response.text();assert.equal(text.includes('test-secret'),false);assert.equal(text.includes('calories'),false);
 }
});
