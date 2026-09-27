async function requestJson(fetchFn,url,{method="GET",headers={},body}={}){
 const request=fetchFn||(typeof fetch==="function"?fetch.bind(globalThis):null);
 if(!request)return {ok:false,status:0,reason:"Fetch API unavailable"};
 try{
  const r=await request(url,{method,headers,body:body===undefined?undefined:(typeof body==="string"?body:JSON.stringify(body))});
  let data=null;try{data=await r.json()}catch{}
  return r.ok?{ok:true,status:r.status,data}:{ok:false,status:r.status,data,reason:data?.error?.message||data?.message||("HTTP "+r.status)};
 }catch(err){return {ok:false,status:0,reason:err?.message||"network error"}}
}
function bearer(token){return {Authorization:"Bearer "+token,"content-type":"application/json"}}
module.exports={requestJson,bearer};