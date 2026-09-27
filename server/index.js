const http=require("http");
const {URL}=require("url");
const {loadConfig}=require("./config.js");
const {createRuntime}=require("./runtime.js");
const {securityHeaders,requestId,createRateLimiter,timingSafeEqual}=require("./security.js");

const {config,warnings}=loadConfig();
const runtime=createRuntime();
const limiter=createRateLimiter({windowMs:60000,max:120});

function json(res,status,body){const data=JSON.stringify(body);res.writeHead(status,{"content-type":"application/json","content-length":Buffer.byteLength(data)});res.end(data)}
function readJson(req){return new Promise((resolve,reject)=>{let body="";req.on("data",c=>{body+=c;if(body.length>1e6){reject(new Error("request too large"));req.destroy()}});req.on("end",()=>{try{resolve(body?JSON.parse(body):{})}catch(e){reject(e)}});req.on("error",reject)})}
function bearer(req){const h=req.headers.authorization||"";return h.startsWith("Bearer ")?h.slice(7):""}
function requireService(req,res){
 const rate=limiter.check(req.socket?.remoteAddress||"unknown");
 res.setHeader("X-RateLimit-Remaining",String(rate.remaining));
 if(!rate.allowed){json(res,429,{error:"rate_limited"});return false}
 if(!config.serviceToken||!timingSafeEqual(bearer(req),config.serviceToken)){json(res,401,{error:"unauthorized"});return false}
 return true
}

async function handler(req,res){
 securityHeaders(res);requestId(req,res);
 const url=new URL(req.url,"http://localhost");
 try{
  if(req.method==="GET"&&url.pathname==="/health")return json(res,200,{ok:true,service:"nikky-core",environment:config.environment,warnings});
  if(req.method==="GET"&&url.pathname==="/v1/approvals"){if(!requireService(req,res))return;return json(res,200,{approvals:runtime.approvals})}
  if(req.method==="GET"&&url.pathname==="/v1/audit"){if(!requireService(req,res))return;return json(res,200,{audit:runtime.audit})}
  if(req.method==="GET"&&url.pathname==="/v1/metrics"){if(!requireService(req,res))return;return json(res,200,runtime.metrics.snapshot())}
  if(req.method==="GET"&&url.pathname==="/v1/workflows"){if(!requireService(req,res))return;return json(res,200,{workflows:[...runtime.workflows.values()]})}
  if(req.method==="GET"&&url.pathname==="/v1/memory"){if(!requireService(req,res))return;return json(res,200,{records:runtime.memory.list()})}
  if(req.method==="POST"&&url.pathname==="/v1/memory"){if(!requireService(req,res))return;const body=await readJson(req);return json(res,201,runtime.memory.put(body))}
  if(req.method==="DELETE"&&url.pathname.startsWith("/v1/memory/")){if(!requireService(req,res))return;const id=decodeURIComponent(url.pathname.slice("/v1/memory/".length));return json(res,200,{deleted:runtime.memory.remove(id)})}
  if(req.method==="POST"&&url.pathname==="/v1/actions/propose"){if(!requireService(req,res))return;const body=await readJson(req);return json(res,200,await runtime.propose(body))}
  if(req.method==="POST"&&url.pathname.startsWith("/v1/approvals/")&&url.pathname.endsWith("/approve")){if(!requireService(req,res))return;const id=url.pathname.split("/")[3];return json(res,200,await runtime.approve(id))}
  if(req.method==="POST"&&url.pathname.startsWith("/v1/approvals/")&&url.pathname.endsWith("/reject")){if(!requireService(req,res))return;const id=url.pathname.split("/")[3];return json(res,200,runtime.reject(id))}
  if(req.method==="POST"&&url.pathname==="/v1/jobs/tick"){if(!requireService(req,res))return;return json(res,200,{results:await runtime.scheduler.tick()})}
  return json(res,404,{error:"not_found"});
 }catch(err){return json(res,500,{error:"internal_error",message:config.environment==="development"?err.message:undefined})}
}
function createServer(){return http.createServer(handler)}
if(require.main===module){const server=createServer();server.listen(config.port,()=>console.log(`Nikky Core listening on :${config.port}`))}
module.exports={createServer,handler,runtime};