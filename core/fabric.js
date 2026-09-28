function createFabric({now=()=>new Date()}={}){
 const endpoints=new Map();
 function clone(v){return JSON.parse(JSON.stringify(v))}
 function register(endpoint){
  if(!endpoint?.id||!endpoint?.kind)throw new Error("endpoint id and kind required");
  const normalized={
   id:String(endpoint.id),kind:endpoint.kind,name:endpoint.name||endpoint.id,
   platform:endpoint.platform||null,ownerId:endpoint.ownerId||null,
   location:endpoint.location||null,online:endpoint.online!==false,
   trusted:!!endpoint.trusted,capabilities:[...(endpoint.capabilities||[])],
   methods:[...(endpoint.methods||[])],metadata:{...(endpoint.metadata||{})},
   updatedAt:endpoint.updatedAt||now().toISOString()
  };
  endpoints.set(normalized.id,normalized);return clone(normalized);
 }
 function update(id,patch={}){const current=endpoints.get(id);if(!current)throw new Error("endpoint not found");return register({...current,...patch,id,updatedAt:now().toISOString()})}
 function remove(id){return endpoints.delete(id)}
 function list({kind,online,ownerId}={}){return [...endpoints.values()].filter(e=>(!kind||e.kind===kind)&&(online===undefined||e.online===online)&&(!ownerId||e.ownerId===ownerId)).map(clone)}
 function candidates(capability,{trustedOnly=false,onlineOnly=true,ownerId,preferredIds=[]}={}){
  const preferred=new Map(preferredIds.map((id,i)=>[id,i]));
  return list({ownerId}).filter(e=>(!onlineOnly||e.online)&&(!trustedOnly||e.trusted)&&e.capabilities.includes(capability)).sort((a,b)=>{
   const ap=preferred.has(a.id)?preferred.get(a.id):9999,bp=preferred.has(b.id)?preferred.get(b.id):9999;
   if(ap!==bp)return ap-bp;if(a.trusted!==b.trusted)return a.trusted?-1:1;return a.id.localeCompare(b.id);
  });
 }
 function resolve(capability,options={}){const matches=candidates(capability,options);return matches.length?{ok:true,endpoint:matches[0],alternatives:matches.slice(1)}:{ok:false,reason:"no available endpoint",capability}}
 function restore(items=[]){endpoints.clear();for(const item of items)register(item);return list()}
 return {register,update,remove,list,candidates,resolve,restore,snapshot:list,get:id=>endpoints.has(id)?clone(endpoints.get(id)):null};
}
module.exports={createFabric};