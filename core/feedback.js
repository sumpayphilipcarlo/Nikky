function createFeedbackModel(initial={}){
 const stats=new Map(Object.entries(initial));
 function record(key,outcome){
  const s=stats.get(key)||{accepted:0,rejected:0,ignored:0,corrected:0,total:0};
  if(!["accepted","rejected","ignored","corrected"].includes(outcome))throw new Error("invalid feedback outcome");
  s[outcome]++;s.total++;stats.set(key,s);return {...s};
 }
 function trust(key){
  const s=stats.get(key);if(!s||!s.total)return .5;
  return Math.max(.05,Math.min(.95,(s.accepted+s.corrected*.5+1)/(s.total+2)));
 }
 function thresholdAdjustment(key){
  const t=trust(key);
  return t>=.8?-.1:t<=.3?.15:0;
 }
 function snapshot(){return Object.fromEntries([...stats].map(([k,v])=>[k,{...v}]))}
 return {record,trust,thresholdAdjustment,snapshot};
}
module.exports={createFeedbackModel};