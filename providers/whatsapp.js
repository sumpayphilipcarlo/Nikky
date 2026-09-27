const {requestJson,bearer}=require("./http.js");
function createWhatsAppAdapter({accessToken,phoneNumberId,fetchFn,apiVersion="v23.0"}={}){
 async function sendText({to,text}={}){
  if(!accessToken||!phoneNumberId)return {ok:false,live:false,reason:"WhatsApp Cloud API credentials not configured"};
  const r=await requestJson(fetchFn,`https://graph.facebook.com/${apiVersion}/${encodeURIComponent(phoneNumberId)}/messages`,{
   method:"POST",headers:bearer(accessToken),body:{messaging_product:"whatsapp",to,type:"text",text:{body:text}}
  });
  return r.ok?{ok:true,live:true,source:"whatsapp",data:r.data}:{ok:false,live:false,reason:r.reason};
 }
 return {sendText};
}
module.exports={createWhatsAppAdapter};