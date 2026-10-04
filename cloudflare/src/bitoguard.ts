import type { Env } from './index';
const accounts = [
  {id:'demo-user-001',risk:'critical',score:0.94,occupation:'合成帳戶 A'},
  {id:'demo-user-002',risk:'high',score:0.82,occupation:'合成帳戶 B'},
  {id:'demo-user-003',risk:'medium',score:0.61,occupation:'合成帳戶 C'},
  {id:'demo-user-004',risk:'low',score:0.32,occupation:'合成帳戶 D'},
];
const alerts = accounts.map((user,i)=>({alert_id:`demo-alert-${String(i+1).padStart(3,'0')}`,user_id:user.id,risk_level:user.risk,risk_score:user.score,status:'open',created_at:'2026-03-15T09:00:00Z'}));
const metrics = {
  model_version:'SYNTHETIC-UI-FIXTURE-v1',holdout_rows:100,holdout_positives:20,holdout_negatives:80,
  precision:0.75,recall:0.6,f1:2*0.75*0.6/(0.75+0.6),fpr:0.05,average_precision:0.65,
  confusion_matrix:{tp:12,fp:4,fn:8,tn:76},precision_at_k:{'P@10':0.7,'P@20':0.6},recall_at_k:{'R@10':0.35,'R@20':0.6},
  calibration:{brier_score:0.12,n_bins:3,bins:[{mean_predicted:0.2,fraction_positive:0.1},{mean_predicted:0.5,fraction_positive:0.4},{mean_predicted:0.8,fraction_positive:0.7}]},
  feature_importance_top20:[{feature:'crypto_withdrawal_count_7d',importance_gain:45,importance_pct:45},{feature:'shared_device_count',importance_gain:35,importance_pct:35},{feature:'login_count_7d',importance_gain:20,importance_pct:20}],
  threshold_sensitivity:[{threshold:0.3,precision:0.5,recall:0.9,f1:0.643},{threshold:0.5,precision:0.75,recall:0.6,f1:0.667},{threshold:0.8,precision:0.9,recall:0.3,f1:0.45}],
  scenario_breakdown:[{scenario:'synthetic_shared_device',count:20,precision:0.75,recall:0.6}],
  pr_curve:{precision:[1,0.9,0.75,0.5,0.2],recall:[0,0.3,0.6,0.9,1],thresholds:[0.95,0.8,0.5,0.3]},
};
type Action = {decision:string;note:string;actor:string;updated_at:string};
const decisions=['confirm_suspicious','dismiss_false_positive','escalate','request_monitoring'];
const alertStatus:Record<string,string>={confirm_suspicious:'confirmed_suspicious',dismiss_false_positive:'dismissed_false_positive',escalate:'escalated',request_monitoring:'monitoring'};
const caseStatus:Record<string,string>={confirm_suspicious:'closed_confirmed',dismiss_false_positive:'closed_dismissed',escalate:'escalated',request_monitoring:'monitoring'};
function graph(userId:string,hops:number) {
  const index = accounts.findIndex(u=>u.id===userId);
  const peer = accounts[(index+1)%accounts.length];
  const user = accounts[index];
  const nodes = [
    {id:user.id,type:'user',label:user.id,hop:0,is_focus:true,risk_level:user.risk,is_known_blacklist:false},
    {id:'demo-device-001',type:'device',label:'合成共用裝置',hop:1,is_focus:false,risk_level:null,is_known_blacklist:false},
    {id:'demo-wallet-001',type:'wallet',label:'合成錢包',hop:1,is_focus:false,risk_level:null,is_known_blacklist:false},
  ];
  const edges=[{id:'edge-device',source:user.id,target:'demo-device-001',relation_type:'uses_device'},{id:'edge-wallet',source:user.id,target:'demo-wallet-001',relation_type:'owns_wallet'}];
  if(hops===2){nodes.push({id:peer.id,type:'user',label:peer.id,hop:2,is_focus:false,risk_level:peer.risk,is_known_blacklist:false});edges.push({id:'edge-peer',source:peer.id,target:'demo-device-001',relation_type:'uses_device'});}
  return {focus_user_id:userId,nodes,edges,summary:{is_truncated:false,node_count:nodes.length,edge_count:edges.length}};
}
export async function bitoguard(request:Request, env:Env, visitor:string, readBody:(request:Request)=>Promise<Record<string,unknown>>):Promise<Response> {
  const url=new URL(request.url);
  const path=url.pathname.replace(/^\/api\/bitoguard/,'');
  const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  async function action(alertId:string){return env.DEMO_DB.prepare('SELECT decision, note, actor, updated_at FROM demo_case_actions WHERE visitor = ? AND alert_id = ?').bind(visitor,alertId).first<Action>();}
  if(request.method==='POST' && path==='/demo/reset'){
    await env.DEMO_DB.prepare('DELETE FROM demo_case_actions WHERE visitor = ?').bind(visitor).run();
    return reply({ok:true});
  }
  if(request.method==='GET' && path==='/alerts'){
    const page=Math.max(1,Math.min(1000,Number(url.searchParams.get('page'))||1));
    const size=Math.max(1,Math.min(200,Number(url.searchParams.get('page_size'))||50));
    const rows=await Promise.all(alerts.map(async a=>{const latest=await action(a.alert_id);return {...a,status:latest?alertStatus[latest.decision]:a.status};}));
    const filtered=rows.filter(a=>(!url.searchParams.get('risk_level')||a.risk_level===url.searchParams.get('risk_level'))&&(!url.searchParams.get('status')||a.status===url.searchParams.get('status')));
    return reply({items:filtered.slice((page-1)*size,page*size),total:filtered.length,page,page_size:size,has_next:page*size<filtered.length});
  }
  if(request.method==='GET' && path==='/metrics/model')return reply(metrics);
  if(request.method==='GET' && path==='/metrics/drift')return reply({snapshot_from:'synthetic-baseline',snapshot_to:'synthetic-demo',drifted_features:[{feature:'shared_device_count',zero_rate_delta:0.1,mean_rel_change:0.4,std_rel_change:0.2}],total_checked:3,total_drifted:1,health_ok:false});
  const match=path.match(/^\/alerts\/([^/]+)(?:\/(report|decision))?$/);
  if(match){
    const alert=alerts.find(a=>a.alert_id===match[1]);
    if(!alert)return reply({detail:'找不到展示警示'},404);
    if(request.method==='POST' && match[2]==='decision'){
      const data=await readBody(request);
      if(!decisions.includes(String(data.decision))||typeof data.note!=='string'||data.note.length>1000||typeof data.actor!=='string'||data.actor.length>40)return reply({detail:'處置格式無效'},400);
      const previous=await action(alert.alert_id);
      if(previous && ['confirm_suspicious','dismiss_false_positive'].includes(previous.decision))return reply({detail:'此展示案件已結案'},409);
      await env.DEMO_DB.prepare('INSERT INTO demo_case_actions (visitor, alert_id, decision, note, actor, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(visitor, alert_id) DO UPDATE SET decision=excluded.decision, note=excluded.note, actor=excluded.actor, updated_at=excluded.updated_at').bind(visitor,alert.alert_id,data.decision,data.note,data.actor,new Date().toISOString()).run();
      return reply({ok:true,decision:data.decision});
    }
    const latest=await action(alert.alert_id);
    if(request.method==='GET' && !match[2])return reply({...alert,status:latest?alertStatus[latest.decision]:alert.status});
    if(request.method==='GET' && match[2]==='report')return reply({
      user_id:alert.user_id,summary_zh:'合成展示案例：多個帳戶使用相同裝置，近期出金頻率增加。此報告用於驗證原版分析與處置流程。',alert,
      case:{case_id:`case-${alert.alert_id}`,status:latest?caseStatus[latest.decision]:'open',latest_decision:latest?.decision||null,created_at:alert.created_at},
      risk_summary:{risk_level:alert.risk_level,risk_score:alert.risk_score},
      shap_top_factors:[{feature:'shared_device_count',feature_zh:'共用裝置數',impact:0.32},{feature:'crypto_withdrawal_count_7d',feature_zh:'近期出金次數',impact:0.18}],
      rule_hits:['synthetic_shared_device'],graph_evidence:{shared_device_count:1,shared_bank_count:0,shared_wallet_count:1,blacklist_1hop_count:0,blacklist_2hop_count:0,component_size:4},
      timeline_summary:[{time:'2026-03-15T08:00:00Z',type:'crypto',amount:1200},{time:'2026-03-15T08:30:00Z',type:'login',amount:null}],
      recommended_action:'manual_review',allowed_decisions:latest&&['confirm_suspicious','dismiss_false_positive'].includes(latest.decision)?[]:decisions,case_actions:latest?[{...latest,created_at:latest.updated_at}]:[],
    });
  }
  const userMatch=path.match(/^\/users\/([^/]+)\/(graph|360)$/);
  if(request.method==='GET' && userMatch){
    const user=accounts.find(a=>a.id===userMatch[1]);
    if(!user)return reply({detail:'找不到展示用戶'},404);
    if(userMatch[2]==='graph')return reply(graph(user.id,url.searchParams.get('max_hops')==='2'?2:1));
    const alert=alerts.find(a=>a.user_id===user.id)!;
    const latest=await action(alert.alert_id);
    return reply({user:{user_id:user.id,kyc_level:'SYNTHETIC',occupation:user.occupation,country:'DEMO',created_at:'2026-01-01T00:00:00Z'},latest_prediction:{risk_level:user.risk,risk_score:user.score,model_version:'SYNTHETIC-UI-FIXTURE-v1'},cases:[{case_id:`case-${alert.alert_id}`,status:latest?caseStatus[latest.decision]:'open',latest_decision:latest?.decision||null,created_at:alert.created_at}],recent_login_events:[{occurred_at:'2026-03-15T08:30:00Z',ip_address:'192.0.2.1',device_id:'demo-device-001',ip_country:'DEMO'}],recent_crypto_transactions:[{occurred_at:'2026-03-15T08:00:00Z',direction:'withdrawal',amount_twd_equiv:1200,counterparty_wallet_id:'demo-wallet-001'}]});
  }
  return reply({detail:'展示 API 不提供此操作'},404);
}
