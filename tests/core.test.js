const assert=require("assert");
const Authority=require("../authority.js");
global.NikkyAuthority=Authority;
const Orchestrator=require("../orchestrator.js");
const Context=require("../context.js");
const Proactive=require("../proactive.js");
const Journey=require("../journey.js");

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

  const failing=Orchestrator.create({
    approvalQueue:[],
    auditLog:[],
    executor:async()=>({ok:false,reason:"provider unavailable"})
  });
  const failResult=await failing.propose({type:"weather.read"});
  assert.equal(failResult.status,"execution_failed");

  const ctx=Context.create();
  ctx.observe("prep.duration",{minutes:40});
  ctx.observe("prep.duration",{minutes:50});
  ctx.observe("commute.duration",{minutes:55});
  ctx.observe("commute.duration",{minutes:65});
  const learned=ctx.infer();
  assert.equal(learned.typicalPrepMinutes,45);
  assert.equal(learned.typicalCommuteMinutes,60);

  const now=new Date("2026-09-27T07:35:00");
  const suggestions=Proactive.detect({
    now,
    routine:{arrival:"09:00",prep:45,commute:60,buffer:15},
    learned:{typicalPrepMinutes:45,typicalCommuteMinutes:60},
    events:[{id:"a1",title:"Anniversary",type:"Anniversary",date:"2026-10-02"}]
  });
  assert.ok(suggestions.some(x=>x.kind==="life-event"));
  assert.ok(suggestions.some(x=>x.kind==="departure"));

  assert.equal(Authority.evaluate({type:"proactive.notify"}).level,Authority.LEVELS.AUTO);

  const journey=Journey.plan({
    event:{id:"m1",title:"Client meeting",time:"09:00",contact:"client"},
    routine:{prep:45,commute:60,buffer:15},
    learned:{typicalPrepMinutes:50,typicalCommuteMinutes:70},
    trafficMinutes:80,
    now:new Date("2026-09-27T08:10:00")
  });
  assert.equal(journey.ok,true);
  assert.equal(journey.leaveAt,"07:25");
  assert.equal(journey.prepareAt,"06:35");
  assert.equal(journey.status,"late-risk");
  assert.ok(journey.communicationAction);
  assert.equal(journey.communicationAction.type,"sms.send");

  console.log("Nikky core tests passed");
})().catch(err=>{console.error(err);process.exit(1)});