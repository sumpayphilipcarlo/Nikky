const http=require("http");
const {URL}=require("url");
const {loadConfig}=require("./config.js");
const {createRuntime}=require("./runtime.js");
const {securityHeaders,requestId,createRateLimiter,timingSafeEqual}=require("./security.js");
const {createSessionAuth}=require("./auth.js");
const {createOidcVerifier}=require("./oidc.js");
const {createMonitor}=require("./monitoring.js");

const {config,warnings}=loadConfig();
const runtime=createRuntime();
const limiter=createRateLimiter({windowMs:60000,max:120});
const defaultMonitor=createMonitor();
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
 const startedAt=Date.now();
 securityHeaders(res);const reqId=requestId(req,res);
 res.once("finish",()=>{(appRuntime.monitor||defaultMonitor).request({requestId:reqId,method:req.method,path:req.url,status:res.statusCode,durationMs:Date.now()-startedAt})});
 if(!applyCors(req,res)){return json(res,403,{error:"origin_not_allowed"})}
 if(req.method==="OPTIONS"){res.writeHead(204);return res.end()}
 const url=new URL(req.url,"http://localhost");
 try{
  if(req.method==="GET"&&url.pathname==="/health"){
   return json(res,200,{ok:true,service:"nikky-core",environment:config.environment,warnings});
  }
  if(req.method==="GET"&&url.pathname==="/health/live"){
   return json(res,200,{ok:true,status:"live",service:"nikky-core"});
  }
  if(req.method==="GET"&&url.pathname==="/health/ready"){
   if(typeof appRuntime.readiness!=="function")return json(res,503,{ok:false,status:"not-ready",reason:"readiness checks not configured"});
   const ready=await appRuntime.readiness();
   return json(res,ready?.ok?200:503,{ok:!!ready?.ok,status:ready?.ok?"ready":"not-ready",checks:ready?.checks||ready});
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
  if(config.environment==="production"&&principal?.mode==="session"&&appRuntime.userId&&principal.identity?.sub!==appRuntime.userId){
   return json(res,403,{error:"user_scope_mismatch"});
  }

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
    metrics:appRuntime.metrics.snapshot(),
    fabric:{endpoints:appRuntime.fabric?.list?.().length||0},
    missions:{total:appRuntime.missionPlanner?.list?.().length||0},
    guardian:{openIncidents:(appRuntime.guardian?.list?.()||[]).filter(i=>i.status==="open").length},
    sensors:{sources:appRuntime.sensorFusion?.health?.().length||0}
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
  if(req.method==="GET"&&url.pathname==="/v1/fabric")return json(res,200,{endpoints:appRuntime.fabric.list()});
  if(req.method==="POST"&&url.pathname==="/v1/fabric/endpoints"){const body=await readJson(req);const value=appRuntime.fabric.register(body);await appRuntime.persistRuntimeState?.("fabric");return json(res,201,value)}
  if(req.method==="DELETE"&&url.pathname.startsWith("/v1/fabric/endpoints/")){
   const id=decodeURIComponent(url.pathname.slice("/v1/fabric/endpoints/".length));
   const deleted=appRuntime.fabric.remove(id);await appRuntime.persistRuntimeState?.("fabric");return json(res,200,{deleted});
  }
  if(req.method==="POST"&&url.pathname==="/v1/fabric/resolve"){
   const body=await readJson(req);return json(res,200,appRuntime.fabric.resolve(body.capability,body.options||{}));
  }
  if(req.method==="POST"&&url.pathname==="/v1/fabric/discover"){
   const body=await readJson(req);const value=await appRuntime.discovery.scan(body||{});await appRuntime.persistRuntimeState?.("fabric");return json(res,200,value);
  }
  if(req.method==="POST"&&url.pathname==="/v1/goals/plan"){
   const body=await readJson(req);return json(res,200,appRuntime.goalPlanner.plan(body));
  }
  if(req.method==="GET"&&url.pathname==="/v1/permissions")return json(res,200,{permissions:appRuntime.capabilityPermissions.list()});
  if(req.method==="POST"&&url.pathname==="/v1/permissions"){const body=await readJson(req);const value=appRuntime.capabilityPermissions.grant(body);await appRuntime.persistRuntimeState?.("capability_permissions");return json(res,201,value)}
  if(req.method==="DELETE"&&url.pathname.startsWith("/v1/permissions/")){
   const parts=url.pathname.split("/").filter(Boolean);
   const deleted=appRuntime.capabilityPermissions.revoke(decodeURIComponent(parts[2]||""),decodeURIComponent(parts[3]||""));await appRuntime.persistRuntimeState?.("capability_permissions");return json(res,200,{deleted});
  }
  if(req.method==="GET"&&url.pathname==="/v1/missions")return json(res,200,{missions:appRuntime.missionPlanner.list()});
  if(req.method==="POST"&&url.pathname==="/v1/missions"){const body=await readJson(req);const value=appRuntime.missionPlanner.create(body);await appRuntime.persistRuntimeState?.("missions");return json(res,201,value)}
  if(req.method==="POST"&&url.pathname.startsWith("/v1/missions/")&&url.pathname.endsWith("/run")){
   const id=url.pathname.split("/")[3];const value=await appRuntime.missionRunner.run(id);await appRuntime.persistRuntimeState?.("missions");return json(res,200,value);
  }
  if(req.method==="POST"&&url.pathname.startsWith("/v1/missions/")&&url.pathname.endsWith("/resume")){
   const id=url.pathname.split("/")[3];const value=await appRuntime.missionRunner.resume(id);await appRuntime.persistRuntimeState?.("missions");return json(res,200,value);
  }
  if(req.method==="GET"&&url.pathname.startsWith("/v1/missions/")){
   const id=decodeURIComponent(url.pathname.slice("/v1/missions/".length));const mission=appRuntime.missionPlanner.get(id);
   return mission?json(res,200,mission):json(res,404,{error:"mission_not_found"});
  }
  if(req.method==="POST"&&url.pathname==="/v1/transactions/evaluate"){const body=await readJson(req);return json(res,200,appRuntime.transactionSafety.evaluate(body.transaction||{},body.policy||{}))}
  if(req.method==="POST"&&url.pathname==="/v1/transactions/record"){const body=await readJson(req);const value=appRuntime.transactionSafety.record(body.transaction||{},body.result||{});await appRuntime.persistRuntimeState?.("transactions");return json(res,201,value)}
  if(req.method==="POST"&&url.pathname==="/v1/sensors"){const body=await readJson(req);const value=appRuntime.sensorFusion.ingest(body);await appRuntime.persistRuntimeState?.("sensors");return json(res,201,value)}
  if(req.method==="GET"&&url.pathname==="/v1/sensors/health")return json(res,200,{sensors:appRuntime.sensorFusion.health()});
  if(req.method==="GET"&&url.pathname==="/v1/guardian/incidents")return json(res,200,{incidents:appRuntime.guardian.list()});
  if(req.method==="POST"&&url.pathname==="/v1/guardian/incidents"){
   const body=await readJson(req);
   const configured=body.policyId?appRuntime.emergencyPolicies.get?.(body.policyId):appRuntime.emergencyPolicies.evaluate(body.type,{location:body.location}).policy;
   const value=appRuntime.guardian.start({type:body.type,signals:body.signals||[],location:body.location||null,policy:configured||{}});
   await appRuntime.persistRuntimeState?.("guardian_incidents");return json(res,201,value);
  }
  if(req.method==="POST"&&url.pathname.startsWith("/v1/guardian/incidents/")&&url.pathname.endsWith("/escalate")){
   const id=url.pathname.split("/")[4];const body=await readJson(req);const value=await appRuntime.guardian.escalate(id,body);await appRuntime.persistRuntimeState?.("guardian_incidents");return json(res,200,value);
  }
  if(req.method==="POST"&&url.pathname==="/v1/guardian/policies"){const body=await readJson(req);const value=appRuntime.emergencyPolicies.upsert(body);await appRuntime.persistRuntimeState?.("emergency_policies");return json(res,201,value)}
  if(req.method==="GET"&&url.pathname==="/v1/guardian/policies")return json(res,200,{policies:appRuntime.emergencyPolicies.list()});
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
  (appRuntime.monitor||defaultMonitor).error("request_failed",err,{requestId:reqId,method:req.method,path:req.url});
  return json(res,500,{error:"internal_error",message:config.environment==="development"?err.message:undefined});
 }
}
function createServer({runtime:runtimeOverride=runtime}={}){return http.createServer((req,res)=>handler(req,res,runtimeOverride))}
if(require.main===module){
 const server=createServer();
 server.listen(config.port,()=>console.log(`Nikky Core listening on :${config.port}`));
}
module.exports={createServer,handler,runtime,sessionAuth,oidc};
