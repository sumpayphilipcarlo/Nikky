function createDataControls({sources={}}={}){
 async function exportAll(userId){
  const out={userId,exportedAt:new Date().toISOString(),data:{}};
  for(const [name,source] of Object.entries(sources)){
   if(typeof source.exportUser==="function")out.data[name]=await source.exportUser(userId);
   else if(typeof source.list==="function")out.data[name]=await source.list(userId);
  }
  return out;
 }
 async function deleteAll(userId){
  const results={};
  for(const [name,source] of Object.entries(sources)){
   try{
    if(typeof source.deleteUser==="function")results[name]=await source.deleteUser(userId);
    else if(typeof source.clearUser==="function")results[name]=await source.clearUser(userId);
    else results[name]={skipped:true,reason:"source does not expose deletion"};
   }catch(err){results[name]={ok:false,error:err?.message||String(err)}}
  }
  return {userId,deletedAt:new Date().toISOString(),results};
 }
 return {exportAll,deleteAll};
}
module.exports={createDataControls};