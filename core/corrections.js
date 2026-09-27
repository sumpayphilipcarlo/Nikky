function createCorrectionEngine({feedbackModel,memory}={}){
 const corrections=[];
 function correct({predictionKey,field,from,to,reason}={}){
  if(!predictionKey||!field)throw new Error("predictionKey and field required");
  const c={id:"corr_"+Date.now().toString(36),predictionKey,field,from,to,reason:reason||"",at:new Date().toISOString()};
  corrections.unshift(c);
  feedbackModel?.record?.(predictionKey,"corrected");
  memory?.put?.({id:"correction:"+c.id,type:"correction",value:c,source:"user",retentionDays:365});
  return c;
 }
 return {correct,list:()=>[...corrections]};
}
module.exports={createCorrectionEngine};