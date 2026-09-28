function createMatterAdapter({controller}={}){
 async function discover(){
  if(!controller?.discover)return {ok:false,live:false,reason:"Matter controller unavailable",devices:[]};
  const devices=await controller.discover();
  return {ok:true,live:true,devices:(devices||[]).map(d=>({id:d.id,name:d.name||d.id,kind:"iot",platform:"matter",capabilities:d.capabilities||[],methods:["iot"],metadata:{fabricId:d.fabricId||null}}))};
 }
 async function command({deviceId,capability,value}={}){
  if(!controller?.command)return {ok:false,live:false,reason:"Matter controller unavailable"};
  const result=await controller.command({deviceId,capability,value});
  return result?.ok===false?result:{ok:true,live:true,...result};
 }
 return {discover,command};
}
module.exports={createMatterAdapter};