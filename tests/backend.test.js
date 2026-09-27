const assert=require("assert");
process.env.NIKKY_SERVICE_TOKEN="test-token";
process.env.NIKKY_MEMORY_KEY="test-memory-key";
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

 const runtime=createRuntime({providers:{
  gmail:{send:async()=>({ok:true,live:true,source:"gmail-test",message:{id:"m1"}})},
  twilio:{sendSms:async()=>({ok:true,live:true,source:"twilio-test",data:{sid:"SM1"}}),placeCall:async()=>({ok:true,live:true,source:"twilio-test",data:{sid:"CA1"}})}
 }});
 runtime.memory.put({id:"pref1",type:"preference",value:{arrivalBuffer:15}});
 assert.equal(runtime.memory.get("pref1").value.arrivalBuffer,15);
 const proposed=await runtime.propose({type:"email.send",title:"Test email"});
 assert.equal(proposed.result.status,"approval_required");
 assert.equal(runtime.approvals.length,1);
 const rejected=runtime.reject(runtime.approvals[0].id);
 assert.equal(rejected.status,"rejected");
 const sendProposal=await runtime.propose({type:"sms.send",title:"Approved SMS",to:"+15550000000",body:"On my way"});
 assert.equal(sendProposal.result.status,"approval_required");
 const approved=await runtime.approve(sendProposal.result.item.id);
 assert.equal(approved.status,"executed");
 assert.equal(approved.result.live,true);
 assert.ok(runtime.audit.some(e=>e.decision==="approved"));
 assert.ok(runtime.audit.some(e=>e.decision==="executed"));

 const server=createServer();
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const port=server.address().port;
 const base="http://127.0.0.1:"+port;
 let res=await fetch(base+"/health");
 assert.equal(res.status,200);
 let body=await res.json();
 assert.equal(body.ok,true);

 res=await fetch(base+"/v1/metrics");
 assert.equal(res.status,401);

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
   body:JSON.stringify({type:"sms.send",title:"Delay notice"})
 });
 assert.equal(res.status,200);
 body=await res.json();
 assert.equal(body.result.status,"approval_required");

 await new Promise(resolve=>server.close(resolve));
 console.log("Nikky backend tests passed");
})().catch(err=>{console.error(err);process.exit(1)});