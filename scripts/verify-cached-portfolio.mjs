import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const engine=process.env.PLAYWRIGHT_BROWSER||'webkit';
const browserType=require(process.env.PLAYWRIGHT_PACKAGE||'playwright')[engine];
assert.ok(browserType?.launch,'Unsupported browser: '+engine);
const site=(process.env.PORTFOLIO_TEST_ORIGIN||'https://oscartsao.github.io/interview-portfolio/').replace(/\/?$/,'/');
const fixture=(await readFile(new URL('../test/fixtures/portfolio-20261004.html',import.meta.url),'utf8')).replaceAll('/interview-portfolio/',new URL(site).pathname);
const browser=await browserType.launch({headless:true,...(engine==='chromium'&&process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
const results=[];
await mkdir('.artifacts',{recursive:true});
try{
 for(const width of [1440,390])for(const cached of [false,true]){
  const page=await browser.newPage({viewport:{width,height:960},isMobile:width===390,hasTouch:width===390});
  const failures=[];page.on('response',r=>{if(r.url().startsWith(site)&&r.status()>=400)failures.push({url:r.url(),status:r.status()});});
  try{
   if(cached)await page.route(site,route=>route.fulfill({status:200,contentType:'text/html',body:fixture}));
   assert.equal((await page.goto(site,{waitUntil:'networkidle'})).status(),200);
   await page.locator('main img').evaluateAll(images=>images.forEach(image=>image.loading='eager'));
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('main img')).every(image=>image.complete));
   const layout=await page.evaluate(()=>{
    const portrait=document.querySelector('.portrait').getBoundingClientRect();
    return{introDisplay:getComputedStyle(document.querySelector('.intro')).display,portraitWidth:portrait.width,overflow:document.documentElement.scrollWidth>innerWidth,brokenImages:Array.from(document.querySelectorAll('main img')).filter(image=>!image.naturalWidth).map(image=>image.currentSrc),workColumns:getComputedStyle(document.querySelector('.work-list')).gridTemplateColumns.split(' ').length};
   });
   assert.equal(layout.introDisplay,'grid','Homepage introduction lost its layout');
   assert.ok(layout.portraitWidth<=370,'Portrait expanded beyond its design width');
   assert.equal(layout.workColumns,width===390?1:2,'Project cards lost their responsive columns');
   assert.equal(layout.overflow,false,'Homepage overflows the viewport');
   assert.deepEqual(layout.brokenImages,[],'Previously published project images must remain available');
   assert.deepEqual(failures,[],'Cached documents must retain their styles and images after release');
   await page.goto(new URL('projects/bitoguard/',site).href);
   await page.goBack({waitUntil:'networkidle'});
   assert.equal(await page.locator('.intro').evaluate(el=>getComputedStyle(el).display),'grid','Returning to the homepage lost its layout');
   await page.screenshot({path:`.artifacts/cache-layout-${engine}-${width}-${cached?'cached':'fresh'}.png`,fullPage:true});
   results.push({engine,width,cached,...layout,failures});
  }finally{await page.close();}
 }
 await writeFile(`.artifacts/cache-layout-${engine}.json`,JSON.stringify({at:new Date().toISOString(),site,results},null,2));
 console.log(`${engine}: fresh and previously cached homepage, desktop/mobile columns, images and back navigation passed.`);
}finally{await browser.close();}
