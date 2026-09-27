const {requestJson,bearer}=require("./http.js");
function createFcmAdapter({projectId,tokenProvider,fetchFn}={}){
 async function send({deviceToken,title,body,data={}}={}){
  if(!projectId)return {ok:false,live:false,reason:"FCM project ID not configured"};
  if(!deviceToken)return {ok:false,live:false,reason:"device token required"};
  const t=await tokenProvider?.getToken?.({interactive:false});
  if(!t?.ok)return {ok:false,live:false,reason:t?.reason||"FCM OAuth token unavailable"};
  const payload={message:{token:deviceToken,notification:{title:String(title||"Nikky"),body:String(body||"")},data:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,String(v)]))}};
  const r=await requestJson(fetchFn,`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,{method:"POST",headers:bearer(t.accessToken),body:payload});
  return r.ok?{ok:true,live:true,source:"fcm",data:r.data}:{ok:false,live:false,reason:r.reason};
 }
 return {send};
}
module.exports={createFcmAdapter};