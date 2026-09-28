function createActiveContext({adapter,permission=()=>false,now=()=>new Date()}={}){
 async function snapshot(){
  if(!permission())return {ok:false,reason:"active-context permission not granted",context:null};
  if(!adapter?.snapshot)return {ok:false,reason:"active-context adapter unavailable",context:null};
  const raw=await adapter.snapshot();
  if(!raw?.ok)return {ok:false,reason:raw?.reason||"active-context capture failed",context:null};
  const context={
   app:raw.app||null,
   windowTitle:raw.windowTitle||null,
   documentName:raw.documentName||null,
   url:raw.url||null,
   selection:raw.selection||null,
   capturedAt:now().toISOString(),
   source:raw.source||"native"
  };
  return {ok:true,context};
 }
 function sanitizeForMemory(context,{includeSelection=false,includeUrl=false}={}){
  if(!context)return null;
  return {
   app:context.app,
   windowTitle:context.windowTitle,
   documentName:context.documentName,
   url:includeUrl?context.url:null,
   selection:includeSelection?context.selection:null,
   capturedAt:context.capturedAt,
   source:context.source
  };
 }
 return {snapshot,sanitizeForMemory};
}
module.exports={createActiveContext};