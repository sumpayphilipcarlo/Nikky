const crypto=require("crypto");
function fingerprint(tx){return crypto.createHash("sha256").update(JSON.stringify({type:tx.type,recipient:tx.recipient||tx.merchant||null,amount:Number(tx.amount||0),currency:tx.currency||null,reference:tx.reference||null})).digest("hex")}
function createTransactionSafety({now=()=>Date.now(),duplicateWindowMs=24*60*60*1000}={}){
 const history=[];const clone=v=>JSON.parse(JSON.stringify(v));
 function evaluate(tx,policy={}){const reasons=[];const amount=Number(tx.amount||0);if(!tx.type)reasons.push("transaction type required");if(!Number.isFinite(amount)||amount<0)reasons.push("invalid amount");if(policy.maxAmount!=null&&amount>Number(policy.maxAmount))reasons.push("amount exceeds policy limit");if(policy.allowedRecipients?.length){const recipient=tx.recipient||tx.merchant;if(!policy.allowedRecipients.includes(recipient))reasons.push("recipient not trusted")}const fp=fingerprint(tx),cutoff=now()-duplicateWindowMs;const duplicate=history.some(h=>h.fingerprint===fp&&h.at>=cutoff&&h.status==="completed");if(duplicate)reasons.push("possible duplicate transaction");const requiresReview=policy.mode!=="trusted"||reasons.length>0||!!tx.unusual;return {ok:reasons.length===0,requiresReview,reasons,fingerprint:fp}}
 function record(tx,{status,providerReference}={}){const item={fingerprint:fingerprint(tx),transaction:{...tx},status:status||"unknown",providerReference:providerReference||null,at:now()};history.push(item);return clone(item)}
 function list(){return history.map(clone)}
 function restore(items=[]){history.length=0;for(const item of items)if(item?.fingerprint&&item?.transaction)history.push(clone(item));return list()}
 return {evaluate,record,history:list,restore,snapshot:list};
}
module.exports={fingerprint,createTransactionSafety};