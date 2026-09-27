const {requestJson,bearer}=require("./http.js");
function createMicrosoft365Adapter({tokenProvider,fetchFn}={}){
 async function token(){return tokenProvider?.getToken?tokenProvider.getToken({interactive:true}):{ok:false,reason:"Microsoft OAuth not configured"}}
 async function graph(path,options={}){
  const t=await token();if(!t.ok)return {ok:false,live:false,reason:t.reason};
  const r=await requestJson(fetchFn,"https://graph.microsoft.com/v1.0"+path,{...options,headers:{...bearer(t.accessToken),...(options.headers||{})}});
  return r.ok?{ok:true,live:true,source:"microsoft-graph",data:r.data}:{ok:false,live:false,reason:r.reason};
 }
 return {
  calendar:()=>graph("/me/calendar/events?$top=20"),
  messages:()=>graph("/me/messages?$top=20&$select=id,subject,from,receivedDateTime,bodyPreview"),
  sendMail:({subject,body,to})=>graph("/me/sendMail",{method:"POST",body:{message:{subject,body:{contentType:"Text",content:body},toRecipients:[{emailAddress:{address:to}}]}}})
 };
}
module.exports={createMicrosoft365Adapter};