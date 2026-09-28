const SENSITIVE=new Set(["microphone","location","contacts","active-window","screen-context","files"]);
function createNativeBridge({platform,transport,declaredCapabilities=[]}={}){
 const capabilities=new Set(declaredCapabilities);
 function has(capability){return capabilities.has(capability)}
 async function invoke(capability,method,payload={}){
  if(!has(capability))return {ok:false,reason:`Capability ${capability} not declared on ${platform||"unknown"}`};
  if(!transport?.invoke)return {ok:false,reason:"native transport unavailable"};
  return transport.invoke({platform,capability,method,payload});
 }
 function permissionRequirements(){
  return [...capabilities].filter(c=>SENSITIVE.has(c)).map(capability=>({capability,requiresExplicitPermission:true}));
 }
 return {platform,has,invoke,permissionRequirements,capabilities:()=>[...capabilities]};
}
module.exports={SENSITIVE,createNativeBridge};