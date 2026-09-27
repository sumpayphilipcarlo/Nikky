const assert=require("assert");
const {createAuditLedger}=require("../core/audit-ledger.js");
const {createPolicyStore}=require("../core/policy.js");
const {createProviderHealth}=require("../core/provider-health.js");
const {createPermissionEnforcer}=require("../core/permissions.js");
const {createJsonStore}=require("../server/persistence.js");
const fs=require("fs"),os=require("os"),path=require("path");

const {createDataControls}=require("../core/data-controls.js");
const ProductMetrics=require("../core/product-metrics.js");

const {createTaskManager}=require("../core/tasks.js");
const Brief=require("../core/brief.js");
const Explain=require("../core/explain.js");
const {createCorrectionEngine}=require("../core/corrections.js");
const {createOnboarding}=require("../core/onboarding.js");
const Demo=require("../demo/scenarios.js");

const {createMemoryRepository}=require("../storage/memory.js");
const {createPostgresRepository}=require("../storage/postgres.js");
const {createWorker}=require("../server/worker.js");
const Push=require("../providers/push.js");

const Platform=require("../core/platform.js");
const {createPresenceModel}=require("../core/presence.js");
const {createEscalation}=require("../core/escalation.js");
const Voice=require("../core/voice.js");

const Files=require("../core/files.js");
const Extractors=require("../core/extractors.js");
const Documents=require("../core/document-intelligence.js");
const {createDocumentWorkflow}=require("../core/document-workflow.js");

const SkillSDK=require("../core/skill-sdk.js");
const Twilio=require("../providers/twilio.js");
const Spotify=require("../providers/spotify.js");
const Drive=require("../providers/google-drive.js");
const Slack=require("../providers/slack.js");
const M365=require("../providers/microsoft365.js");
const Notion=require("../providers/notion.js");
const HomeAssistant=require("../providers/home-assistant.js");
const WhatsApp=require("../providers/whatsapp.js");

const Policy=require("../core/policy.js");
const Approval=require("../core/approval.js");
const {createSkillSandbox}=require("../core/sandbox.js");
const {createProviderHealth}=require("../core/provider-health.js");
const {createAuditChain}=require("../core/audit-chain.js");
const Secrets=require("../core/secrets.js");

