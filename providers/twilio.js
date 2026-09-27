function basic(accountSid,authToken){return "Basic "+Buffer.from(accountSid+":"+authToken).toString("base64")}
function form(data){return new URLSearchParams(Object.entries(data).filter(([,v])=>v!==undefined&&v!==null).map(([k,v])=>[k,String(v)])).toString()}
function createTwilioAdapter({accountSid,authToken,fromNumber,fetchFn}={}){
 const request=fetchFn||(typeof fetch==="function"?fetch.bind(globalThis):null);
 function configured(){return !!(accountSid&&authToken&&fromNumber&&request)}
 async function post(path,data){
  if(!configured())return {ok:false,live:false,reason:"Twilio credentials/from number are not configured"};
  const r=await request("https://api.twilio.com/2010-04-01/Accounts/"+encodeURIComponent(accountSid)+path,{
   method:"POST",headers:{Authorization:basic(accountSid,authToken),"content-type":"application/x-www-form-urlencoded"},body:form(data)
  });
  let j={};try{j=await r.json()}catch{}
  return r.ok?{ok:true,live:true,source:"twilio",data:j}:{ok:false,live:false,reason:j.message||("Twilio HTTP "+r.status)};
 }
 async function sendSms({to,body}){return post("/Messages.json",{From:fromNumber,To:to,Body:body})}
 async function placeCall({to,twiml}){return post("/Calls.json",{From:fromNumber,To:to,Twiml:twiml||"<Response><Say>Hello from Nikky.</Say></Response>"})}
 return {sendSms,placeCall,configured};
}
module.exports={createTwilioAdapter};