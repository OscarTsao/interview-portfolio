import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const site = process.env.PORTFOLIO_TEST_ORIGIN || 'http://127.0.0.1:4173/';
const demo = process.env.DEMO_TEST_ORIGIN || 'http://127.0.0.1:8787/';
const paths = ['', 'engineering/', 'research/', 'vision/', 'reconstruction/',
  ...['bitoguard', 'hied', 'vision', 'maze', 'ecommerce', 'nutrition', 'realtime'].map(p => `projects/${p}/`),
  'coursework/hw1/index.html', 'coursework/hw2/index.html'];
const demos = ['', 'bitoguard/', 'bitoguard/alerts/', 'bitoguard/alerts/report/?alertId=demo-alert-001',
  'bitoguard/users/', 'bitoguard/graph/', 'bitoguard/model-ops/', 'hw3/', 'hw4/', 'hw5/'];
const targets = [...paths.map(p => new URL(p, site).href), ...demos.map(p => new URL(p, demo).href)]
  .filter(url => !process.env.QUALITY_FILTER || url.includes(process.env.QUALITY_FILTER));
const browser = await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE ? {executablePath:process.env.CHROME_EXECUTABLE} : {})});
const results = [];
await mkdir('.artifacts', {recursive:true});
try {
  for (const url of targets) {
    const page = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      const response = await page.goto(url);
      await page.waitForLoadState('networkidle');
      await page.locator('main img').evaluateAll(images => images.forEach(image => image.loading = 'eager'));
      await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
      const accessibility = await page.evaluate(async () => {
        const r = await axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
        return {version:r.testEngine.version,violations:r.violations.map(v => ({id:v.id,impact:v.impact,nodes:v.nodes.map(n => ({target:n.target,explanation:n.failureSummary}))})),manualReview:r.incomplete.map(v => v.id)};
      });
      const reflow = [];
      for (const width of [320,390,768,1440]) {
        await page.setViewportSize({width,height:1000});
        await page.waitForTimeout(120);
        reflow.push(await page.evaluate(() => ({width:innerWidth,contentWidth:document.documentElement.scrollWidth,passes:document.documentElement.scrollWidth <= innerWidth})));
      }
      results.push({url,status:response.status(),...accessibility,reflow,errors});
      console.log(JSON.stringify({url,violations:accessibility.violations.map(v => [v.id,v.nodes.length]),overflow:reflow.filter(r => !r.passes),errors}));
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
await writeFile('.artifacts/design-quality-verification.json',JSON.stringify({at:new Date().toISOString(),results},null,2));
assert.equal(results.filter(r => r.status !== 200 || r.violations.length || r.errors.length || r.reflow.some(v => !v.passes)).length,0,'See .artifacts/design-quality-verification.json');
