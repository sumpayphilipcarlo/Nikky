const {requestJson,bearer}=require("./http.js");
function createSlackAdapter({botToken,fetchFn}={}){
 async function call(method,body){
  if(!botToken)return {ok:false,live:false,reason:"Slack bot token not configured"};
  const r=await requestJson(fetchFn,"https://slack.com/api/"+method,{method:"POST",headers:bearer(botToken),body});
  if(!r.ok||r.data?.ok===false)return {ok:false,live:false,reason:r.reason||r.data?.error||"Slack API error"};
  return {ok:true,live:true,source:"slack",data:r.data};
 }
 return {
  postMessage:({channel,text,threadTs})=>call("chat.postMessage",{channel,text,thread_ts:threadTs}),
  history:({channel,limit=20})=>call("conversations.history",{channel,limit})
 };
}
module.exports={createSlackAdapter};