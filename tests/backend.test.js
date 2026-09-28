const assert=require("assert");
const {loadConfig}=require("../server/config.js");
process.env.NIKKY_SERVICE_TOKEN="test-token";
process.env.NIKKY_MEMORY_KEY="test-memory-key";
process.env.NIKKY_SESSION_SECRET="s".repeat(48);
process.env.NIKKY_ALLOW_DEV_LOGIN="true";
const {createRuntime,createActionExecutor}=require("../server/runtime.js");
const {createServer}=require("../server/index.js");
const Orchestrator=require("../orchestrator.js");

(async()=>{
 const executor=createActionExecutor({
  gmail:{send:async({raw})=>({ok:true,live:true,source:"gmail-test",message:{id:raw}})},
  twilio:{sendSms:async({to,body})=>({ok:true,live:true,source:"twilio-test",data:{sid:"SM1",to,body}}),placeCall:async()=>({ok:true,live:true,source:"twilio-test",data:{sid:"CA1"}})}
 });
 let executed=await executor({type:"sms.send",to:"+15550000000",body:"hello"});
 assert.equal(executed.ok,true);
 assert.equal(executed.live,true);
 const failClosed=createActionExecutor({gmail:{send:async()=>({ok:true,live:false,source:"mock"})}});
 executed=await failClosed({type:"email.send",raw:"test"});
 assert.equal(executed.ok,false);
 assert.match(executed.reason,/live execution/);
 executed=await executor({type:"unsupported.action"});
 assert.equal(executed.ok,false);

 const calls=[];
 const expanded=createActionExecutor({
  calendar:{
   createEvent:async x=>{calls.push(["calendar.create",x]);return {ok:true,live:true}},
   updateEvent:async x=>{calls.push(["calendar.update",x]);return {ok:true,live:true}},
   deleteEvent:async x=>{calls.push(["calendar.delete",x]);return {ok:true,live:true}}
  },
  push:{send:async x=>{calls.push(["push.send",x]);return {ok:true,live:true}}},
  slack:{postMessage:async x=>{calls.push(["slack.send",x]);return {ok:true,live:true}}},
  microsoft365:{sendMail:async x=>{calls.push(["microsoft.email.send",x]);return {ok:true,live:true}}},
  whatsapp:{sendText:async x=>{calls.push(["whatsapp.send",x]);return {ok:true,live:true}}},
  homeAssistant:{service:async x=>{calls.push(["home.service",x]);return {ok:true,live:true}}},
  spotify:{play:async x=>{calls.push(["spotify.play",x]);return {ok:true,live:true}}},
  twilio:{sendSms:async x=>{calls.push(["sms.send",x]);return {ok:true,live:true}},placeCall:async()=>({ok:true,live:true})}
 });
 assert.equal((await expanded({type:"calendar.create",payload:{event:{summary:"Meeting"}}})).ok,true);
 assert.equal((await expanded({type:"calendar.update",payload:{eventId:"e1",event:{summary:"Updated"}}})).ok,true);
 assert.equal((await expanded({type:"calendar.delete",payload:{eventId:"e1"}})).ok,true);
 assert.equal((await expanded({type:"push.send",payload:{deviceToken:"d",title:"Nikky",message:"Go"}})).ok,true);
 assert.equal((await expanded({type:"slack.send",payload:{channel:"C1",message:"hello"}})).ok,true);
 assert.equal((await expanded({type:"microsoft.email.send",payload:{recipient:"a@example.com",subject:"Hi",message:"Body"}})).ok,true);
 assert.equal((await expanded({type:"whatsapp.send",payload:{recipient:"+1",message:"hello"}})).ok,true);
 assert.equal((await expanded({type:"home.service",payload:{domain:"light",service:"turn_on",data:{entity_id:"light.office"}}})).ok,true);
 assert.equal((await expanded({type:"spotify.play",payload:{uris:["spotify:track:1"]}})).ok,true);
 assert.equal((await expanded({type:"sms.send",payload:{recipient:"+1555",message:"payload aliases"}})).ok,true);
 assert.ok(calls.length>=10);

 let clock=1000, executions=0;
 const approvalQueue=[],approvalAudit=[];
 const approvalOrchestrator=Orchestrator.create({approvalQueue,auditLog:approvalAudit,now:()=>clock,approvalTtlMs:100,executor:async()=>{executions++;return {ok:true,live:true}}});
 const expiring=await approvalOrchestrator.propose({type:"sms.send",to:"+15550000000",body:"test"});
 clock=1100;
 const expired=await approvalOrchestrator.approve(expiring.item.id);
 assert.equal(expired.status,"expired");
 assert.equal(executions,0);
 const replay=await approvalOrchestrator.approve(expiring.item.id);
 assert.notEqual(replay.status,"executed");
 assert.equal(executions,0);

 const persisted=[];
 const workflowRepository={
  saveWorkflow:async(userId,w)=>{persisted.push({userId,w:JSON.parse(JSON.stringify(w))});return w},
  listWorkflows:async()=>[{id:"restored-1",type:"sms.send",state:"failed",context:{},steps:[],history:[],attempt:1,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}]
 };
 const runtime=createRuntime({workflowRepository,userId:"user-1",providers:{
  gmail:{send:async()=>({ok:true,live:true,source:"gmail-test",message:{id:"m1"}})},
  twilio:{sendSms:async()=>({ok:true,live:true,source:"twilio-test",data:{sid:"SM1"}}),placeCall:async()=>({ok:true,live:true,source:"twilio-test",data:{sid:"CA1"}})}
 }});
 runtime.memory.put({id:"pref1",type:"preference",value:{arrivalBuffer:15}});
 assert.equal(runtime.memory.get("pref1").value.arrivalBuffer,15);
 const restored=await runtime.restoreWorkflows();
 assert.ok(restored.some(w=>w.id==="restored-1"));
 const proposed=await runtime.propose({type:"email.send",title:"Test email",idempotencyKey:"email-test-1"});
 assert.equal(proposed.result.status,"approval_required");
 assert.ok(persisted.some(x=>x.userId==="user-1"&&x.w.state==="awaiting_approval"));
 assert.equal(runtime.approvals.length,1);
 const rejected=await runtime.reject(runtime.approvals[0].id);
 assert.equal(rejected.status,"rejected");
 const sendProposal=await runtime.propose({type:"sms.send",title:"Approved SMS",to:"+15550000000",body:"On my way",idempotencyKey:"sms-approved-1"});
 assert.equal(sendProposal.result.status,"approval_required");
 const approved=await runtime.approve(sendProposal.result.item.id);
 assert.equal(approved.status,"executed");
 assert.equal(approved.result.live,true);
 assert.ok(runtime.audit.some(e=>e.decision==="approved"));
 assert.ok(runtime.audit.some(e=>e.decision==="executed"));
 const duplicateProposal=await runtime.propose({type:"sms.send",title:"Duplicate guard",to:"+15550000000",body:"Once",idempotencyKey:"once-only"});
 const firstDuplicate=await runtime.approve(duplicateProposal.result.item.id);
 assert.equal(firstDuplicate.status,"executed");
 const duplicateProposal2=await runtime.propose({type:"sms.send",title:"Duplicate guard",to:"+15550000000",body:"Once",idempotencyKey:"once-only"});
 const secondDuplicate=await runtime.approve(duplicateProposal2.result.item.id);
 assert.equal(secondDuplicate.status,"executed");
 assert.equal(secondDuplicate.result.deduplicated,true);
 const missingKey=await runtime.propose({type:"sms.send",title:"No key",to:"+15550000000",body:"blocked"});
 const missingKeyResult=await runtime.approve(missingKey.result.item.id);
 assert.equal(missingKeyResult.status,"execution_failed");
 assert.match(missingKeyResult.result.reason,/idempotency key/);

 const server=createServer();
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const port=server.address().port;
 const base="http://127.0.0.1:"+port;
 let res=await fetch(base+"/");
 assert.equal(res.status,200);
 assert.match(res.headers.get("content-type")||"",/text\/html/);
 const homeHtml=await res.text();
 assert.ok(homeHtml.includes("NIKKY FABRIC"));
 res=await fetch(base+"/api-client.js");
 assert.equal(res.status,200);
 assert.match(res.headers.get("content-type")||"",/javascript/);

 res=await fetch(base+"/health");
 assert.equal(res.status,200);
 let body=await res.json();
 assert.equal(body.ok,true);

 res=await fetch(base+"/v1/metrics");
 assert.equal(res.status,401);

 res=await fetch(base+"/v1/status",{headers:{"authorization":"Bearer test-token"}});
 assert.equal(res.status,200);
 body=await res.json();
 assert.equal(body.backend.connected,true);
 assert.ok(body.workflows&&typeof body.workflows.total==="number");
 assert.ok(body.auditIntegrity&&typeof body.auditIntegrity.ok==="boolean");

 res=await fetch(base+"/v1/providers",{headers:{"authorization":"Bearer test-token"}});
 assert.equal(res.status,200);
 body=await res.json();
 assert.ok(Array.isArray(body.providers));
 assert.equal(JSON.stringify(body).includes("refreshToken"),false);
 assert.equal(JSON.stringify(body).includes("clientSecret"),false);

 res=await fetch(base+"/v1/memory",{
   method:"POST",
   headers:{"authorization":"Bearer test-token","content-type":"application/json"},
   body:JSON.stringify({id:"server-memory",type:"preference",value:{wake:"07:00"}})
 });
 assert.equal(res.status,201);
 body=await res.json();
 assert.equal(body.id,"server-memory");

 res=await fetch(base+"/v1/actions/propose",{
   method:"POST",
   headers:{"authorization":"Bearer test-token","content-type":"application/json"},
   body:JSON.stringify({type:"sms.send",title:"Delay notice",idempotencyKey:"server-sms-1"})
 });
 assert.equal(res.status,200);
 body=await res.json();
 assert.equal(body.result.status,"approval_required");

 assert.equal(loadConfig({NODE_ENV:"production",PORT:"3000"}).valid,false);
 const validCfg=loadConfig({NODE_ENV:"production",PORT:"3000",NIKKY_SERVICE_TOKEN:"x".repeat(32),NIKKY_MEMORY_KEY:"y".repeat(32),NIKKY_SESSION_SECRET:"z".repeat(32),DATABASE_URL:"postgres://example"});
 assert.equal(validCfg.valid,true);

 res=await fetch(base+"/auth/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({devUserId:"web-user",email:"web@example.com"})});
 assert.equal(res.status,201);
 const setCookies=typeof res.headers.getSetCookie==="function"?res.headers.getSetCookie():[res.headers.get("set-cookie")].filter(Boolean);
 assert.ok(setCookies.length>=1);
 const cookieHeader=setCookies.map(x=>x.split(";")[0]).join("; ");
 const csrfMatch=cookieHeader.match(/nikky_csrf=([^;]+)/);
 assert.ok(csrfMatch);
 const csrf=decodeURIComponent(csrfMatch[1]);

 res=await fetch(base+"/v1/memory",{headers:{cookie:cookieHeader}});
 assert.equal(res.status,200);

 res=await fetch(base+"/v1/memory",{method:"POST",headers:{cookie:cookieHeader,"content-type":"application/json"},body:JSON.stringify({id:"csrf-blocked",type:"test",value:{}})});
 assert.equal(res.status,403);

 res=await fetch(base+"/v1/memory",{method:"POST",headers:{cookie:cookieHeader,"x-nikky-csrf":csrf,"content-type":"application/json"},body:JSON.stringify({id:"session-memory",type:"test",value:{ok:true}})});
 assert.equal(res.status,201);

 res=await fetch(base+"/health");
 assert.equal(res.headers.get("x-content-type-options"),"nosniff");
 assert.equal(res.headers.get("x-frame-options"),"DENY");
 assert.ok(res.headers.get("x-request-id"));

 runtime.policyStore.add({id:"auto-note",actionType:"note.create",effect:"allow"});
 const scopedResult=await runtime.propose({type:"note.create",payload:{body:"hello"}});
 assert.equal(scopedResult.result.verdict.level,"auto");
 assert.equal(runtime.auditLedger.verify().ok,true);

 await new Promise(resolve=>server.close(resolve));
 console.log("Nikky backend tests passed");
})().catch(err=>{console.error(err);process.exit(1)});