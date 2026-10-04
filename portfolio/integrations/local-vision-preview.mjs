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
  return {
    name: 'local-vision-preview',
    apply: 'serve',
    configureServer(server) {
      const prefix = `${server.config.base}demo-data/vision/`;
      const segmentationPrefix = `${server.config.base}demo-data/segmentation/`;
      server.middlewares.use(async (req, res, next) => {
        const path = new URL(req.url || '/', 'http://localhost').pathname;
        const isSegmentation = path.startsWith(segmentationPrefix);
        if (!isSegmentation && !path.startsWith(prefix)) return next();
        const name = path.slice((isSegmentation ? segmentationPrefix : prefix).length);
        const allowed = isSegmentation ? segmentationFiles : files;
        const directory = isSegmentation ? new URL('../../.artifacts/segmentation-preview/', import.meta.url) : root;
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
