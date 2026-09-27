const crypto=require("crypto");
function securityHeaders(res){
 res.setHeader("X-Content-Type-Options","nosniff");
 res.setHeader("X-Frame-Options","DENY");
 res.setHeader("Referrer-Policy","no-referrer");
 res.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()");
 res.setHeader("Cross-Origin-Resource-Policy","same-site");
 res.setHeader("Cache-Control","no-store");
 return res;
}
function requestId(req,res){
 const id=req.headers["x-request-id"]||crypto.randomUUID();res.setHeader("X-Request-Id",id);return id;
}
function createRateLimiter({windowMs=60000,max=120,now=()=>Date.now()}={}){
 const hits=new Map();
 function check(key){
  const t=now(),bucket=hits.get(key)||{start:t,count:0};
  if(t-bucket.start>=windowMs){bucket.start=t;bucket.count=0}
  bucket.count++;hits.set(key,bucket);
  return {allowed:bucket.count<=max,remaining:Math.max(0,max-bucket.count),resetAt:bucket.start+windowMs};
 }
 return {check};
}
function timingSafeEqual(a,b){
 const aa=Buffer.from(String(a||"")),bb=Buffer.from(String(b||""));
 if(aa.length!==bb.length)return false;return crypto.timingSafeEqual(aa,bb);
}
module.exports={securityHeaders,requestId,createRateLimiter,timingSafeEqual};