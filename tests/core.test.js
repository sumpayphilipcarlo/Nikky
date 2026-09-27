const assert=require("assert");
const Maps=require("../providers/maps.js");
const Weather=require("../providers/weather.js");
const {createNotificationCenter}=require("../core/notifications.js");
const {createDepartureService}=require("../core/departure-service.js");

const {createRelationshipGraph}=require("../core/relationships.js");
const {detectCommitments,createCommitmentStore}=require("../core/commitments.js");
const {recommendFollowUps,draftFollowUp}=require("../core/followups.js");
const Gmail=require("../providers/gmail.js");
const Message=require("../core/message.js");

const Memory=require("../core/memory.js");
const {createIdentityService}=require("../core/identity.js");
const {createScheduler}=require("../core/scheduler.js");
const {createPrivacyController}=require("../core/privacy.js");
const Observability=require("../core/observability.js");

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

  const sealed=await Memory.seal({secret:"hello"},"test-key");
  const opened=await Memory.open(sealed,"test-key");
  assert.equal(opened.secret,"hello");
  const mem=Memory.createMemoryStore({retentionDays:1});
  mem.put({id:"m1",type:"preference",value:{buffer:15}});
  assert.equal(mem.get("m1").value.buffer,15);
  assert.equal(mem.exportAll().length,1);

  const ids=createIdentityService();
  ids.registerUser({id:"u1",email:"u@example.com"});
  ids.trustDevice("u1",{id:"d1",platform:"android"});
  const session=ids.createSession("u1",{deviceId:"d1"});
  assert.equal(ids.verifySession(session.id).userId,"u1");
  ids.revokeDevice("d1");
  assert.equal(ids.verifySession(session.id),null);

  let nowMs=1000,jobRuns=0;
  const scheduler=createScheduler({now:()=>nowMs});
  scheduler.upsert({id:"calendar-scan",intervalMs:60000,handler:async()=>++jobRuns});
  let tick=await scheduler.tick(nowMs);
  assert.equal(tick[0].ok,true);
  assert.equal(jobRuns,1);
  tick=await scheduler.tick(nowMs+1000);
  assert.equal(tick.length,0);
  nowMs+=60000;
  tick=await scheduler.tick(nowMs);
  assert.equal(jobRuns,2);

  const privacy=createPrivacyController();
  assert.equal(privacy.canLearn("location","home"),false);
  assert.equal(privacy.retentionFor("communications"),90);
  privacy.blockLearning("relationships","person-1");
  assert.equal(privacy.canLearn("relationships","person-1"),false);

  const metrics=Observability.createMetrics();
  Observability.recordSuggestion(metrics,{accepted:true});
  Observability.recordAction(metrics,{decision:"approval",status:"completed"});
  const snap=metrics.snapshot();
  assert.equal(snap.counters['suggestions.total:{}'],1);
  assert.equal(snap.counters['suggestions.accepted:{}'],1);
  assert.equal(snap.counters['authority.approval:{}'],1);

  const graph=createRelationshipGraph();
  graph.upsertPerson({id:"tim",name:"Tim",email:"tim@example.com",priority:10});
  graph.recordInteraction({personId:"tim",channel:"email",direction:"outbound"});
  assert.equal(graph.find("tim")[0].interactions,1);

  const detected=detectCommitments("I'll send the report tomorrow.",{source:"email",now:new Date("2026-09-27T08:00:00Z")});
  assert.equal(detected.length,1);
  assert.equal(detected[0].owner,"self");
  const commitments=createCommitmentStore(detected);
  assert.equal(commitments.open().length,1);
  const overdue=recommendFollowUps({commitments:commitments.list(),now:new Date("2026-09-29T08:00:00Z")});
  assert.equal(overdue[0].kind,"commitment-overdue");
  assert.ok(draftFollowUp(overdue[0],{personName:"Tim"}).body.includes("Tim"));

  const normalizedMail=Gmail.normalizeMessage({id:"g1",threadId:"t1",snippet:"Hello",payload:{headers:[{name:"Subject",value:"Meeting"},{name:"From",value:"Tim <tim@example.com>"}]}});
  assert.equal(normalizedMail.subject,"Meeting");
  assert.ok(normalizedMail.from.includes("tim@example.com"));

  const fakeToken={getToken:async()=>({ok:true,accessToken:"token"}),clear:()=>{}};
  const gmail=Gmail.createGmailAdapter({
    tokenProvider:fakeToken,
    fetchFn:async(url)=>url.includes("/messages?")?
      {ok:true,status:200,json:async()=>({messages:[{id:"m1"}]})}:
      {ok:true,status:200,json:async()=>({id:"m1",threadId:"t1",snippet:"Need reply",payload:{headers:[{name:"Subject",value:"Request"}]}})}
  });
  const recent=await gmail.listRecent({maxResults:1});
  assert.equal(recent.ok,true);
  assert.equal(recent.live,true);
  assert.equal(recent.messages[0].subject,"Request");

  const emailRaw=Message.buildEmail({to:"tim@example.com",subject:"Hello\r\nBcc: bad@example.com",body:"Test"});
  assert.ok(!emailRaw.includes("\r\nBcc:"));
  assert.throws(()=>Message.buildEmail({subject:"No recipient"}));
  assert.equal(Message.buildSms({to:"+123",body:" hello "}).body,"hello");

  const maps=Maps.createGoogleRoutesAdapter({
    apiKey:"key",
    fetchFn:async()=>({ok:true,status:200,json:async()=>({routes:[{duration:"5400s",staticDuration:"3600s",distanceMeters:25000}]})})
  });
  const route=await maps.travelTime({origin:"Home",destination:"Office",departureTime:new Date("2026-09-27T07:00:00Z")});
  assert.equal(route.ok,true);
  assert.equal(route.durationMinutes,90);
  assert.equal(route.trafficDelayMinutes,30);

  const weather=Weather.createOpenMeteoAdapter({
    fetchFn:async()=>({ok:true,status:200,json:async()=>({current:{temperature_2m:29,precipitation:1.2,rain:1,weather_code:61,wind_speed_10m:10}})})
  });
  const wx=await weather.current({latitude:14.5,longitude:121.0});
  assert.equal(wx.live,true);
  assert.equal(wx.condition,"rain");

  let nowN=1000;
  const notifications=createNotificationCenter({now:()=>nowN,dedupeMs:60000});
  const n={type:"departure",title:"Leave now",body:"Go",priority:85};
  assert.equal(notifications.shouldDeliver(n),true);
  notifications.record(n,"push");
  assert.equal(notifications.shouldDeliver(n),false);
  nowN+=60001;
  assert.equal(notifications.shouldDeliver(n),true);

  const fakeCalendar={
    listUpcoming:async()=>({ok:true,live:true,events:[{
      id:"e1",title:"Meeting",time:"09:00",start:"2026-09-27T09:00:00Z",destination:"Office",source:"test-calendar"
    }]})
  };
  const proposedActions=[];
  const departure=createDepartureService({
    calendar:fakeCalendar,
    maps:{travelTime:async()=>({ok:true,live:true,durationMinutes:90,trafficDelayMinutes:30})},
    weather:{current:async()=>({ok:true,live:true,rainMm:1,precipitationMm:1})},
    proposeAction:async a=>{proposedActions.push(a);return {status:"executed"}},
    getContext:()=>({routine:{prep:45,commute:60,buffer:15},learned:{}}),
    now:()=>new Date("2026-09-27T07:30:00Z")
  });
  const departureResult=await departure.scan({origin:"Home",coordinates:{latitude:14.5,longitude:121}});
  assert.equal(departureResult.ok,true);
  assert.equal(departureResult.results.length,1);
  assert.equal(departureResult.results[0].journey.status,"prepare-now");
  assert.equal(proposedActions.length,1);
  assert.ok(proposedActions[0].summary.includes("Rain"));

  console.log("Nikky core tests passed");
})().catch(err=>{console.error(err);process.exit(1)});