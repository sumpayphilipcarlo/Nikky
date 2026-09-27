const assert=require("assert");
const Workflow=require("../core/workflow-engine.js");
const {createIdempotencyStore}=require("../core/idempotency.js");
const Risk=require("../core/risk.js");
const {createSkillRegistry}=require("../core/skills.js");
const {createDeviceRegistry}=require("../core/devices.js");
const Recovery=require("../core/recovery.js");

const Authority=require("../authority.js");
global.NikkyAuthority=Authority;
const Orchestrator=require("../orchestrator.js");
const Context=require("../context.js");
const Proactive=require("../proactive.js");
const Journey=require("../journey.js");
const Providers=require("../providers.js");
global.NikkyProviders=Providers;
const GoogleCalendar=require("../google-calendar.js");

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

  const provider=Providers.createCalendarAdapter({
    mode:"mock",
    events:[
      {id:"e1",title:"Meeting",start:"2026-09-27T09:00:00",location:"Office"},
      {id:"e2",title:"Later",start:"2026-09-27T11:00:00",location:"Cafe"}
    ]
  });
  const upcoming=await provider.listUpcoming({from:new Date("2026-09-27T08:00:00"),limit:1});
  assert.equal(upcoming.ok,true);
  assert.equal(upcoming.live,false);
  assert.equal(upcoming.events.length,1);
  assert.equal(upcoming.events[0].title,"Meeting");
  assert.equal(upcoming.events[0].destination,"Office");

  const liveProvider=Providers.createCalendarAdapter({mode:"google"});
  const liveResult=await liveProvider.listUpcoming();
  assert.equal(liveResult.ok,false);
  assert.equal(liveResult.live,false);

  const normalizedGoogle=GoogleCalendar.normalizeGoogleEvent({
    id:"g1",
    summary:"Google meeting",
    start:{dateTime:"2026-09-27T09:30:00+08:00"},
    end:{dateTime:"2026-09-27T10:00:00+08:00"},
    location:"Makati",
    attendees:[{email:"me@example.com",self:true},{email:"client@example.com"}]
  });
  assert.equal(normalizedGoogle.title,"Google meeting");
  assert.equal(normalizedGoogle.destination,"Makati");
  assert.equal(normalizedGoogle.contact,"client@example.com");
  assert.equal(normalizedGoogle.source,"google-calendar");

  let tokenCleared=false;
  const tokenProvider={
    getToken:async()=>({ok:true,accessToken:"test-token"}),
    clear:()=>{tokenCleared=true}
  };
  const googleAdapter=GoogleCalendar.createGoogleCalendarAdapter({
    tokenProvider,
    fetchFn:async(url,options)=>({
      ok:true,
      status:200,
      json:async()=>({items:[{
        id:"g2",
        summary:"Live-style event",
        start:{dateTime:"2026-09-27T11:00:00+08:00"},
        location:"BGC"
      }]})
    })
  });
  const googleResult=await googleAdapter.listUpcoming({from:new Date("2026-09-27T08:00:00+08:00"),limit:5});
  assert.equal(googleResult.ok,true);
  assert.equal(googleResult.live,true);
  assert.equal(googleResult.events[0].title,"Live-style event");

  const unauthorizedAdapter=GoogleCalendar.createGoogleCalendarAdapter({
    tokenProvider,
    fetchFn:async()=>({ok:false,status:401,json:async()=>({error:{message:"Invalid Credentials"}})})
  });
  const unauthorized=await unauthorizedAdapter.listUpcoming();
  assert.equal(unauthorized.ok,false);
  assert.equal(unauthorized.live,false);
  assert.equal(tokenCleared,true);

  const wf=Workflow.createWorkflow({type:"meeting-trip"});
  Workflow.transition(wf,Workflow.STATES.PLANNED,"plan created");
  Workflow.transition(wf,Workflow.STATES.AWAITING_APPROVAL,"external message proposed");
  Workflow.transition(wf,Workflow.STATES.EXECUTING,"approved");
  Workflow.transition(wf,Workflow.STATES.COMPLETED,"done");
  assert.equal(wf.state,Workflow.STATES.COMPLETED);
  assert.equal(wf.attempt,1);
  assert.throws(()=>Workflow.transition(wf,Workflow.STATES.EXECUTING));

  const idem=createIdempotencyStore();
  let sideEffects=0;
  const first=await idem.run("email:abc",async()=>++sideEffects);
  const second=await idem.run("email:abc",async()=>++sideEffects);
  assert.equal(first.deduplicated,false);
  assert.equal(second.deduplicated,true);
  assert.equal(sideEffects,1);

  assert.equal(Risk.classify({type:"weather.read"}).level,Risk.LEVELS.LOW);
  assert.equal(Risk.classify({type:"email.send"}).requiresApproval,true);
  assert.equal(Risk.classify({type:"financial.transfer"}).level,Risk.LEVELS.CRITICAL);

  const skills=createSkillRegistry([{id:"calendar",name:"Calendar",permissions:["calendar.read"]}]);
  assert.equal(skills.can("calendar","calendar.read"),true);
  assert.equal(skills.can("calendar","calendar.write"),false);
  skills.setProviderState("calendar",{connected:true});
  assert.equal(skills.get("calendar").providerState.connected,true);

  const devices=createDeviceRegistry([
    {id:"phone",online:true,presence:10,channels:["push"],capabilities:["notify"]},
    {id:"laptop",online:true,presence:3,channels:["local"],capabilities:["notify"]}
  ]);
  assert.equal(devices.route({requiredCapability:"notify"})[0].deviceId,"phone");
  devices.revoke("phone");
  assert.equal(devices.route({requiredCapability:"notify"})[0].deviceId,"laptop");

  let tries=0;
  const retried=await Recovery.retry(async()=>{tries++;if(tries<2)throw new Error("temporary");return "ok"},{maxAttempts:3});
  assert.equal(retried.ok,true);
  assert.equal(retried.attempt,2);
  assert.equal(Recovery.backoff(3,{baseMs:100,maxMs:1000}),400);

  console.log("Nikky core tests passed");
})().catch(err=>{console.error(err);process.exit(1)});