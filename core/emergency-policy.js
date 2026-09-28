function createEmergencyPolicyStore(){
 const policies=new Map();const clone=v=>JSON.parse(JSON.stringify(v));
 function upsert(policy){
  if(!policy?.id||!policy?.type)throw new Error("policy id and type required");
  const minSources=Math.max(1,Math.min(10,Number(policy.minSources??2)));
  const minConfidence=Math.max(.5,Math.min(1,Number(policy.minConfidence??.8)));
  const responseTimeoutMs=Math.max(5000,Math.min(30*60*1000,Number(policy.responseTimeoutMs??60000)));
  const normalized={enabled:true,contactTrusted:true,allowProfessionalHelpWhenUnresponsive:false,trustedContacts:[],...policy,minSources,minConfidence,responseTimeoutMs};
  policies.set(normalized.id,normalized);return clone(normalized);
 }
 function evaluate(type,context={}){const matches=[...policies.values()].filter(p=>p.enabled&&p.type===type);const policy=matches.sort((a,b)=>(b.priority||0)-(a.priority||0))[0]||null;if(!policy)return {matched:false,policy:null};if(policy.locationRequired&&!context.location)return {matched:false,policy:null,reason:"location required"};return {matched:true,policy:clone(policy)}}
 function list(){return [...policies.values()].map(clone)}
 function restore(items=[]){policies.clear();for(const item of items)upsert(item);return list()}
 return {upsert,evaluate,list,restore,snapshot:list,get:id=>policies.has(id)?clone(policies.get(id)):null};
}
module.exports={createEmergencyPolicyStore};