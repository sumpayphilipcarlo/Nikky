const assert=require("assert");
process.env.NIKKY_SERVICE_TOKEN="test-token";
process.env.NIKKY_MEMORY_KEY="test-memory-key";
const {createRuntime}=require("../server/runtime.js");
const {createServer}=require("../server/index.js");

(async()=>{
 const runtime=createRuntime();
 runtime.memory.put({id:"pref1",type:"preference",value:{arrivalBuffer:15}});
 assert.equal(runtime.memory.get("pref1").value.arrivalBuffer,15);
 const proposed=await runtime.propose({type:"email.send",title:"Test email"});
 assert.equal(proposed.result.status,"approval_required");
 assert.equal(runtime.approvals.length,1);
 const rejected=runtime.reject(runtime.approvals[0].id);
 assert.equal(rejected.status,"rejected");

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