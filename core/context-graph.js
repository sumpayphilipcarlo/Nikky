function createContextGraph(){
 const nodes=new Map(),edges=[];
 function upsert(type,id,data={}){
  if(!type||!id)throw new Error("type and id required");
  const key=type+":"+id,existing=nodes.get(key)||{type,id};
  const next={...existing,...data,type,id,updatedAt:new Date().toISOString()};
  nodes.set(key,next);return next;
 }
 function link(fromType,fromId,relation,toType,toId,meta={}){
  const from=fromType+":"+fromId,to=toType+":"+toId;
  if(!nodes.has(from)||!nodes.has(to))throw new Error("both nodes must exist");
  const edge={from,relation,to,meta,at:new Date().toISOString()};
  edges.push(edge);return edge;
 }
 function neighbors(type,id,relation){
  const key=type+":"+id;
  return edges.filter(e=>(e.from===key||e.to===key)&&(!relation||e.relation===relation)).map(e=>{
   const other=e.from===key?e.to:e.from;return {edge:e,node:nodes.get(other)};
  });
 }
 function query({type,predicate=()=>true}={}){return [...nodes.values()].filter(n=>(!type||n.type===type)&&predicate(n))}
 return {upsert,link,neighbors,query,nodes,edges};
}
module.exports={createContextGraph};