function createFabricPolicy({permissions,transactionSafety}={}){
 if(!permissions)throw new Error("capability permissions required");
 function evaluate({endpointId,capability,payload={},transactionPolicy}={}){
  const permission=permissions.evaluate(endpointId,capability,{context:{amount:payload.amount}});
  if(!permission.allowed)return {allowed:false,mode:"deny",reason:permission.reason};
  let transaction=null;
  const financial=/^(?:financial|payment|bill|purchase)\./.test(capability);
  if(financial&&transactionSafety){
   transaction=transactionSafety.evaluate({type:capability,recipient:payload.recipient||payload.biller,merchant:payload.merchant,amount:payload.amount,currency:payload.currency,reference:payload.reference},{...(permission.grant?.constraints||{}),...(transactionPolicy||{}),mode:permission.mode});
   if(!transaction.ok)return {allowed:false,mode:"approval",reason:transaction.reasons.join("; "),transaction};
  }
  return {allowed:true,mode:transaction?.requiresReview?"approval":permission.mode,permission,transaction};
 }
 return {evaluate};
}
module.exports={createFabricPolicy};