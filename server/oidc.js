const crypto=require("crypto");
function decodePart(v){return JSON.parse(Buffer.from(v,"base64url").toString("utf8"))}
function createOidcVerifier({issuer,clientId,fetchFn,now=()=>Date.now(),cacheMs=60*60*1000}={}){
 const request=fetchFn||(typeof fetch==="function"?fetch.bind(globalThis):null);
 let discovery=null,jwks=null,cachedAt=0;
 async function load(){
  if(discovery&&jwks&&now()-cachedAt<cacheMs)return;
  if(!issuer||!clientId)throw new Error("OIDC issuer and client ID are not configured");
  if(!request)throw new Error("Fetch API unavailable");
  const base=issuer.replace(/\/$/,"");
  const d=await request(base+"/.well-known/openid-configuration");if(!d.ok)throw new Error("OIDC discovery failed");
  discovery=await d.json();
  const k=await request(discovery.jwks_uri);if(!k.ok)throw new Error("OIDC JWKS fetch failed");
  jwks=await k.json();cachedAt=now();
 }
 async function verify(idToken){
  if(typeof idToken!=="string")return {ok:false,reason:"ID token is required"};
  const parts=idToken.split(".");if(parts.length!==3)return {ok:false,reason:"Malformed ID token"};
  let header,payload;try{header=decodePart(parts[0]);payload=decodePart(parts[1])}catch{return {ok:false,reason:"Malformed ID token"}}
  if(header.alg!=="RS256")return {ok:false,reason:"Unsupported ID token algorithm"};
  try{await load()}catch(e){return {ok:false,reason:e.message}}
  if(payload.iss!==issuer.replace(/\/$/,""))return {ok:false,reason:"Invalid issuer"};
  const audiences=Array.isArray(payload.aud)?payload.aud:[payload.aud];
  if(!audiences.includes(clientId))return {ok:false,reason:"Invalid audience"};
  const t=Math.floor(now()/1000);
  if(!payload.exp||payload.exp<=t)return {ok:false,reason:"ID token expired"};
  if(payload.nbf&&payload.nbf>t+60)return {ok:false,reason:"ID token not active"};
  const jwk=(jwks.keys||[]).find(k=>k.kid===header.kid&&k.kty==="RSA");
  if(!jwk)return {ok:false,reason:"Signing key not found"};
  let key;try{key=crypto.createPublicKey({key:jwk,format:"jwk"})}catch{return {ok:false,reason:"Invalid signing key"}}
  const valid=crypto.verify("RSA-SHA256",Buffer.from(parts[0]+"."+parts[1]),key,Buffer.from(parts[2],"base64url"));
  if(!valid)return {ok:false,reason:"Invalid ID token signature"};
  return {ok:true,identity:{sub:payload.sub,email:payload.email||null,name:payload.name||payload.preferred_username||null},claims:payload};
 }
 return {verify};
}
module.exports={createOidcVerifier};