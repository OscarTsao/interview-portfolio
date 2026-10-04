# Yu-Ning Tsao — Engineering Portfolio

繁體中文工程作品集，包含 BitoGuard、HiED、眼科影像研究說明及 Web Technologies 作品。

- [作品集](https://oscartsao.github.io/interview-portfolio/)
- [BitoGuard](https://oscar-interview-demos.613410122.workers.dev/bitoguard/)
- [Web Technologies 互動展示](https://oscar-interview-demos.613410122.workers.dev/)

## Architecture

- **GitHub Pages**: Astro static portfolio, selected HiED frozen research cases, HW1 and HW2.
- **Cloudflare Workers**: BitoGuard static Next.js frontend and synthetic demo APIs; simplified HW3–HW5 prototypes.
- **D1**: visitor-scoped demo orders and alert dispositions.
- **SQLite Durable Objects**: room-scoped chat and two-player game state.

The original research and product repositories remain private. This repository contains only selected publishable application files. Research images, clinical filenames, model weights, transcripts, local state, credentials, and private repository history are excluded. The public ophthalmic pages describe methods; image and reference-mask comparison is available only in local development with separately supplied research artifacts. Synthetic demo indicators are not measured model performance.

## Local development

Requires Node.js 24 and npm.

```sh
npm ci
npm run build --workspace bitoguard_frontend -- --webpack
node scripts/prepare-bitoguard-assets.mjs
npm run setup:local
npm run dev
```

Local site: `http://127.0.0.1:4173`; demo API: `http://127.0.0.1:8787`.

## Manual releases

Local edits do not publish automatically. The Pages workflow runs only when explicitly dispatched. Set repository variable `PUBLIC_DEMO_ORIGIN` to the deployed HTTPS Worker origin before running it.

For the Worker, authenticate using Wrangler OAuth. This release uses the dedicated `oscar-interview-demo` D1 database configured in `cloudflare/wrangler.jsonc`; forks should provision their own database. Build BitoGuard with `NEXT_PUBLIC_PORTFOLIO_URL=https://oscartsao.github.io/interview-portfolio/`, prepare the Worker assets, apply migrations to that dedicated database, and deploy from `cloudflare/`. Never reuse a private product database. The account owner confirmed Workers Free; deployment does not upgrade the account or purchase a domain.

## Verification and rollback

`npm run check:demo` checks Worker types. `DEMO_TEST_ORIGIN=<worker-origin> npm run test:demo` exercises synthetic order rules, visitor isolation, alert decisions, and room behavior. Tests create isolated demo visitors and rooms.

To restore a published version, dispatch Pages from the desired release commit and use Cloudflare's Worker version rollback. Worker rollback does not undo D1 schema changes; current migrations only create demo tables and seed synthetic products. Record both the Pages commit and Worker version for each release.
