function header(headers,name){return headers?.find(h=>String(h.name).toLowerCase()===name.toLowerCase())?.value||""}
function normalizeMessage(raw){
 const p=raw?.payload||{};
 const headers=p.headers||[];
 return {
  id:raw?.id||null,
  threadId:raw?.threadId||null,
  subject:header(headers,"Subject"),
  from:header(headers,"From"),
  to:header(headers,"To"),
  date:header(headers,"Date"),
  snippet:raw?.snippet||"",
  labelIds:raw?.labelIds||[],
  source:"gmail",
  raw
 };
}
function createGmailAdapter({tokenProvider,fetchFn}={}){
 const request=fetchFn||(typeof fetch==="function"?fetch.bind(globalThis):null);
 async function authHeaders(interactive=true){
  if(!tokenProvider?.getToken)return {ok:false,reason:"Gmail OAuth token provider is not configured"};
  const token=await tokenProvider.getToken({interactive});
  if(!token.ok)return token;
  return {ok:true,headers:{Authorization:"Bearer "+token.accessToken}};
 }
 async function listRecent({query="newer_than:7d",maxResults=20,interactive=true}={}){
  if(!request)return {ok:false,live:false,reason:"Fetch API unavailable",messages:[]};
  const a=await authHeaders(interactive);if(!a.ok)return {ok:false,live:false,reason:a.reason,messages:[]};
  const params=new URLSearchParams({q:query,maxResults:String(Math.min(100,Math.max(1,maxResults)))});
  const r=await request("https://gmail.googleapis.com/gmail/v1/users/me/messages?"+params,{headers:a.headers});
  if(!r.ok){if(r.status===401)tokenProvider.clear?.();return {ok:false,live:false,reason:"Gmail list failed: HTTP "+r.status,messages:[]}}
  const body=await r.json(),refs=body.messages||[],messages=[];
  for(const ref of refs){
   const mr=await request("https://gmail.googleapis.com/gmail/v1/users/me/messages/"+encodeURIComponent(ref.id)+"?format=metadata",{headers:a.headers});
   if(mr.ok)messages.push(normalizeMessage(await mr.json()));
  }
  return {ok:true,live:true,source:"gmail",messages};
 }
 async function send({raw,interactive=true}={}){
  if(!request)return {ok:false,live:false,reason:"Fetch API unavailable"};
  if(!raw)return {ok:false,live:false,reason:"raw RFC 2822 message is required"};
  const a=await authHeaders(interactive);if(!a.ok)return {ok:false,live:false,reason:a.reason};
  const encoded=Buffer.from(raw).toString("base64url");
  const r=await request("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers:{...a.headers,"content-type":"application/json"},body:JSON.stringify({raw:encoded})});
  if(!r.ok){if(r.status===401)tokenProvider.clear?.();return {ok:false,live:false,reason:"Gmail send failed: HTTP "+r.status}}
  return {ok:true,live:true,source:"gmail",message:await r.json()};
 }
 return {listRecent,send};
}
module.exports={normalizeMessage,createGmailAdapter};