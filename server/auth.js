const crypto=require("crypto");
function b64u(v){return Buffer.from(v).toString("base64url")}
function unb64u(v){return Buffer.from(v,"base64url").toString("utf8")}
function parseCookies(header=""){const out={};for(const part of header.split(";")){const i=part.indexOf("=");if(i>0)out[decodeURIComponent(part.slice(0,i).trim())]=decodeURIComponent(part.slice(i+1).trim())}return out}
function hmac(secret,data){return crypto.createHmac("sha256",secret).update(data).digest("base64url")}
function createSessionAuth({secret,ttlMs=24*60*60*1000,secure=true,now=()=>Date.now()}={}){
 if(!secret||secret.length<32)throw new Error("session secret must be at least 32 characters");
 function issue(identity){
  if(!identity?.sub)throw new Error("identity subject required");
  const csrf=crypto.randomBytes(24).toString("base64url");
  const payload={sub:String(identity.sub),email:identity.email||null,name:identity.name||null,csrf,iat:now(),exp:now()+ttlMs};
  const encoded=b64u(JSON.stringify(payload)),sig=hmac(secret,encoded);
  return {token:encoded+"."+sig,csrf,payload};
 }
 function verify(token){
  if(!token||!token.includes("."))return null;
  const [encoded,sig]=token.split(".");
  const expected=hmac(secret,encoded);
  const a=Buffer.from(sig||""),b=Buffer.from(expected);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
  let payload;try{payload=JSON.parse(unb64u(encoded))}catch{return null}
  if(!payload.sub||!payload.exp||payload.exp<=now())return null;
  return payload;
 }
 function cookiesFor(session){
  const attrs=["Path=/","HttpOnly","SameSite=Strict",secure?"Secure":null].filter(Boolean).join("; ");
  const csrfAttrs=["Path=/","SameSite=Strict",secure?"Secure":null].filter(Boolean).join("; ");
  return [
   "nikky_session="+encodeURIComponent(session.token)+"; "+attrs,
   "nikky_csrf="+encodeURIComponent(session.csrf)+"; "+csrfAttrs
  ];
 }
 function clearCookies(){
  const suffix="Path=/; Max-Age=0; SameSite=Strict"+(secure?"; Secure":"");
  return ["nikky_session=; "+suffix+"; HttpOnly","nikky_csrf=; "+suffix];
 }
 function authenticate(req){
  const cookies=parseCookies(req.headers.cookie||"");
  const session=verify(cookies.nikky_session);
  return session?{ok:true,session,cookies}:{ok:false,session:null,cookies};
 }
 function validateCsrf(req,auth){
  if(["GET","HEAD","OPTIONS"].includes(req.method))return true;
  const header=req.headers["x-nikky-csrf"],cookie=auth?.cookies?.nikky_csrf;
  return !!header&&!!cookie&&header===cookie&&header===auth?.session?.csrf;
 }
 return {issue,verify,cookiesFor,clearCookies,authenticate,validateCsrf,parseCookies};
}
module.exports={createSessionAuth,parseCookies};