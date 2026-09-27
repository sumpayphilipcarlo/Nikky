const assert=require("assert");
const {createPostgresPool}=require("../storage/db.js");
const {migrate}=require("../storage/migrate.js");
const {createPostgresRepository}=require("../storage/postgres.js");
const {createRuntime}=require("../server/runtime.js");
const {createServer}=require("../server/index.js");

(async()=>{
 const url=process.env.DATABASE_URL;
 assert.ok(url,"DATABASE_URL required");
 const pool=createPostgresPool({connectionString:url});
 try{
  await migrate({pool});
  const repo=createPostgresRepository(pool);
  await repo.upsertUser({id:"ci-user",email:"ci@example.com",displayName:"CI User"});
  const runtime=createRuntime({workflowRepository:repo,userId:"ci-user",providers:{
   twilio:{sendSms:async()=>({ok:true,live:true,source:"test",data:{sid:"SMCI"}}),placeCall:async()=>({ok:true,live:true,source:"test"})},
   gmail:{send:async()=>({ok:true,live:true,source:"test",message:{id:"MCI"}})}
  }});
  const proposal=await runtime.propose({type:"sms.send",title:"CI SMS",to:"+15550000000",body:"hello",idempotencyKey:"pg-ci-sms"});
  assert.equal(proposal.result.status,"approval_required");
  const rows=await repo.listWorkflows("ci-user",{limit:10});
  assert.ok(rows.some(r=>r.id===proposal.workflow.id&&r.state==="awaiting_approval"));

  const restored=createRuntime({workflowRepository:repo,userId:"ci-user"});
  await restored.restoreWorkflows();
  assert.ok(restored.workflows.has(proposal.workflow.id));

  await repo.saveMemory("ci-user",{id:"mem-ci",type:"preference",encryptedValue:{ciphertext:"test"},source:"ci",sensitivity:"normal"});
  const mem=await pool.query("SELECT id,type FROM memories WHERE id=$1",["mem-ci"]);
  assert.equal(mem.rows[0].type,"preference");

  await pool.query("INSERT INTO jobs(id,user_id,type,payload,enabled,interval_ms,next_run_at) VALUES($1,$2,$3,$4,TRUE,$5,NOW()) ON CONFLICT(id) DO UPDATE SET next_run_at=NOW()",["job-ci","ci-user","runtime.scheduler.tick",{},60000]);
  const due=await repo.listDueJobs(new Date(Date.now()+1000),10);
  assert.ok(due.some(j=>j.id==="job-ci"));

  process.env.NIKKY_SERVICE_TOKEN="p".repeat(40);
  const server=createServer({runtime});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const base="http://127.0.0.1:"+server.address().port;
  const res=await fetch(base+"/v1/workflows",{headers:{authorization:"Bearer "+"p".repeat(40)}});
  assert.equal(res.status,200);
  const body=await res.json();
  assert.ok(body.workflows.some(w=>w.id===proposal.workflow.id));
  await new Promise(resolve=>server.close(resolve));

  const providerRow=await repo.saveProviderConnection("ci-user",{id:"ci-user:google",provider:"google",status:"connected",encryptedCredentials:{v:1,alg:"AES-GCM",iv:"iv",ciphertext:"cipher"},scopes:["calendar.readonly"],lastHealth:{status:"healthy"}});
  assert.equal(providerRow.provider,"google");
  const providerRead=await repo.getProviderConnection("ci-user","google");
  assert.equal(providerRead.scopes[0],"calendar.readonly");
  const providerList=await repo.listProviderConnections("ci-user");
  assert.ok(providerList.some(x=>x.provider==="google"));
  await repo.updateProviderHealth("ci-user","google",{status:"degraded"});
  assert.equal((await repo.getProviderConnection("ci-user","google")).last_health.status,"degraded");
  assert.equal(await repo.deleteProviderConnection("ci-user","google"),true);

  console.log("Nikky PostgreSQL integration tests passed");
 }finally{
  await pool.query("DELETE FROM jobs WHERE id='job-ci'").catch(()=>{});
  await pool.query("DELETE FROM memories WHERE id='mem-ci'").catch(()=>{});
  await pool.query("DELETE FROM workflows WHERE user_id='ci-user'").catch(()=>{});
  await pool.query("DELETE FROM users WHERE id='ci-user'").catch(()=>{});
  await pool.end();
 }
})().catch(e=>{console.error(e);process.exit(1)});