// Same 600×400 arena, controls, gravity and combat rules as the HW5 Canvas game.
export type Controls = { l:boolean; r:boolean; j:boolean; close:boolean; def:boolean; s:boolean };
export const idleControls=():Controls=>({l:false,r:false,j:false,close:false,def:false,s:false});
type Player={id:string;x:number;y:number;vy:number;health:number;onGround:boolean;action:string;actionTimer:number;facing:number;shotAt:number};
export type Match={players:Player[];bullets:{x:number;y:number;vx:number;owner:number}[];frame:number;running:boolean;winner:string|null};
export function createMatch(ids:string[]):Match{
  return {players:ids.map((id,i)=>({id,x:i?510:50,y:240,vy:0,health:100,onGround:true,action:'idle',actionTimer:0,facing:i?-1:1,shotAt:-30})),bullets:[],frame:0,running:true,winner:null};
}
export function stepMatch(state:Match,inputs:Record<string,Controls>){
  if(!state.running)return;
  state.frame++;
  state.players.forEach((p,i)=>{
    const keys=inputs[p.id]||idleControls(),target=state.players[1-i];
    if(p.actionTimer>0)p.actionTimer--;else if(!['idle','move'].includes(p.action))p.action='idle';
    p.vy+=0.5;p.y+=p.vy;
    if(p.y>=240){p.y=240;p.vy=0;p.onGround=true;}else p.onGround=false;
    if(p.action!=='defend'&&p.action!=='close'){
      if(keys.l){p.x=Math.max(0,p.x-4);p.facing=-1;if(p.onGround)p.action='move';}
      if(keys.r){p.x=Math.min(560,p.x+4);p.facing=1;if(p.onGround)p.action='move';}
      if(!keys.l&&!keys.r&&p.onGround&&p.action==='move')p.action='idle';
    }
    if(keys.j&&p.onGround&&!['defend','close'].includes(p.action)){p.vy=-12;p.action='jump';}
    if(keys.close&&p.actionTimer===0){p.action='close';p.actionTimer=30;if(Math.abs(p.x-target.x)<50&&target.action!=='defend'&&target.onGround)target.health=Math.max(0,target.health-15);}
    if(keys.def)p.action='defend';else if(p.action==='defend')p.action='idle';
    if(keys.s&&p.actionTimer===0&&state.frame-p.shotAt>=30){state.bullets.push({x:p.x+(p.facing>0?40:0),y:p.y+20,vx:p.facing*8,owner:i});p.shotAt=state.frame;p.actionTimer=10;}
  });
  state.bullets=state.bullets.filter(b=>{
    b.x+=b.vx;if(b.x<0||b.x>600)return false;const target=state.players[1-b.owner];
    if(b.x>target.x&&b.x<target.x+40&&b.y>target.y&&b.y<target.y+80){if(target.action!=='defend'&&target.onGround)target.health=Math.max(0,target.health-10);return false;}return true;
  });
  if(state.frame>=7200||state.players.some(p=>p.health<=0)){state.running=false;const[a,b]=state.players;state.winner=a.health===b.health?'draw':a.health>b.health?a.id:b.id;}
}
