const METHOD_ORDER=["api","sdk","intent","app-intent","deep-link","browser","accessibility","desktop-ui","cli","iot"];
function createAppController({fabric,executors={},authority,verify}={}){
 if(!fabric)throw new Error("fabric required");
 function rankMethods(endpoint){
  return [...(endpoint.methods||[])].sort((a,b)=>METHOD_ORDER.indexOf(a)-METHOD_ORDER.indexOf(b));
 }
 async function execute({capability,payload={},context={},preferredEndpointIds=[]}={}){
  if(!capability)throw new Error("capability required");
  const resolved=fabric.resolve(capability,{trustedOnly:true,preferredIds:preferredEndpointIds,ownerId:context.ownerId});
  if(!resolved.ok)return resolved;
  const targets=[resolved.endpoint,...resolved.alternatives];
  const attempts=[];
  for(const endpoint of targets){
   for(const method of rankMethods(endpoint)){
    const executor=executors[method];
    if(typeof executor!=="function")continue;
    const action={type:capability,payload,meta:{endpointId:endpoint.id,method}};
    if(authority){
      const verdict=await authority(action,context);
      if(verdict?.allowed===false){attempts.push({endpointId:endpoint.id,method,ok:false,reason:verdict.reason||"authority denied"});continue}
    }
    try{
      const result=await executor({endpoint,capability,payload,context});
      const verified=verify?await verify({endpoint,capability,payload,result,context}):{ok:result?.ok!==false};
      attempts.push({endpointId:endpoint.id,method,ok:!!verified?.ok,result});
      if(verified?.ok)return {ok:true,endpoint,method,result,attempts};
    }catch(error){attempts.push({endpointId:endpoint.id,method,ok:false,reason:error.message})}
   }
  }
  return {ok:false,reason:"all execution paths failed",attempts};
 }
 return {execute,rankMethods};
}
module.exports={METHOD_ORDER,createAppController};