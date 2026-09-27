function redact(value,key=""){
 if(/token|secret|password|authorization/i.test(key))return "[REDACTED]";
 if(Array.isArray(value))return value.map(v=>redact(v));
 if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,redact(v,k)]));
 return value;
}
function previewAction(action={}){
 return {
  type:action.type||"unknown",
  title:action.title||action.type||"Action",
  summary:action.summary||"",
  payload:redact(action.payload||{}),
  provenance:redact(action.provenance||{}),
  meta:redact(action.meta||{})
 };
}
function createApprovalStore({now=()=>Date.now(),ttlMs=15*60*1000}={}){
 const items=new Map();
 function create(action,{ttl=ttlMs}={}){
  const id="ap_"+now().toString(36)+"_"+Math.random().toString(36).slice(2,7);
  const item={id,action,preview:previewAction(action),createdAt:now(),expiresAt:now()+ttl,status:"pending"};
  items.set(id,item);return item;
 }
 function get(id){
  const item=items.get(id);if(!item)return null;
  if(item.status==="pending"&&item.expiresAt<=now())item.status="expired";
  return item;
 }
 function decide(id,decision){
  const item=get(id);if(!item)return {ok:false,reason:"not_found"};
  if(item.status!=="pending")return {ok:false,reason:item.status};
  if(!["approved","rejected"].includes(decision))throw new Error("invalid approval decision");
  item.status=decision;item.decidedAt=now();return {ok:true,item};
 }
 function pending(){for(const id of items.keys())get(id);return [...items.values()].filter(i=>i.status==="pending")}
 return {create,get,decide,pending,list:()=>[...items.values()]};
}
module.exports={redact,previewAction,createApprovalStore};