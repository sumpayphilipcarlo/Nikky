const COMMITMENT_PATTERNS=[
 {re:/\bi(?:'|’)ll\s+(.+?)(?:\s+by\s+|\s+on\s+|\s+tomorrow\b|$)/i,owner:"self"},
 {re:/\bi will\s+(.+?)(?:\s+by\s+|\s+on\s+|\s+tomorrow\b|$)/i,owner:"self"},
 {re:/\bwe(?:'|’)ll\s+(.+?)(?:\s+by\s+|\s+on\s+|$)/i,owner:"shared"},
 {re:/\bcan you\s+(.+?)(?:\?|$)/i,owner:"other"}
];
function detectCommitments(text,{source="unknown",now=new Date()}={}){
 const out=[];
 for(const p of COMMITMENT_PATTERNS){
  const m=String(text||"").match(p.re);if(!m)continue;
  out.push({
   id:"cm_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7),
   owner:p.owner,
   task:m[1].trim().replace(/[.?!]+$/,""),
   source,
   status:"open",
   detectedAt:now.toISOString(),
   dueAt:/\btomorrow\b/i.test(text)?new Date(now.getTime()+86400000).toISOString():null
  });
 }
 return out;
}
function createCommitmentStore(initial=[]){
 const map=new Map(initial.map(c=>[c.id,{...c}]));
 function add(c){if(!c?.id)throw new Error("commitment id required");map.set(c.id,{...c});return map.get(c.id)}
 function update(id,patch){const c=map.get(id);if(!c)return null;Object.assign(c,patch);return c}
 function complete(id){return update(id,{status:"completed",completedAt:new Date().toISOString()})}
 function open(){return [...map.values()].filter(c=>c.status==="open")}
 function overdue(now=new Date()){return open().filter(c=>c.dueAt&&new Date(c.dueAt)<now)}
 return {add,update,complete,open,overdue,list:()=>[...map.values()]};
}
module.exports={detectCommitments,createCommitmentStore};