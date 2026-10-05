import {mkdir,cp,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const portfolioUrl=process.env.PUBLIC_PORTFOLIO_URL||(process.env.PORTFOLIO_BASE?'https://oscartsao.github.io'+process.env.PORTFOLIO_BASE.replace(/\/?$/,'/'):'http://127.0.0.1:4173/');
await mkdir(root+'cloudflare/public/hw4/vendor',{recursive:true});
for(const name of ['index.html','main.js','css'])await cp(root+'products/nutrition/'+name,root+'cloudflare/public/hw4/'+name,{recursive:true});
await cp(root+'node_modules/chart.js/dist/chart.umd.js',root+'cloudflare/public/hw4/vendor/chart.umd.js');
await cp(root+'node_modules/chart.js/LICENSE.md',root+'cloudflare/public/hw4/vendor/Chart-LICENSE.md');
await cp(root+'products/realtime',root+'cloudflare/public/hw5',{recursive:true});
await cp(root+'products/store',root+'cloudflare/public/hw3',{recursive:true});
for(const name of ['hw3','hw4','hw5']){
  const path=root+'cloudflare/public/'+name+'/index.html';
  await writeFile(path,(await readFile(path,'utf8')).replace('href="/"','href="'+new URL(portfolioUrl).href+'"'));
}
await mkdir(root+'.artifacts',{recursive:true});
await writeFile(root+'.artifacts/nutrition-source-provenance.json',JSON.stringify({source:'apps/hw4-nutrition/src',cssSha256:createHash('sha256').update(await readFile(root+'products/nutrition/css/style.css')).digest('hex'),approach:'Original navigation, hero, results, serving/chart and favorite views; adapted DOM/API, Traditional Chinese and responsive controls',missingOriginalAsset:'css references images/hero-bg.jpg, absent from both local original copies; replaced with a CSS background'},null,2));
await writeFile(root+'.artifacts/realtime-source-provenance.json',JSON.stringify({source:'apps/hw5-chatapp/public',cssSha256:createHash('sha256').update(await readFile(root+'products/realtime/style.css')).digest('hex'),approach:'Original sidebar, chat/video controls, icons, Canvas arena and combat rules; repaired script conflicts and transport through Workers. Game physics now server-authoritative; camera access only after explicit user action.'},null,2));
console.log('Prepared original coursework product views.');
