import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const siteBase = `${process.env.PORTFOLIO_BASE || '/'}`.replace(/\/?$/, '/');
const demoOrigin = process.env.PUBLIC_DEMO_ORIGIN || 'http://127.0.0.1:8787';
for (const [app, files] of [['hw1-portfolio',['index.html','style.css','reset.css','images']],['hw2-maze-game',['index.html','Images','events.json']]]) {
  const name = app.startsWith('hw1') ? 'hw1' : 'hw2';
  const target = `${root}portfolio/public/coursework/${name}`;
  await rm(target,{recursive:true,force:true});
  await mkdir(target,{recursive:true});
  for (const file of files) {
    await cp(`${root}apps/${app}/${file}`,`${target}/${file}`,{recursive:true});
  }
  let html = await readFile(`${target}/index.html`, 'utf8');
  html = html.replace('<html lang="en">', `<html lang="en" data-coursework="${name}">`)
    .replace('</head>', `<link rel="stylesheet" href="${siteBase}coursework-support.css"><script type="module" src="${siteBase}coursework-support.js"></script></head>`)
    .replace('<body>', `<body><aside class="coursework-banner"><a href="${siteBase}">← 返回 Yu-Ning Tsao 作品集</a> · ${name.toUpperCase()} 課程原作</aside>`);
  if (name === 'hw1') {
    html = html.replace(/href="\/hw([1-5])\/"/g, (_, n) => `href="${Number(n) <= 2 ? `${siteBase}coursework/hw${n}/index.html` : `${demoOrigin}/hw${n}/`}"`)
      .replace('<table>', '<div class="archive-table" tabindex="0" role="region" aria-label="課表，可左右捲動"><table>').replace('</table>', '</table></div>')
      .replace('class="dropdown"', 'class="dropdown" id="homework"');
  } else {
    html = html.replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1">')
      .replace(/<div id="([\w-]+)" class="slider( active)?"><\/div>/g, '<button type="button" id="$1" class="slider$2" aria-pressed="false"></button>')
      .replace('<div id="maze-container" class="clearfix"></div>', '<p class="maze-help">按 Start 開始，使用方向鍵或下方按鈕移動；大型迷宮可在遊戲區內捲動。</p><div class="maze-scroll" tabindex="0" role="region" aria-label="迷宮遊戲區，可捲動"><div id="maze-container" class="clearfix"></div></div>');
  }
  await writeFile(`${target}/index.html`, html);
}
// Copy the allowlisted frozen results, criterion statuses and cohort counts, never transcripts.
await mkdir(`${root}portfolio/public/demo-data`,{recursive:true});
await cp(`${root}portfolio/data/hied.json`,`${root}portfolio/public/demo-data/hied.json`);
console.log('已準備課程靜態素材與 HiED 凍結案例、準則狀態及評估摘要。');
