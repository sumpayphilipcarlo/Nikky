function createIdempotencyStore({ttlMs=24*60*60*1000,now=()=>Date.now()}={}){
 const entries=new Map();const clone=v=>JSON.parse(JSON.stringify(v));
 function cleanup(){for(const [k,v] of entries)if(v.expiresAt<=now())entries.delete(k)}
 async function run(key,fn){
  if(!key)throw new Error("idempotency key is required");cleanup();
  const existing=entries.get(key);
  if(existing){
   if(existing.state==="done")return {deduplicated:true,result:existing.result};
   if(existing.state==="running")return {deduplicated:true,pending:true,promise:existing.promise};
  }
  const record={state:"running",expiresAt:now()+ttlMs};
  record.promise=Promise.resolve().then(fn).then(result=>{record.state="done";record.result=result;record.expiresAt=now()+ttlMs;delete record.promise;return result}).catch(err=>{entries.delete(key);throw err});
  entries.set(key,record);const result=await record.promise;return {deduplicated:false,result};
 }
 function has(key){cleanup();return entries.has(key)}
 function clear(key){entries.delete(key)}
 function snapshot(){cleanup();return [...entries.entries()].filter(([,v])=>v.state==="done").map(([key,v])=>({key,state:"done",expiresAt:v.expiresAt,result:clone(v.result)}))}
 function restore(items=[]){entries.clear();for(const item of items){if(item?.key&&item.state==="done"&&Number(item.expiresAt)>now())entries.set(item.key,{state:"done",expiresAt:Number(item.expiresAt),result:clone(item.result)})}return snapshot()}
 return {run,has,clear,snapshot,restore,size:()=>{cleanup();return entries.size}};
}
module.exports={createIdempotencyStore};