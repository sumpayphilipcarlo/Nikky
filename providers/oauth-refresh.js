function createRefreshTokenProvider({clientId,clientSecret,refreshToken,tokenUrl,scope,fetchFn,now=()=>Date.now()}={}){
 const request=fetchFn||(typeof fetch==="function"?fetch.bind(globalThis):null);
 let accessToken=null,expiresAt=0;
 function configured(){return !!(clientId&&refreshToken&&tokenUrl&&request)}
 function clear(){accessToken=null;expiresAt=0}
 async function getToken(){
  if(accessToken&&now()<expiresAt-60000)return {ok:true,accessToken,cached:true};
  if(!configured())return {ok:false,reason:"OAuth refresh credentials are not configured"};
  const body=new URLSearchParams({grant_type:"refresh_token",refresh_token:refreshToken,client_id:clientId});
  if(clientSecret)body.set("client_secret",clientSecret);
  if(scope)body.set("scope",scope);
  let r;try{
   r=await request(tokenUrl,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:body.toString()});
  }catch(err){return {ok:false,reason:err?.message||"OAuth token refresh failed"}}
  let data={};try{data=await r.json()}catch{}
  if(!r.ok||!data.access_token){clear();return {ok:false,reason:data.error_description||data.error||("OAuth token endpoint returned HTTP "+r.status)}}
  accessToken=data.access_token;expiresAt=now()+(Number(data.expires_in)||3600)*1000;
  return {ok:true,accessToken,cached:false,tokenType:data.token_type||"Bearer",scope:data.scope||scope||null};
 }
 return {getToken,clear,configured};
}
module.exports={createRefreshTokenProvider};