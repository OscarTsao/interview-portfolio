import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PACKAGE||process.env.PLAYWRIGHT_MODULE||'playwright');
const evidence=JSON.parse(await readFile('portfolio/data/hied.json','utf8'));
function safe(value){if(Array.isArray(value))return value.forEach(safe);if(value&&typeof value==='object'){for(const[key,item]of Object.entries(value)){assert.equal(['evidence','reasoning','transcript','dialogue','diagnostician_reasoning','raw_checker_outputs'].includes(key),false,'private field '+key);safe(item);}}}
safe(evidence);assert.equal(evidence.cases.reduce((n,c)=>n+c.criteria.reduce((sum,ch)=>sum+ch.states.length,0),0),234);
const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(new URL('research/?case=P015',(process.env.PORTFOLIO_TEST_ORIGIN||'http://127.0.0.1:4173').replace(/\/?$/,'/')).href);await page.locator('#criteria-panel:not([hidden])').waitFor();
 assert.equal(await page.locator('#cases').inputValue(),'P015');await page.getByText('364295726',{exact:true}).waitFor();assert.equal(await page.locator('#disorder').inputValue(),'F32');assert.equal(await page.locator('#criterion-rows tr').count(),11);
 await page.locator('#unresolved').check();assert.equal(await page.locator('#criterion-rows tr').count(),1);assert.match(await page.locator('#criterion-rows').innerText(),/C2[\s\S]*資料不足/);
 await page.locator('#disorder').selectOption('F51');assert.match(await page.locator('#criterion-rows').innerText(),/B[\s\S]*未滿足/);
 await page.locator('#cases').selectOption('P010');assert.equal(await page.locator('#unresolved').isChecked(),false);assert.equal(await page.locator('#disorder').inputValue(),'F20');assert.equal(new URL(page.url()).searchParams.get('case'),'P010');await page.reload();await page.locator('#criteria-panel:not([hidden])').waitFor();assert.equal(await page.locator('#cases').inputValue(),'P010');
 assert.match(await page.locator('#cohort-rows').innerText(),/51.8% · 518\/1,000/);assert.match(await page.locator('#cohort-rows').innerText(),/63.2% · 632\/1,000/);assert.match(await page.locator('#cohort-rows').innerText(),/未列（定義未對齊）/);assert.match(await page.locator('#joint-result').innerText(),/272\/1,000 案（27.2%）/);
 await page.route('**/demo-data/hied.json',r=>r.fulfill({json:{...evidence,cohort:{...evidence.cohort,n:999}}}));await page.reload();await page.locator('#retry').waitFor();assert.equal(await page.locator('#cohort-panel').isVisible(),false);assert.equal(await page.locator('#criteria-panel').isVisible(),false);await page.unroute('**/demo-data/hied.json');await page.locator('#retry').click();await page.locator('#criteria-panel:not([hidden])').waitFor();
 const axe=await readFile(require.resolve('axe-core/axe.min.js'),'utf8');
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:960});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow '+width);await page.addScriptTag({content:axe});const result=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});assert.deepEqual(result,[],'axe '+width);}
 await page.locator('#criteria-panel').scrollIntoViewIfNeeded();await page.screenshot({path:'.artifacts/hied-criteria-desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.artifacts/hied-criteria-mobile.png'});assert.deepEqual(errors,[]);
 await writeFile('.artifacts/hied-browser-verification.json',JSON.stringify({at:new Date().toISOString(),cases:3,criterionStates:234,checks:['allowlisted export','frozen P015 criterion values','case and filter switching','deep link and reload','1000-case denominator','withdrawn metric omitted','bad denominator rejected and retry','4 responsive widths and axe']},null,2));console.log('HiED: frozen criteria, matched metrics, disclosure boundary and browser checks passed.');
}finally{await browser.close();}
