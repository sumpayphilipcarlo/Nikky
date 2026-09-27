const {requestJson}=require("./http.js");
function createNotionAdapter({token,fetchFn,version="2022-06-28"}={}){
 const headers=()=>({Authorization:"Bearer "+token,"Notion-Version":version,"content-type":"application/json"});
 async function call(path,options={}){
  if(!token)return {ok:false,live:false,reason:"Notion token not configured"};
  const r=await requestJson(fetchFn,"https://api.notion.com/v1"+path,{...options,headers:{...headers(),...(options.headers||{})}});
  return r.ok?{ok:true,live:true,source:"notion",data:r.data}:{ok:false,live:false,reason:r.reason};
 }
 return {
  search:({query=""}={})=>call("/search",{method:"POST",body:{query}}),
  page:id=>call("/pages/"+encodeURIComponent(id))
 };
}
module.exports={createNotionAdapter};