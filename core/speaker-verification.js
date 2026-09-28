function createSpeakerVerifier({matcher,threshold=0.82,maxAgeMs=5*60*1000,now=()=>Date.now()}={}){
 let enrolled=false,profileRef=null,lastVerifiedAt=0;
 async function enroll(sample){
  if(!matcher?.enroll)return {ok:false,reason:"speaker matcher unavailable"};
  const r=await matcher.enroll(sample);
  if(!r?.ok)return {ok:false,reason:r?.reason||"enrollment failed"};
  enrolled=true;profileRef=r.profileRef||"default";return {ok:true,profileRef};
 }
 async function verify(sample){
  if(!enrolled)return {ok:false,verified:false,reason:"speaker not enrolled"};
  if(!matcher?.verify)return {ok:false,verified:false,reason:"speaker matcher unavailable"};
  const r=await matcher.verify(sample,{profileRef});
  const confidence=Number(r?.confidence)||0;
  const verified=!!r?.ok&&confidence>=threshold;
  if(verified)lastVerifiedAt=now();
  return {ok:!!r?.ok,verified,confidence,threshold};
 }
 function recentlyVerified(){return !!lastVerifiedAt&&now()-lastVerifiedAt<=maxAgeMs}
 function requireRecentFor(action){
  const highRisk=!!action?.meta?.speakerVerificationRequired||["financial.transfer","account.change","security.privileged"].includes(action?.type);
  return !highRisk||recentlyVerified();
 }
 function reset(){enrolled=false;profileRef=null;lastVerifiedAt=0}
 return {enroll,verify,recentlyVerified,requireRecentFor,reset,status:()=>({enrolled,profileRef,lastVerifiedAt})};
}
module.exports={createSpeakerVerifier};