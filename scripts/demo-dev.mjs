import { spawn } from 'node:child_process';
const processes = ['portfolio','cloudflare'].map(workspace => spawn('npm',['run','dev','--workspace',workspace],{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false',ASTRO_TELEMETRY_DISABLED:'1'}}));
function stop() { for (const child of processes) child.kill('SIGTERM'); }
process.on('SIGINT',stop);
process.on('SIGTERM',stop);
for (const child of processes) child.on('exit',code => { if (code) { stop(); process.exitCode=code; } });
