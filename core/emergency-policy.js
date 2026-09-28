function createEmergencyPolicyStore(){
 const policies=new Map();const clone=v=>JSON.parse(JSON.stringify(v));
 function upsert(policy){if(!policy?.id||!policy?.type)throw new Error("policy id and type required");const normalized={enabled:true,minSources:2,minConfidence:.8,responseTimeoutMs:60000,contactTrusted:true,allowProfessionalHelpWhenUnresponsive:false,trustedContacts:[],...policy};policies.set(normalized.id,normalized);return clone(normalized)}
 function evaluate(type,context={}){const matches=[...policies.values()].filter(p=>p.enabled&&p.type===type);const policy=matches.sort((a,b)=>(b.priority||0)-(a.priority||0))[0]||null;if(!policy)return {matched:false,policy:null};if(policy.locationRequired&&!context.location)return {matched:false,policy:null,reason:"location required"};return {matched:true,policy:clone(policy)}}
 function list(){return [...policies.values()].map(clone)}
 function restore(items=[]){policies.clear();for(const item of items)upsert(item);return list()}
 return {upsert,evaluate,list,restore,snapshot:list};
}
module.exports={createEmergencyPolicyStore};