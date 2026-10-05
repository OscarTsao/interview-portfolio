import { readFile } from 'node:fs/promises';

// Private research artifacts are served only by the local development server.
// They never enter Astro's public directory or static build output.
export function localVisionPreview() {
  const root = new URL('../../.artifacts/vision-preview/', import.meta.url);
  const files = new Set(['manifest.json']);
  for (const id of ['case-01', 'case-02', 'case-03']) {
    for (const role of ['input', 'teacher', 'student']) files.add(`${id}-${role}.png`);
  }
  const segmentationFiles = new Set(['manifest.json']);
  for (const id of ['seg-01', 'seg-02', 'seg-03']) {
    for (const role of ['image', 'mask']) segmentationFiles.add(`${id}-${role}.png`);
  }
  const resultFiles = new Set(['manifest.json']);
  for (const id of ['result-01', 'result-02', 'result-03']) {
    for (const role of ['reference', 'baseline', 'smmt']) resultFiles.add(`${id}-${role}.png`);
  }
  const predictionFiles = new Set(['manifest.json']);
  for (const id of ['seg-01', 'seg-02', 'seg-03']) {
    for (const role of ['image', 'reference', 'prediction', 'processed']) predictionFiles.add(`${id}-${role}.png`);
  }
  return {
    name: 'local-vision-preview',
    apply: 'serve',
    configureServer(server) {
      const prefix = `${server.config.base}demo-data/vision/`;
      const segmentationPrefix = `${server.config.base}demo-data/segmentation/`;
      const resultPrefix = `${server.config.base}demo-data/segmentation-results/`;
      const predictionPrefix = `${server.config.base}demo-data/segmentation-predictions/`;
      server.middlewares.use(async (req, res, next) => {
        const path = new URL(req.url || '/', 'http://localhost').pathname;
        const resumePrefix=`${server.config.base}resume/`;
        if(path.startsWith(resumePrefix)){
          const name=path.slice(resumePrefix.length);
          res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
          if(!['en.pdf','zh.pdf'].includes(name)){res.statusCode=404;res.end();return;}
          if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;res.end();return;}
          try{const bytes=await readFile(new URL('../../.artifacts/resume-preview/'+name,import.meta.url));res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="Yu-Ning-Tsao-Resume-${name}"`);res.end(req.method==='HEAD'?undefined:bytes);}catch{res.statusCode=404;res.end();}return;
        }
        const isSegmentation = path.startsWith(segmentationPrefix);
        const isResult = path.startsWith(resultPrefix);
        const isPrediction = path.startsWith(predictionPrefix);
        if (!isPrediction && !isResult && !isSegmentation && !path.startsWith(prefix)) return next();
        const name = path.slice((isPrediction ? predictionPrefix : isResult ? resultPrefix : isSegmentation ? segmentationPrefix : prefix).length);
        const allowed = isPrediction ? predictionFiles : isResult ? resultFiles : isSegmentation ? segmentationFiles : files;
        const directory = isPrediction ? new URL('../../.artifacts/segmentation-predictions/', import.meta.url) : isResult ? new URL('../../.artifacts/segmentation-results/', import.meta.url) : isSegmentation ? new URL('../../.artifacts/segmentation-preview/', import.meta.url) : root;
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (!allowed.has(name)) { res.statusCode = 404; res.end(); return; }
        if (!['GET', 'HEAD'].includes(req.method)) { res.statusCode = 405; res.end(); return; }
        try {
          const bytes = await readFile(new URL(name, directory));
          res.setHeader('Content-Type', name.endsWith('.json') ? 'application/json; charset=utf-8' : 'image/png');
          res.end(req.method === 'HEAD' ? undefined : bytes);
        } catch {
          res.statusCode = 404;
          res.end();
        }
      });
    },
  };
}
