const LEVELS=Object.freeze({LOW:"low",MEDIUM:"medium",HIGH:"high",CRITICAL:"critical"});
const HIGH_RISK_PREFIXES=["financial.","legal.","employment.","security.privileged","data.delete","account."];
const MEDIUM_TYPES=new Set(["email.send","sms.send","call.place","calendar.create","calendar.update","calendar.delete"]);
function classify(action={}){
 const type=String(action.type||"unknown");
 const m=action.meta||{};
 if(HIGH_RISK_PREFIXES.some(p=>type.startsWith(p))||m.irreversible||m.financialImpact||m.legalImpact){
  return {level:LEVELS.CRITICAL,requiresApproval:true,autoAllowed:false,reasons:["high-impact or irreversible action"]};
 }
 if(MEDIUM_TYPES.has(type)||m.externalImpact||m.reputationImpact||m.sensitiveData){
  return {level:LEVELS.HIGH,requiresApproval:true,autoAllowed:false,reasons:["external, sensitive, or reputation-impacting action"]};
 }
 if(type.endsWith(".read")||type==="proactive.notify"||type==="note.create"){
  return {level:LEVELS.LOW,requiresApproval:false,autoAllowed:true,reasons:["local or read-only action"]};
 }
 return {level:LEVELS.MEDIUM,requiresApproval:true,autoAllowed:false,reasons:["unclassified action fails closed"]};
}
module.exports={LEVELS,classify};