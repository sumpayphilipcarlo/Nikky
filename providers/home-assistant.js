const {requestJson,bearer}=require("./http.js");
function createHomeAssistantAdapter({baseUrl,token,fetchFn}={}){
 const base=String(baseUrl||"").replace(/\/$/,"");
 async function call(path,options={}){
  if(!base||!token)return {ok:false,live:false,reason:"Home Assistant URL/token not configured"};
  const r=await requestJson(fetchFn,base+"/api"+path,{...options,headers:{...bearer(token),...(options.headers||{})}});
  return r.ok?{ok:true,live:true,source:"home-assistant",data:r.data}:{ok:false,live:false,reason:r.reason};
 }
 return {
  states:()=>call("/states"),
  service:({domain,service,data={}})=>call("/services/"+encodeURIComponent(domain)+"/"+encodeURIComponent(service),{method:"POST",body:data})
 };
}
module.exports={createHomeAssistantAdapter};