const {createContextGraph}=require("../core/context-graph.js");
const Prediction=require("../core/prediction.js");
const {createFeedbackModel}=require("../core/feedback.js");
const {createPreferenceModel}=require("../core/preferences.js");
const LifeEvents=require("../core/life-events.js");
const {buildTravelPlan}=require("../core/travel.js");

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
    now:()=>new Date("2026-09-27T06:45:00Z")
  });
  const departureResult=await departure.scan({origin:"Home",coordinates:{latitude:14.5,longitude:121}});
  assert.equal(departureResult.ok,true);
  assert.equal(departureResult.results.length,1);
  assert.equal(departureResult.results[0].journey.status,"prepare-now");
  assert.equal(proposedActions.length,1);
  assert.ok(proposedActions[0].summary.includes("Rain"));

  const graph2=createContextGraph();
  graph2.upsert("person","tim",{name:"Tim"});
  graph2.upsert("event","meeting",{title:"Meeting"});
  graph2.link("person","tim","attends","event","meeting");
  assert.equal(graph2.neighbors("person","tim","attends")[0].node.title,"Meeting");

  const pred=Prediction.makePrediction({
    type:"departure",
    evidence:[{confidence:.9,weight:2},{confidence:.8,weight:1}],
    threshold:.7,
    impact:"low"
  });
  assert.equal(pred.status,"candidate");
  assert.ok(pred.confidence>.8);

  const feedback=createFeedbackModel();
  feedback.record("departure","accepted");
  feedback.record("departure","accepted");
  feedback.record("departure","accepted");
  assert.ok(feedback.trust("departure")>.5);

  const prefs=createPreferenceModel({quietHours:{start:"22:00",end:"07:00"}});
  const quietPolicy=prefs.interruptionPolicy({priority:70,now:new Date("2026-09-27T23:00:00")});
  assert.equal(quietPolicy.mode,"silent");
  const urgentPolicy=prefs.interruptionPolicy({priority:99,now:new Date("2026-09-27T23:00:00")});
  assert.equal(urgentPolicy.mode,"wake");

  const life=LifeEvents.preparation({id:"ann",type:"Anniversary",date:"2026-10-04"},new Date("2026-09-27T08:00:00"));
  assert.equal(life.daysUntil,7);
  assert.equal(life.stage,"finalize");

  const travel=buildTravelPlan({
    trip:{id:"trip1",start:"2026-09-28T08:00:00Z"},
    weather:{rainMm:2},
    route:{trafficDelayMinutes:25},
    now:new Date("2026-09-27T08:00:00Z")
  });
  assert.ok(travel.tasks.some(t=>t.stage==="departure"));
  assert.ok(travel.tasks.some(t=>t.stage==="weather"));
  assert.ok(travel.tasks.some(t=>t.stage==="traffic"));

  const policy=Policy.createPolicyEngine();
  policy.add({id:"trusted-spouse",actionType:"sms.send",recipient:"+123",effect:Policy.EFFECTS.ALLOW,priority:100});
  policy.add({id:"default-sms",actionType:"sms.send",effect:Policy.EFFECTS.APPROVAL,priority:10});
  assert.equal(policy.evaluate({type:"sms.send",payload:{recipient:"+123"}}).effect,Policy.EFFECTS.ALLOW);
  assert.equal(policy.evaluate({type:"sms.send",payload:{recipient:"+999"}}).effect,Policy.EFFECTS.APPROVAL);

  let apNow=1000;
  const approvals2=Approval.createApprovalStore({now:()=>apNow,ttlMs:100});
  const ap=approvals2.create({type:"email.send",payload:{recipient:"tim@example.com",token:"secret"},provenance:{source:"test"}});
  assert.equal(ap.preview.payload.token,"[REDACTED]");
  apNow=1200;
  assert.equal(approvals2.get(ap.id).status,"expired");
  assert.equal(approvals2.decide(ap.id,"approved").ok,false);

  const registry2=createSkillRegistry([{id:"gmail",name:"Gmail",permissions:["gmail.read"]}]);
  const sandbox=createSkillSandbox({registry:registry2});
  assert.equal(await sandbox.invoke("gmail","gmail.read",async()=>42),42);
  assert.throws(()=>sandbox.assert("gmail","gmail.send"));

  let healthNow=0;
  const health=createProviderHealth({failureThreshold:2,cooldownMs:100,now:()=>healthNow});
  health.failure("gmail",new Error("x"));
  health.failure("gmail",new Error("x"));
  assert.equal(health.canCall("gmail"),false);
  healthNow=101;
  assert.equal(health.canCall("gmail"),true);
  health.success("gmail");
  assert.equal(health.state("gmail").status,"healthy");

  const chain=createAuditChain({key:"test-key"});
  chain.append({action:"email.send",decision:"approval"});
  chain.append({action:"email.send",decision:"approved"});
  assert.equal(chain.verify().ok,true);
  chain.entries[0].event.decision="tampered";
  assert.equal(chain.verify().ok,false);

  const secrets=Secrets.createMemorySecretStore();
  await secrets.set("GOOGLE_API_KEY","abc");
  assert.equal(await secrets.get("GOOGLE_API_KEY"),"abc");
  assert.deepEqual(secrets.listNames(),["GOOGLE_API_KEY"]);

  const sdkRegistry=createSkillRegistry([{id:"echo",name:"Echo",permissions:["echo.run"]}]);
  const sdkSandbox=createSkillSandbox({registry:sdkRegistry});
  const skill=SkillSDK.defineSkill({id:"echo",name:"Echo",permissions:["echo.run"]},{run:{permission:"echo.run",handler:async x=>({ok:true,value:x})}});
  const host=SkillSDK.createSkillHost({sandbox:sdkSandbox});
  host.install(skill);
  assert.equal((await host.invoke("echo","run",42)).value,42);

  const twilio=Twilio.createTwilioAdapter({accountSid:"sid",authToken:"token",fromNumber:"+100",fetchFn:async()=>({ok:true,status:201,json:async()=>({sid:"SM1"})})});
  assert.equal((await twilio.sendSms({to:"+200",body:"Hi"})).live,true);
  assert.equal((await Twilio.createTwilioAdapter({}).sendSms({to:"+1",body:"x"})).ok,false);

  const oauth={getToken:async()=>({ok:true,accessToken:"tok"})};
  const spotify=Spotify.createSpotifyAdapter({tokenProvider:oauth,fetchFn:async()=>({ok:true,status:200,json:async()=>({tracks:{items:[]}})})});
  assert.equal((await spotify.search({query:"Coldplay"})).live,true);

  const drive=Drive.createGoogleDriveAdapter({tokenProvider:oauth,fetchFn:async()=>({ok:true,status:200,json:async()=>({files:[{id:"f1",name:"Doc"}]})})});
  assert.equal((await drive.listFiles()).files[0].name,"Doc");

  const slack=Slack.createSlackAdapter({botToken:"x",fetchFn:async()=>({ok:true,status:200,json:async()=>({ok:true,ts:"1"})})});
  assert.equal((await slack.postMessage({channel:"C1",text:"Hi"})).live,true);

  const m365=M365.createMicrosoft365Adapter({tokenProvider:oauth,fetchFn:async()=>({ok:true,status:200,json:async()=>({value:[]})})});
  assert.equal((await m365.messages()).live,true);

  const notion=Notion.createNotionAdapter({token:"n",fetchFn:async()=>({ok:true,status:200,json:async()=>({results:[]})})});
  assert.equal((await notion.search({query:"Nikky"})).live,true);

  const ha=HomeAssistant.createHomeAssistantAdapter({baseUrl:"http://ha.local",token:"h",fetchFn:async()=>({ok:true,status:200,json:async()=>[]})});
  assert.equal((await ha.states()).live,true);

  const wa=WhatsApp.createWhatsAppAdapter({accessToken:"w",phoneNumberId:"p",fetchFn:async()=>({ok:true,status:200,json:async()=>({messages:[{id:"1"}]})})});
  assert.equal((await wa.sendText({to:"1555",text:"Hello"})).live,true);

  const fileCtx=Files.createFileContext();
  const txt=fileCtx.ingest({id:"file1",name:"notes.txt",mime:"text/plain",text:"This is a long meeting note about Nikky and a follow-up action."});
  assert.equal(txt.kind,"text");
  fileCtx.select("file1");
  const intel=Documents.createDocumentIntelligence();
  const localAnalysis=await intel.analyze(fileCtx.current());
  assert.equal(localAnalysis.ok,true);
  assert.equal(localAnalysis.source,"local-fallback");
  assert.ok(localAnalysis.result.summary.includes("Nikky"));

  const eml=Extractors.parseEml("Subject: Hello\r\nFrom: Tim <tim@example.com>\r\nTo: Me <me@example.com>\r\n\r\nPlease send the report.");
  assert.equal(eml.subject,"Hello");
  assert.ok(eml.body.includes("report"));

  const cfg=Extractors.parseConfig("API_TOKEN=supersecret\nregion=ph");
  assert.equal(cfg.API_TOKEN,"[REDACTED]");
  assert.equal(cfg.region,"ph");

  const binary=fileCtx.ingest({id:"file2",name:"diagram.png",mime:"image/png",size:100,bytes:Buffer.from([1,2,3])});
  const binaryResult=await intel.analyze(binary);
  assert.equal(binaryResult.ok,false);
  assert.equal(binaryResult.requiresExtractor,true);

  fileCtx.select("file1");
  const docProposals=[];
  const docFlow=createDocumentWorkflow({
    files:fileCtx,
    intelligence:intel,
    resolveRecipient:async q=>q==="Tim"?"tim@example.com":null,
    proposeAction:async a=>{docProposals.push(a);return {status:"approval_required"}}
  });
  const docResult=await docFlow.summarizeAndPrepareEmail({recipientQuery:"Tim"});
  assert.equal(docResult.ok,true);
  assert.equal(docResult.recipient,"tim@example.com");
  assert.equal(docResult.action.type,"email.send");
  assert.equal(docResult.proposal.status,"approval_required");
  assert.equal(docProposals.length,1);

  const best=Platform.bestDevice([
    {id:"web",platform:"web",presence:2},
    {id:"phone",platform:"android",presence:10}
  ],["background-jobs"]);
  assert.equal(best.id,"phone");

  let presenceNow=100000;
  const presence=createPresenceModel({now:()=>presenceNow,activeWindowMs:1000});
  presence.update("phone",{active:true,lastInputAt:presenceNow});
  assert.equal(presence.score("phone"),10);
  presenceNow+=4000;
  assert.equal(presence.inactiveEverywhere(),true);

  const esc=createEscalation();
  const escPlan=esc.plan({priority:99,minutesUntilDeadline:8,userInactive:true,quietHours:true});
  assert.ok(escPlan.some(x=>x.level==="wake"));
  assert.equal(esc.next(escPlan,[{level:escPlan[0].level}]).level,escPlan[1].level);

  const voice=Voice.createVoiceSession({
    speakerVerifier:async()=>({verified:true,confidence:.95}),
    transcriber:async()=>({text:"Hey Nikky"}),
    synthesizer:async text=>({ok:true,text})
  });
  assert.equal((await voice.verify(Buffer.from("sample"))).verified,true);
  assert.equal((await voice.transcribe(Buffer.from("audio"))).text,"Hey Nikky");
  assert.equal((await voice.speak("Hello")).ok,true);
  assert.equal(voice.turns.length,2);

  const wake=Voice.createWakeWordController();
  assert.equal((await wake.start()).ok,false);
  assert.equal(wake.isListening(),false);

  const repoMem=createMemoryRepository();
  await repoMem.upsertUser({id:"u1",email:"u@example.com"});
  await repoMem.saveWorkflow("u1",{id:"wf1",type:"test",state:"planned"});
  assert.equal((await repoMem.listWorkflows("u1")).length,1);
  repoMem.putJob({id:"j1",type:"scan",enabled:true,nextRunAt:new Date("2026-09-27T08:00:00Z"),interval_ms:60000});
  const worker=createWorker({
    repository:repoMem,
    handlers:{scan:async()=>({scanned:true})},
    now:()=>new Date("2026-09-27T08:00:00Z")
  });
  const wr=await worker.runOnce();
  assert.equal(wr[0].ok,true);
  assert.equal(repoMem.jobs.get("j1").lastStatus,"success");

  const queries=[];
  const fakePool={query:async(sql,params)=>{queries.push({sql,params});return {rows:[{id:"u2"}]}}};
  const pg=createPostgresRepository(fakePool);
  assert.equal((await pg.upsertUser({id:"u2",email:"x@example.com"})).id,"u2");
  assert.ok(queries[0].sql.includes("INSERT INTO users"));

  const fcm=Push.createFcmAdapter({
    projectId:"project",
    tokenProvider:{getToken:async()=>({ok:true,accessToken:"oauth"})},
    fetchFn:async()=>({ok:true,status:200,json:async()=>({name:"projects/project/messages/1"})})
  });
  assert.equal((await fcm.send({deviceToken:"dev",title:"Nikky",body:"Leave now"})).live,true);
  assert.equal((await Push.createFcmAdapter({}).send({deviceToken:"x"})).ok,false);

  const taskMgr=createTaskManager();
  taskMgr.fromCommitment({id:"c1",task:"Send report",status:"open",dueAt:"2026-09-27T08:00:00Z"});
  assert.equal(taskMgr.open()[0].source,"commitment");
  assert.equal(taskMgr.due(new Date("2026-09-27T09:00:00Z")).length,1);

  const mb=Brief.morningBrief({
    events:[{title:"Meeting",start:"2026-09-27T09:00:00Z"}],
    tasks:taskMgr.list(),
    weather:{condition:"rain"},
    predictions:[{status:"candidate",confidence:.9,title:"Leave soon"}]
  });
  assert.equal(mb.type,"morning");
  assert.ok(mb.headline.includes("Meeting"));
  const eb=Brief.eveningBrief({completedTasks:[],openTasks:taskMgr.open(),commitments:[{status:"open",task:"Send report"}],tomorrowEvents:[]});
  assert.equal(eb.unresolved.length,1);

  const explanation=Explain.explain({
    prediction:{title:"Leave soon",confidence:.91,evidence:[{label:"calendar"},{label:"traffic"}]},
    action:{title:"Departure alert",summary:"Leave now",provenance:{source:"departure-service"}},
    authorityDecision:{level:"auto"},
    workflow:{state:"completed"}
  });
  assert.ok(explanation.why.some(x=>x.includes("91")));
  assert.equal(explanation.source,"departure-service");

  const fb2=createFeedbackModel(),mem2=Memory.createMemoryStore();
  const corrections=createCorrectionEngine({feedbackModel:fb2,memory:mem2});
  corrections.correct({predictionKey:"departure",field:"leaveAt",from:"07:30",to:"07:15"});
  assert.equal(corrections.list().length,1);
  assert.ok(fb2.trust("departure")>0);

  const onboarding=createOnboarding();
  onboarding.complete("identity",{name:"User"});
  onboarding.complete("routine",{arrival:"09:00"});
  onboarding.complete("authority",{mode:"balanced"});
  onboarding.complete("privacy",{memory:true});
  assert.equal(onboarding.progress().requiredComplete,true);
  assert.equal(Demo.scenarios.length,6);

  const dataSource={
    exportUser:async id=>({id,items:[1,2]}),
    deleteUser:async id=>({ok:true,id})
  };
  const controls=createDataControls({sources:{memory:dataSource}});
  assert.equal((await controls.exportAll("u1")).data.memory.items.length,2);
  assert.equal((await controls.deleteAll("u1")).results.memory.ok,true);

  const pm=ProductMetrics.calculate({counters:{
    "suggestions.total:{}":10,
    "suggestions.accepted:{}":7,
    "suggestions.rejected:{}":2,
    "suggestions.ignored:{}":1,
    "actions.completed:{}":9,
    "actions.failed:{}":1
  }});
  assert.equal(pm.suggestionAcceptanceRate,.7);
  assert.equal(pm.actionReliability,.9);

  const ledger=createAuditLedger();
  ledger.append({actor:"nikky",actionType:"email.send",decision:"approval",metadata:{recipient:"a@example.com",nested:{x:1}}});
  assert.equal(ledger.verify().ok,true);
  ledger.entries[0].metadata.nested.x=2;
  assert.equal(ledger.verify().ok,false);

  const scoped=createPolicyStore();
  scoped.upsert({id:"spouse-delay",actionType:"sms.send",effect:"auto",priority:10,conditions:{recipient:"+15550001"}});
  assert.equal(scoped.evaluate({type:"sms.send",payload:{recipient:"+15550001"}},{}).effect,"auto");
  assert.equal(scoped.evaluate({type:"sms.send",payload:{recipient:"+15550002"}},{}).matched,false);

  const health=createProviderHealth({now:()=>1000});
  assert.equal(health.report("gmail",{ok:true,latencyMs:100}).status,"healthy");
  assert.equal(health.report("gmail",{ok:false,error:"timeout"}).status,"degraded");
  health.report("gmail",{ok:false,error:"timeout"});
  assert.equal(health.report("gmail",{ok:false,error:"timeout"}).status,"down");

  const registry=createSkillRegistry([{id:"gmail",name:"Gmail",permissions:["email.read"]}]);
  const enforcer=createPermissionEnforcer({registry});
  assert.equal(enforcer.requirePermission("gmail","email.read").ok,true);
  assert.equal(enforcer.requirePermission("gmail","email.send").ok,false);

  const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),"nikky-store-"));
  const storePath=path.join(tempDir,"state.json");
  const store=createJsonStore({filePath:storePath});
  store.put("workflows","w1",{id:"w1",state:"planned"});
  const reloaded=createJsonStore({filePath:storePath});
  assert.equal(reloaded.get("workflows","w1").state,"planned");
  const tampered=JSON.parse(fs.readFileSync(storePath,"utf8"));tampered.payload.data.workflows.w1.state="tampered";fs.writeFileSync(storePath,JSON.stringify(tampered));
  assert.throws(()=>createJsonStore({filePath:storePath}),/checksum mismatch/);
  fs.rmSync(tempDir,{recursive:true,force:true});

  console.log("Nikky core tests passed");
})().catch(err=>{console.error(err);process.exit(1)});