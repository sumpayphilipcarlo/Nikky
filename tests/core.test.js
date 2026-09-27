const assert=require("assert");
const Authority=require("../authority.js");
global.NikkyAuthority=Authority;
const Orchestrator=require("../orchestrator.js");
const Context=require("../context.js");

(async()=>{
  assert.equal(Authority.evaluate({type:"weather.read"}).level,Authority.LEVELS.AUTO);
  assert.equal(Authority.evaluate({type:"email.send"}).level,Authority.LEVELS.APPROVAL);
  assert.equal(Authority.evaluate({type:"external.highImpact"}).level,Authority.LEVELS.DENY);
  assert.equal(Authority.evaluate({type:"unknown.action"}).level,Authority.LEVELS.APPROVAL);

  const approvals=[],audit=[];
  const orch=Orchestrator.create({approvalQueue:approvals,auditLog:audit});
  const email=await orch.propose({type:"email.send",title:"Test email"});
  assert.equal(email.status,"approval_required");
  assert.equal(approvals.length,1);
  assert.ok(audit.length>=1);

  const denied=await orch.propose({type:"external.highImpact"});
  assert.equal(denied.status,"denied");

  const ctx=Context.create();
  ctx.observe("prep.duration",{minutes:40});
  ctx.observe("prep.duration",{minutes:50});
  ctx.observe("commute.duration",{minutes:55});
  ctx.observe("commute.duration",{minutes:65});
  const learned=ctx.infer();
  assert.equal(learned.typicalPrepMinutes,45);
  assert.equal(learned.typicalCommuteMinutes,60);

  console.log("Nikky core tests passed");
})().catch(err=>{console.error(err);process.exit(1)});