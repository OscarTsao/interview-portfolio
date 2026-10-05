import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
const evidence=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(new URL('hw4/',(process.env.DEMO_TEST_ORIGIN||'http://127.0.0.1:8787').replace(/\/?$/,'/')).href);
 await page.getByText('FatSecret 即時資料 · 收藏僅儲存食物編號',{exact:true}).waitFor();
 await page.locator('#searchInput').fill('rice');await page.locator('#search-form button').click();
 await page.locator('#results-section tbody tr').first().waitFor();
 const firstName=await page.locator('.food-link').first().innerText();await page.locator('.food-link').first().click();
 await page.locator('#food-name').getByText(firstName,{exact:true}).waitFor();
 assert.ok(await page.locator('#serving-select option').count());assert.notEqual(await page.locator('#calories-value').innerText(),'—');
 evidence.push('Live FatSecret search and serving data');
 await page.screenshot({path:'.artifacts/nutrition-live-desktop.png',fullPage:true});
 const food={source:'fatsecret-live',id:'42',name:'Rice <script>literal</script>',url:null,servings:[{id:'1',description:'100 g',calories:130,fat:0.3,carbs:28,protein:2.7},{id:'2',description:'Missing and zero',calories:0,fat:0,carbs:null,protein:null}]};
 await page.route('**/api/nutrition/search?*',route=>route.fulfill({json:{source:'fatsecret-live',page:Number(new URL(route.request().url()).searchParams.get('page')),total:21,pageSize:20,foods:[{id:'42',name:food.name,description:'100 g'}]}}));
 await page.route('**/api/nutrition/food?id=42',route=>route.fulfill({json:food}));
 await page.locator('#detail-back').click();await page.locator('.food-link').getByText(food.name,{exact:true}).waitFor();
 await page.getByRole('button',{name:'下一頁',exact:true}).click();await page.getByText('第 2／2 頁 · 21 筆',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'下一頁',exact:true}).isDisabled(),true);
 await page.locator('.food-link').click();await page.locator('#food-name').getByText(food.name,{exact:true}).waitFor();assert.equal(await page.locator('#food-name script').count(),0);
 await page.locator('#detail-favorite').click();assert.equal(await page.evaluate(()=>localStorage.getItem('nutrition-favorite-ids-v1')),'["42"]');
 await page.locator('#serving-select').selectOption('1');assert.equal(await page.locator('#calories-value').innerText(),'0');assert.equal(await page.getByText('未提供',{exact:true}).count(),2);assert.equal(await page.locator('#nutritionChart').isVisible(),false);
 await page.locator('#favorites-button').click();await page.locator('#favorites-table .food-link').waitFor();await page.reload();await page.locator('#favorites-button').click();await page.locator('#favorites-table .food-link').waitFor();await page.getByRole('button',{name:'移除收藏：'+food.name,exact:true}).click();await page.getByText('尚未收藏食物。',{exact:true}).waitFor();
 evidence.push('Pagination, literal text safety, serving selection, null/zero distinction and ID-only favorites persist and remove');
 await page.locator('#favorites-back').click();await page.locator('#searchInput').fill('rice');
 await page.route('**/api/nutrition/search?*',route=>route.fulfill({status:502,json:{error:'暫時無法取得資料'}}));
 await page.locator('#search-form button').click();await page.locator('#retry-button').waitFor();assert.equal(await page.locator('#results-section tbody tr').count(),0);
 await page.unroute('**/api/nutrition/search?*');await page.locator('#retry-button').click();await page.locator('#results-section tbody tr').first().waitFor();
 evidence.push('Provider failure clears stale values and retry restores live results');
 const axe=await readFile(require.resolve('axe-core/axe.min.js'),'utf8');
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow ${width}`);
  await page.addScriptTag({content:axe});const result=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});assert.deepEqual(result,[],`axe ${width}`);
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.artifacts/nutrition-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
 evidence.push('320/390/768/1440 layout and WCAG automated checks, no browser exceptions');
 await writeFile('.artifacts/nutrition-browser-verification.json',JSON.stringify({at:new Date().toISOString(),evidence},null,2));console.log(evidence.join('\n'));
}finally{await browser.close();}
