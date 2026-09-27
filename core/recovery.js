function backoff(attempt,{baseMs=1000,maxMs=60000,jitter=0}={}){
 const raw=Math.min(maxMs,baseMs*Math.pow(2,Math.max(0,attempt-1)));
 return Math.round(raw+(jitter?raw*jitter:0));
}
async function retry(fn,{maxAttempts=3,shouldRetry=()=>true,onAttempt=()=>{}}={}){
 let lastError;
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  try{onAttempt(attempt);return {ok:true,attempt,result:await fn(attempt)}}catch(err){
   lastError=err;if(attempt>=maxAttempts||!shouldRetry(err,attempt))break;
  }
 }
 return {ok:false,error:lastError,attempt:maxAttempts};
}
function recoveryPlan({action,error,compensation}={}){
 return {actionType:action?.type||"unknown",retryable:!error?.permanent,compensation:typeof compensation==="function",reason:error?.message||"execution failed"};
}
module.exports={backoff,retry,recoveryPlan};