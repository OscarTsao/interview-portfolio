import { defineConfig } from 'astro/config';
import { localVisionPreview } from './integrations/local-vision-preview.mjs';

export default defineConfig({
  site: 'https://oscartsao.github.io',
  base: process.env.PORTFOLIO_BASE || '/',
  output: 'static',
  devToolbar: { enabled: false },
  trailingSlash: 'always',
  vite: { plugins: [localVisionPreview()] },
});
