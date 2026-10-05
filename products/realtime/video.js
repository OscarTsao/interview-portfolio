export function setupVideo({get,send,on,peer,error,status,invite}){
 let stream=null,connection=null,target=null,pendingOffer=null,ice=[],generation=0,timeout,cancelInvite;
 const local=get('video-local'),remote=get('video-remote');
 function controls(active){get('btn-toggle-camera').disabled=!active;get('btn-toggle-mic').disabled=!active;get('btn-video-leave').disabled=!target;get('btn-video-start').disabled=Boolean(target);}
 function stop(notify=true){
  generation++;clearTimeout(timeout);cancelInvite?.();cancelInvite=null;if(notify&&target)send('signal',{target,signal:{type:'hangup'}});
  stream?.getTracks().forEach(track=>track.stop());stream=null;connection?.close();connection=null;local.srcObject=null;remote.srcObject=null;target=null;pendingOffer=null;ice=[];controls(false);get('btn-toggle-camera').textContent='關閉攝影機';get('btn-toggle-mic').textContent='麥克風靜音';
 }
 async function devices(){
  const list=await navigator.mediaDevices.enumerateDevices();
  for(const[kind,element,active]of [['videoinput','video-source',stream?.getVideoTracks()[0]],['audioinput','audio-source',stream?.getAudioTracks()[0]]]){
   const select=get(element);select.replaceChildren(new Option('系統預設',''));list.filter(d=>d.kind===kind).forEach((d,i)=>select.add(new Option(d.label||`${kind==='videoinput'?'攝影機':'麥克風'} ${i+1}`,d.deviceId)));select.value=active?.getSettings().deviceId||'';
  }
 }
 async function media(){
  if(!navigator.mediaDevices?.getUserMedia)throw Error('此瀏覽器無法使用視訊，請使用 HTTPS 或本機網址。');
  const version=generation;
  const acquired=await navigator.mediaDevices.getUserMedia({video:get('video-source').value?{deviceId:{exact:get('video-source').value}}:true,audio:get('audio-source').value?{deviceId:{exact:get('audio-source').value}}:true});
  if(version!==generation){acquired.getTracks().forEach(t=>t.stop());throw Error('視訊已取消');}
  stream=acquired;local.srcObject=stream;await devices();controls(true);
 }
 function create(){
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});connection=pc;
  stream.getTracks().forEach(track=>pc.addTrack(track,stream));
  pc.onicecandidate=event=>{if(event.candidate&&target)send('signal',{target,signal:{type:'ice',candidate:event.candidate.toJSON()}});};
  pc.ontrack=event=>{remote.srcObject=event.streams[0];remote.play().catch(()=>status('請點選對方畫面播放視訊。'));};
  pc.onconnectionstatechange=()=>{
   if(pc!==connection)return;
   if(pc.connectionState==='connected'){clearTimeout(timeout);status('視訊已連線');}
   if(pc.connectionState==='failed'){error('視訊無法直接連線。請換網路後重新邀請；文字聊天仍可使用。');stop();}
  };
  clearTimeout(timeout);timeout=setTimeout(()=>{if(connection===pc&&pc.connectionState!=='connected'){error('視訊連線逾時，請確認對方已接受邀請及網路連線。');stop();}},30000);
  return pc;
 }
 async function applyIce(){const queue=ice;ice=[];for(const candidate of queue)await connection.addIceCandidate(candidate);}
 get('btn-video-start').onclick=async()=>{
  const person=peer();if(!person){error('請先選擇一位線上使用者。');return;}
  try{target=person.id;generation++;controls(false);await media();const pc=create();await pc.setLocalDescription(await pc.createOffer());send('signal',{target,signal:{type:'offer',sdp:pc.localDescription.toJSON()}});status('等待對方接受視訊邀請');}catch{stop();error('無法開啟攝影機或麥克風，請確認裝置與瀏覽器權限後重試。');}
 };
 on('signal',async({from,name,signal})=>{
  try{
   if(signal.type==='offer'){
    if(target){send('signal',{target:from,signal:{type:'decline'}});return;}
    target=from;pendingOffer=signal.sdp;controls(false);
    cancelInvite=invite(`${name} 邀請視訊`,'接受後才會開啟攝影機與麥克風。',async()=>{
     if(target!==from||!pendingOffer)return;
     try{generation++;await media();const pc=create();await pc.setRemoteDescription(pendingOffer);pendingOffer=null;await applyIce();await pc.setLocalDescription(await pc.createAnswer());send('signal',{target,signal:{type:'answer',sdp:pc.localDescription.toJSON()}});status('正在建立視訊連線…');}catch{stop();error('無法建立視訊，請確認攝影機與麥克風權限。');}
    },()=>{send('signal',{target:from,signal:{type:'decline'}});stop(false);});return;
   }
   if(from!==target)return;
   if(signal.type==='answer'&&connection){await connection.setRemoteDescription(signal.sdp);await applyIce();}
   if(signal.type==='ice'){if(connection?.remoteDescription)await connection.addIceCandidate(signal.candidate);else if(ice.length<100)ice.push(signal.candidate);}
   if(signal.type==='hangup'||signal.type==='decline'){stop(false);status(signal.type==='decline'?'對方已婉拒視訊邀請':'視訊已結束');}
  }catch{error('視訊訊號無法處理，請重新邀請。');stop();}
 });
 on('left',data=>{if(data.id===target){stop(false);status('對方已離線，視訊已結束');}});
 get('btn-video-leave').onclick=()=>{stop();status('視訊已結束');};
 get('btn-toggle-camera').onclick=()=>{const track=stream?.getVideoTracks()[0];if(track){track.enabled=!track.enabled;get('btn-toggle-camera').textContent=track.enabled?'關閉攝影機':'開啟攝影機';}};
 get('btn-toggle-mic').onclick=()=>{const track=stream?.getAudioTracks()[0];if(track){track.enabled=!track.enabled;get('btn-toggle-mic').textContent=track.enabled?'麥克風靜音':'開啟麥克風';}};
 async function replace(kind,element){
  if(!stream)return;
  try{
   const version=generation,next=await navigator.mediaDevices.getUserMedia({[kind]:get(element).value?{deviceId:{exact:get(element).value}}:true});
   if(version!==generation){next.getTracks().forEach(t=>t.stop());return;}
   const track=next.getTracks()[0],old=stream.getTracks().find(t=>t.kind===kind),sender=connection?.getSenders().find(s=>s.track?.kind===kind);if(old)track.enabled=old.enabled;
   try{await sender?.replaceTrack(track);}catch(e){next.getTracks().forEach(t=>t.stop());throw e;}
   if(old){stream.removeTrack(old);old.stop();}stream.addTrack(track);local.srcObject=stream;
  }catch{error('無法切換裝置，仍保留目前的視訊連線。');}
 }
 get('video-source').onchange=()=>replace('video','video-source');get('audio-source').onchange=()=>replace('audio','audio-source');
 remote.onclick=()=>remote.play().catch(()=>error('瀏覽器暫時無法播放視訊。'));
 return{stop};
}
