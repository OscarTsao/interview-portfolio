import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const env={...process.env,WRANGLER_SEND_METRICS:'false'};
// Only the declared provider credentials cross into the local Worker environment.
try{
  for(const line of (await readFile(root+'.env','utf8')).split(/\r?\n/)){
    const match=line.match(/^(FATSECRET_KEY|FATSECRET_SECRET)=(.*)$/);
    if(match&&!env[match[1]])env[match[1]]=match[2].trim().replace(/^(['"])(.*)\1$/,'$2');
  }
}catch(error){if(error.code!=='ENOENT')throw error;}
const child=spawn(process.execPath,[root+'node_modules/wrangler/bin/wrangler.js','dev','--local','--ip','127.0.0.1','--port','8787'],{cwd:root+'cloudflare',env,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>{process.exitCode=code??0;});
