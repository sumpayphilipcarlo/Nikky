const crypto=require("crypto");
function canonical(v){
 if(v===null||typeof v!=="object")return JSON.stringify(v);
 if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
 return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function createAuditChain({key="development-only-change-me"}={}){
 const entries=[];
 function digest(payload){return crypto.createHmac("sha256",key).update(payload).digest("hex")}
 function append(event){
  const prev=entries.length?entries[entries.length-1].hash:"GENESIS";
  const base={index:entries.length,at:new Date().toISOString(),prev,event};
  const hash=digest(canonical(base));
  const entry={...base,hash};entries.push(entry);return entry;
 }
 function verify(){
  for(let i=0;i<entries.length;i++){
   const e=entries[i],prev=i?entries[i-1].hash:"GENESIS";
   if(e.prev!==prev)return {ok:false,index:i,reason:"broken previous hash"};
   const base={index:e.index,at:e.at,prev:e.prev,event:e.event};
   if(digest(canonical(base))!==e.hash)return {ok:false,index:i,reason:"hash mismatch"};
  }
  return {ok:true,count:entries.length};
 }
 return {append,verify,entries};
}
module.exports={createAuditChain};