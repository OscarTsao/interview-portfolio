import { cp, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const source = fileURLToPath(new URL('../products/bitoguard/out/', import.meta.url))
const target = fileURLToPath(new URL('../cloudflare/public/bitoguard/', import.meta.url))
await rm(target, { recursive: true, force: true })
await cp(source, target, { recursive: true })
console.log('已將原版 BitoGuard 靜態輸出放入 Worker 同來源展示。')
