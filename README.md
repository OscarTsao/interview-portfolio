# Yu-Ning Tsao — Engineering Portfolio

繁體中文工程作品集，包含 BitoGuard、HiED、眼科影像研究說明及 Web Technologies 作品。

- [作品集](https://oscartsao.github.io/interview-portfolio/)
- [BitoGuard](https://oscar-interview-demos.613410122.workers.dev/bitoguard/)
- [Web Technologies 互動展示](https://oscar-interview-demos.613410122.workers.dev/)

## Architecture

- **GitHub Pages**: Astro static portfolio, selected HiED frozen research cases, HW1 and HW2.
- **Cloudflare Workers**: the original BitoGuard frontend with synthetic demo APIs; HW3–HW5 retain their original layouts and core shopping, nutrition, chat, video, and game flows.
- **D1**: visitor-scoped storefronts, accounts, stock, orders, and alert dispositions. Checkout uses a version check to update stock and orders atomically.
- **SQLite Durable Objects**: room-scoped chat and two-player game state.

Nutrition search uses the existing FatSecret API through server-side OAuth. Favorites store food IDs only. WebRTC calls require explicit consent and use STUN; networks requiring TURN may not connect. Demo stores never collect payments or fulfill orders.

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

For the Worker, authenticate using Wrangler OAuth. This release uses the dedicated `oscar-interview-demo` D1 database configured in `cloudflare/wrangler.jsonc`; forks should provision their own database. Build BitoGuard with `NEXT_PUBLIC_PORTFOLIO_URL=https://oscartsao.github.io/interview-portfolio/`, prepare coursework assets with `PUBLIC_PORTFOLIO_URL` set to the same URL, apply migrations to that dedicated database, and deploy from `cloudflare/`. Set `FATSECRET_KEY` and `FATSECRET_SECRET` as Worker secrets, never as public build variables or committed files. Never reuse a private product database. The account owner confirmed Workers Free; deployment does not upgrade the account or purchase a domain.

## Verification and rollback

`npm run check:demo` checks Worker types. `DEMO_TEST_ORIGIN=<worker-origin> npm run test:demo` exercises order rules, account flows, inventory concurrency, visitor isolation, alert decisions, and room behavior. Browser checks accept `DEMO_TEST_ORIGIN` and `PORTFOLIO_TEST_ORIGIN` (include `/interview-portfolio/` for Pages). Tests create isolated demo visitors and rooms; video tests use virtual devices.

To restore a published version, dispatch Pages from the desired release commit and use Cloudflare's Worker version rollback. Worker rollback does not undo D1 schema changes; current migrations only create demo tables and seed synthetic products. Record both the Pages commit and Worker version for each release.
