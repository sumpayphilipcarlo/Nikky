function createRelationshipGraph(){
 const people=new Map(),edges=[];
 function upsertPerson(person){
  if(!person?.id&&!person?.email)throw new Error("person id or email required");
  const id=person.id||String(person.email).toLowerCase();
  const existing=people.get(id)||{id,interactions:0,tags:[],importantDates:[]};
  const next={...existing,...person,id,tags:[...new Set([...(existing.tags||[]),...(person.tags||[])])]};
  people.set(id,next);return next;
 }
 function recordInteraction({personId,channel,direction,at=new Date().toISOString(),context}={}){
  const p=people.get(personId);if(!p)throw new Error("unknown person");
  p.interactions=(p.interactions||0)+1;p.lastInteractionAt=at;
  edges.push({personId,channel:channel||"unknown",direction:direction||"unknown",at,context:context||null});
  if(edges.length>2000)edges.shift();
  return p;
 }
 function rank(){return [...people.values()].sort((a,b)=>(b.priority||0)-(a.priority||0)||(b.interactions||0)-(a.interactions||0))}
 function find(query){
  const q=String(query||"").toLowerCase();
  return rank().filter(p=>[p.name,p.email,p.company].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)));
 }
 return {upsertPerson,recordInteraction,rank,find,people,edges};
}
module.exports={createRelationshipGraph};