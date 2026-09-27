const http=require("http");
const {URL}=require("url");
const {loadConfig}=require("./config.js");
const {createRuntime}=require("./runtime.js");
const {securityHeaders,requestId,createRateLimiter,timingSafeEqual}=require("./security.js");
const {createSessionAuth}=require("./auth.js");
const {createOidcVerifier}=require("./oidc.js");

const {config,warnings}=loadConfig();
const runtime=createRuntime();
const limiter=createRateLimiter({windowMs:60000,max:120});
const sessionAuth=config.sessionSecret?createSessionAuth({
 secret:config.sessionSecret,
 secure:config.environment==="production"
}):null;
const oidc=(config.oidcIssuer&&config.oidcClientId)?createOidcVerifier({
 issuer:config.oidcIssuer,
 clientId:config.oidcClientId
}):null;

function json(res,status,body){
 const data=JSON.stringify(body);
 res.writeHead(status,{"content-type":"application/json","content-length":Buffer.byteLength(data)});
 res.end(data);
}
function readJson(req){
 return new Promise((resolve,reject)=>{
  let body="";
  req.on("data",c=>{body+=c;if(body.length>1e6){reject(new Error("request too large"));req.destroy()}});
  req.on("end",()=>{try{resolve(body?JSON.parse(body):{})}catch(e){reject(e)}});
  req.on("error",reject);
 });
}
function bearer(req){
 const h=req.headers.authorization||"";
 return h.startsWith("Bearer ")?h.slice(7):"";
}
function applyCors(req,res){
 const origin=req.headers.origin;
 if(!origin)return true;
 if(!config.allowedOrigins.includes(origin))return false;
 res.setHeader("Access-Control-Allow-Origin",origin);
 res.setHeader("Vary","Origin");
 res.setHeader("Access-Control-Allow-Credentials","true");
 res.setHeader("Access-Control-Allow-Headers","Content-Type,X-Nikky-CSRF,Authorization,X-Request-Id");
 res.setHeader("Access-Control-Allow-Methods","GET,POST,DELETE,OPTIONS");
 return true;
}
function rateLimit(req,res){
 const rate=limiter.check(req.socket?.remoteAddress||"unknown");
 res.setHeader("X-RateLimit-Remaining",String(rate.remaining));
 if(!rate.allowed){json(res,429,{error:"rate_limited"});return false}
 return true;
}
function serviceAuth(req){
 const token=bearer(req);
 return !!config.serviceToken&&!!token&&timingSafeEqual(token,config.serviceToken);
}
function authorizeApi(req,res){
 if(!rateLimit(req,res))return null;
 if(serviceAuth(req))return {mode:"service",identity:{sub:"service"}};
 if(!sessionAuth){json(res,401,{error:"unauthorized"});return null}
 const auth=sessionAuth.authenticate(req);
 if(!auth.ok){json(res,401,{error:"unauthorized"});return null}
 if(!sessionAuth.validateCsrf(req,auth)){json(res,403,{error:"csrf_failed"});return null}
 return {mode:"session",identity:auth.session};
}

