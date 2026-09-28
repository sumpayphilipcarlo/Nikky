function createDiscoveryManager({fabric,adapters=[]}={}){
 if(!fabric)throw new Error("fabric required");
 const sources=new Map();
 for(const a of adapters)if(a?.id)sources.set(a.id,a);
 function addAdapter(adapter){if(!adapter?.id||typeof adapter.discover!=="function")throw new Error("adapter id and discover required");sources.set(adapter.id,adapter)}
 async function scan({sourceIds}={}){
  const selected=sourceIds?.length?sourceIds.map(id=>sources.get(id)).filter(Boolean):[...sources.values()];
  const results=[],errors=[];
  for(const adapter of selected){
   try{
    const r=await adapter.discover();
    const endpoints=r?.endpoints||r?.devices||r?.apps||[];
    for(const endpoint of endpoints)fabric.register({...endpoint,metadata:{...(endpoint.metadata||{}),discoverySource:adapter.id}});
    results.push({source:adapter.id,count:endpoints.length,live:r?.live===true});
   }catch(error){errors.push({source:adapter.id,error:error.message})}
  }
  return {ok:errors.length===0,results,errors,endpoints:fabric.list()};
 }
 return {addAdapter,scan,sources:()=>[...sources.keys()]};
}
module.exports={createDiscoveryManager};