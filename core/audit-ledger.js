const crypto=require("crypto");
function hash(input){return crypto.createHash("sha256").update(String(input)).digest("hex")}
function canonical(entry){return JSON.stringify(entry,Object.keys(entry).sort())}
function createAuditLedger(){
 const entries=[];
 function append(event){
  const previousHash=entries.length?entries[entries.length-1].hash:"GENESIS";
  const base={id:"audit_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8),ts:new Date().toISOString(),...event,previousHash};
  const record={...base,hash:hash(previousHash+"|"+canonical(base))};
  entries.push(record);return record;
 }
 function verify(){
  let prev="GENESIS";
  for(const e of entries){
   const {hash:actual,...base}=e;
   if(base.previousHash!==prev)return {ok:false,id:e.id,reason:"previous hash mismatch"};
   const expected=hash(prev+"|"+canonical(base));
   if(expected!==actual)return {ok:false,id:e.id,reason:"record hash mismatch"};
   prev=actual;
  }
  return {ok:true,count:entries.length,head:prev};
 }
 function exportAll(){return entries.map(x=>({...x}))}
 return {append,verify,exportAll,entries};
}
module.exports={createAuditLedger,hash};