async function handler(req,res,runtimeOverride=runtime){
 const appRuntime=runtimeOverride;
 securityHeaders(res);requestId(req,res);
 if(!applyCors(req,res)){return json(res,403,{error:"origin_not_allowed"})}
 if(req.method==="OPTIONS"){res.writeHead(204);return res.end()}
 const url=new URL(req.url,"http://localhost");
 try{
  if(req.method==="GET"&&url.pathname==="/health"){
   return json(res,200,{ok:true,service:"nikky-core",environment:config.environment,warnings});
  }

  if(url.pathname==="/auth/session"){
   if(!rateLimit(req,res))return;
   if(req.method==="GET"){
    if(!sessionAuth)return json(res,503,{error:"session_auth_not_configured"});
    const auth=sessionAuth.authenticate(req);
    return auth.ok?json(res,200,{authenticated:true,user:{sub:auth.session.sub,email:auth.session.email,name:auth.session.name}}):json(res,401,{authenticated:false});
   }
   if(req.method==="POST"){
    if(!sessionAuth)return json(res,503,{error:"session_auth_not_configured"});
    const body=await readJson(req);
    let identity=null;
    if(body.idToken){
     if(!oidc)return json(res,503,{error:"oidc_not_configured"});
     const verified=await oidc.verify(body.idToken);
     if(!verified.ok)return json(res,401,{error:"invalid_identity",message:verified.reason});
     identity=verified.identity;
    }else if(body.devUserId&&config.allowDevLogin&&config.environment!=="production"){
     identity={sub:String(body.devUserId),email:body.email||null,name:body.name||null};
    }else{
     return json(res,400,{error:"identity_required"});
    }
    const session=sessionAuth.issue(identity);
    res.setHeader("Set-Cookie",sessionAuth.cookiesFor(session));
    return json(res,201,{authenticated:true,user:{sub:session.payload.sub,email:session.payload.email,name:session.payload.name}});
   }
   if(req.method==="DELETE"){
    const auth=sessionAuth.authenticate(req);
    if(auth.ok&&!sessionAuth.validateCsrf(req,auth))return json(res,403,{error:"csrf_failed"});
    res.setHeader("Set-Cookie",sessionAuth.clearCookies());
    return json(res,200,{authenticated:false});
   }
  }

  const principal=url.pathname.startsWith("/v1/")?authorizeApi(req,res):null;
  if(url.pathname.startsWith("/v1/")&&!principal)return;

  if(req.method==="GET"&&url.pathname==="/v1/status"){
   const vault=appRuntime.credentialVault;
   const providers=vault?.list?await vault.list():[];
   const workflows=[...appRuntime.workflows.values()];
   const workflowStates=workflows.reduce((acc,w)=>{acc[w.state]=(acc[w.state]||0)+1;return acc},{});
   return json(res,200,{
    backend:{connected:true,environment:config.environment},
    providers,
    providerHealth:appRuntime.providerHealth?.snapshot?.()||[],
    approvalsPending:appRuntime.approvals.filter(a=>!a.status||a.status==="pending").length,
    workflows:{total:workflows.length,states:workflowStates},
    auditIntegrity:appRuntime.auditLedger?.verify?.()||null,
    metrics:appRuntime.metrics.snapshot()
   });
  }
  if(req.method==="GET"&&url.pathname==="/v1/approvals")return json(res,200,{approvals:appRuntime.approvals});
  if(req.method==="GET"&&url.pathname==="/v1/audit")return json(res,200,{audit:appRuntime.audit,integrity:appRuntime.auditLedger?.verify?.()||null});
  if(req.method==="GET"&&url.pathname==="/v1/metrics")return json(res,200,appRuntime.metrics.snapshot());
  if(req.method==="GET"&&url.pathname==="/v1/workflows")return json(res,200,{workflows:[...appRuntime.workflows.values()]});
  if(req.method==="GET"&&url.pathname==="/v1/providers"){
   const vault=appRuntime.credentialVault||appRuntime.providers?.credentialVault;
   const connections=vault?.list?await vault.list():[];
   return json(res,200,{providers:connections,health:appRuntime.providerHealth?.snapshot?.()||[]});
  }
  if(req.method==="GET"&&url.pathname==="/v1/memory")return json(res,200,{records:appRuntime.memory.list()});
  if(req.method==="POST"&&url.pathname==="/v1/memory"){const body=await readJson(req);return json(res,201,appRuntime.memory.put(body))}
  if(req.method==="DELETE"&&url.pathname.startsWith("/v1/memory/")){
   const id=decodeURIComponent(url.pathname.slice("/v1/memory/".length));
   return json(res,200,{deleted:appRuntime.memory.remove(id)});
  }
  if(req.method==="POST"&&url.pathname==="/v1/actions/propose"){const body=await readJson(req);return json(res,200,await appRuntime.propose(body))}
  if(req.method==="POST"&&url.pathname.startsWith("/v1/approvals/")&&url.pathname.endsWith("/approve")){
   const id=url.pathname.split("/")[3];return json(res,200,await appRuntime.approve(id));
  }
  if(req.method==="POST"&&url.pathname.startsWith("/v1/approvals/")&&url.pathname.endsWith("/reject")){
   const id=url.pathname.split("/")[3];return json(res,200,await appRuntime.reject(id));
  }
  if(req.method==="POST"&&url.pathname==="/v1/jobs/tick")return json(res,200,{results:await appRuntime.scheduler.tick()});
  return json(res,404,{error:"not_found"});
 }catch(err){
  return json(res,500,{error:"internal_error",message:config.environment==="development"?err.message:undefined});
 }
}
function createServer({runtime:runtimeOverride=runtime}={}){return http.createServer((req,res)=>handler(req,res,runtimeOverride))}
if(require.main===module){
 const server=createServer();
 server.listen(config.port,()=>console.log(`Nikky Core listening on :${config.port}`));
}
module.exports={createServer,handler,runtime,sessionAuth,oidc};
