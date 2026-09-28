const Authority=require("../authority.js");
global.NikkyAuthority=Authority;
const Orchestrator=require("../orchestrator.js");
const {createMemoryStore}=require("../core/memory.js");
const {createIdentityService}=require("../core/identity.js");
const {createScheduler}=require("../core/scheduler.js");
const {createMetrics,recordAction}=require("../core/observability.js");
const Risk=require("../core/risk.js");
const Workflow=require("../core/workflow-engine.js");
const {createAuditLedger}=require("../core/audit-ledger.js");
const {createProviderHealth}=require("../core/provider-health.js");
const {createPolicyEngine,EFFECTS}=require("../core/policy.js");
const {createIdempotencyStore}=require("../core/idempotency.js");
const {createGmailAdapter}=require("../providers/gmail.js");
const {createTwilioAdapter}=require("../providers/twilio.js");
const {createGoogleCalendarApiAdapter}=require("../providers/google-calendar-api.js");
const {createFcmAdapter}=require("../providers/push.js");
const {createSlackAdapter}=require("../providers/slack.js");
const {createMicrosoft365Adapter}=require("../providers/microsoft365.js");
const {createWhatsAppAdapter}=require("../providers/whatsapp.js");
const {createHomeAssistantAdapter}=require("../providers/home-assistant.js");
const {createSpotifyAdapter}=require("../providers/spotify.js");
const {createFabric}=require("../core/fabric.js");
const {createMissionPlanner}=require("../core/mission-planner.js");
const {createCapabilityPermissions}=require("../core/app-permissions.js");
const {createTransactionSafety}=require("../core/transaction-safety.js");
const {createSensorFusion}=require("../core/sensor-fusion.js");
const {createGuardian}=require("../core/guardian.js");
const {createEmergencyPolicyStore}=require("../core/emergency-policy.js");

function payload(action){return action?.payload&&typeof action.payload==="object"?action.payload:{}}
function field(action,name,...aliases){
 const p=payload(action);
 for(const key of [name,...aliases])if(action?.[key]!==undefined)return action[key];else if(p[key]!==undefined)return p[key];
 return undefined;
}
function createActionExecutor({gmail,twilio,calendar,push,slack,microsoft365,whatsapp,homeAssistant,spotify,providerHealth}={}){
 const handlers={
  "email.send":async action=>gmail?.send?gmail.send({raw:field(action,"raw"),interactive:action.interactive!==false}):({ok:false,live:false,reason:"Gmail provider is not configured"}),
  "sms.send":async action=>twilio?.sendSms?twilio.sendSms({to:field(action,"to","recipient"),body:field(action,"body","message")}):({ok:false,live:false,reason:"Twilio provider is not configured"}),
  "call.place":async action=>twilio?.placeCall?twilio.placeCall({to:field(action,"to","recipient"),twiml:field(action,"twiml")}):({ok:false,live:false,reason:"Twilio provider is not configured"}),
  "calendar.create":async action=>calendar?.createEvent?calendar.createEvent({event:field(action,"event")}):({ok:false,live:false,reason:"Calendar provider is not configured"}),
  "calendar.update":async action=>calendar?.updateEvent?calendar.updateEvent({eventId:field(action,"eventId"),event:field(action,"event")}):({ok:false,live:false,reason:"Calendar provider is not configured"}),
  "calendar.delete":async action=>calendar?.deleteEvent?calendar.deleteEvent({eventId:field(action,"eventId")}):({ok:false,live:false,reason:"Calendar provider is not configured"}),
  "push.send":async action=>push?.send?push.send({deviceToken:field(action,"deviceToken"),title:field(action,"title"),body:field(action,"body","message"),data:field(action,"data")||{}}):({ok:false,live:false,reason:"Push provider is not configured"}),
  "slack.send":async action=>slack?.postMessage?slack.postMessage({channel:field(action,"channel"),text:field(action,"text","message"),threadTs:field(action,"threadTs")}):({ok:false,live:false,reason:"Slack provider is not configured"}),
  "microsoft.email.send":async action=>microsoft365?.sendMail?microsoft365.sendMail({subject:field(action,"subject"),body:field(action,"body","message"),to:field(action,"to","recipient")}):({ok:false,live:false,reason:"Microsoft 365 provider is not configured"}),
  "whatsapp.send":async action=>whatsapp?.sendText?whatsapp.sendText({to:field(action,"to","recipient"),text:field(action,"text","message")}):({ok:false,live:false,reason:"WhatsApp provider is not configured"}),
  "home.service":async action=>homeAssistant?.service?homeAssistant.service({domain:field(action,"domain"),service:field(action,"service"),data:field(action,"data")||{}}):({ok:false,live:false,reason:"Home Assistant provider is not configured"}),
  "spotify.play":async action=>spotify?.play?spotify.play({deviceId:field(action,"deviceId"),uris:field(action,"uris"),contextUri:field(action,"contextUri")}):({ok:false,live:false,reason:"Spotify provider is not configured"})
 };
 return async function execute(action){
  const handler=handlers[action?.type];
  if(!handler)return {ok:false,live:false,reason:"No backend provider executor configured for "+(action?.type||"unknown")};
  const providerId={
   "email.send":"gmail","sms.send":"twilio","call.place":"twilio",
   "calendar.create":"google-calendar","calendar.update":"google-calendar","calendar.delete":"google-calendar",
   "push.send":"fcm","slack.send":"slack","microsoft.email.send":"microsoft365",
   "whatsapp.send":"whatsapp","home.service":"home-assistant","spotify.play":"spotify"
  }[action.type]||action.type;
  if(providerHealth&&!providerHealth.canCall(providerId))return {ok:false,live:false,reason:"Provider circuit is open for "+providerId};
  const started=Date.now();
  try{
   const result=await handler(action);
   if(providerHealth){
    if(result?.ok===true&&result?.live===true)providerHealth.success(providerId);
    else providerHealth.failure(providerId,new Error(result?.reason||"provider execution failed"));
   }
   if(!result||result.ok!==true)return {ok:false,live:false,reason:result?.reason||"Provider did not confirm execution",providerResult:result||null};
   if(result.live!==true)return {ok:false,live:false,reason:"Provider did not confirm live execution",providerResult:result};
   return result;
  }catch(error){
   providerHealth?.failure?.(providerId,error);
   return {ok:false,live:false,reason:"Provider execution error: "+(error?.message||String(error)),latencyMs:Date.now()-started};
  }
 };
}

function createRuntime({now=()=>Date.now(),env=process.env,providers={},workflowRepository=null,userId="local-user"}={}){
 const memory=createMemoryStore({now:()=>new Date(now())});
 const identity=createIdentityService({now});
 const scheduler=createScheduler({now});
 const metrics=createMetrics();
 const auditLedger=createAuditLedger();
 const providerHealth=createProviderHealth({now});
 const policyStore=createPolicyEngine();
 const idempotency=createIdempotencyStore({now});
 const fabric=createFabric({now:()=>new Date(now())});
 const capabilityPermissions=createCapabilityPermissions();
 const missionPlanner=createMissionPlanner({fabric,now:()=>new Date(now())});
 const transactionSafety=createTransactionSafety({now});
 const sensorFusion=createSensorFusion({now});
 const emergencyPolicies=createEmergencyPolicyStore();
 const approvals=[],audit=[];
 const credentialVault=providers.credentialVault||null;
 const gmail=providers.gmail||createGmailAdapter({tokenProvider:providers.gmailTokenProvider,fetchFn:providers.fetchFn});
 const twilio=providers.twilio||createTwilioAdapter({accountSid:env.TWILIO_ACCOUNT_SID,authToken:env.TWILIO_AUTH_TOKEN,fromNumber:env.TWILIO_FROM_NUMBER,fetchFn:providers.fetchFn});
 const calendar=providers.calendar||createGoogleCalendarApiAdapter({tokenProvider:providers.googleTokenProvider,fetchFn:providers.fetchFn,calendarId:providers.calendarId||"primary"});
 const push=providers.push||createFcmAdapter({projectId:env.FCM_PROJECT_ID,tokenProvider:providers.fcmTokenProvider,fetchFn:providers.fetchFn});
 const slack=providers.slack||createSlackAdapter({botToken:env.SLACK_BOT_TOKEN,fetchFn:providers.fetchFn});
 const microsoft365=providers.microsoft365||createMicrosoft365Adapter({tokenProvider:providers.microsoftTokenProvider,fetchFn:providers.fetchFn});
 const whatsapp=providers.whatsapp||createWhatsAppAdapter({accessToken:env.WHATSAPP_ACCESS_TOKEN,phoneNumberId:env.WHATSAPP_PHONE_NUMBER_ID,fetchFn:providers.fetchFn});
 const homeAssistant=providers.homeAssistant||createHomeAssistantAdapter({baseUrl:env.HOME_ASSISTANT_URL,token:env.HOME_ASSISTANT_TOKEN,fetchFn:providers.fetchFn});
 const spotify=providers.spotify||createSpotifyAdapter({tokenProvider:providers.spotifyTokenProvider,fetchFn:providers.fetchFn});
 const providerExecutor=createActionExecutor({gmail,twilio,calendar,push,slack,microsoft365,whatsapp,homeAssistant,spotify,providerHealth});
 const executor=async action=>{
  const key=action?.idempotencyKey||action?.meta?.idempotencyKey;
  if(!key)return {ok:false,live:false,reason:"idempotency key is required for external action execution"};
  const run=await idempotency.run(key,()=>providerExecutor(action));
  if(run.pending)return {ok:false,live:false,reason:"action with this idempotency key is already executing"};
  return {...run.result,deduplicated:run.deduplicated};
 };
 const orchestrator=Orchestrator.create({approvalQueue:approvals,auditLog:audit,executor});
 const workflows=new Map();
 async function persistWorkflow(wf){if(workflowRepository?.saveWorkflow)await workflowRepository.saveWorkflow(userId,wf);return wf;}

 async function propose(action){
  const risk=Risk.classify(action);
  const wf=Workflow.createWorkflow({type:action.type,context:{action,risk}});
  Workflow.transition(wf,Workflow.STATES.PLANNED,"action structured");
  workflows.set(wf.id,wf);
  await persistWorkflow(wf);
  const scoped=policyStore.evaluate(action,{
    provider:action?.provenance?.provider||action?.provenance?.source||null,
    deviceId:action?.meta?.deviceId||null,
    now:new Date(now()).toISOString(),
    riskScore:risk?.score||0
  });
  const hasScopedRule=!!scoped.ruleId;
  const authorityLevel=scoped.effect===EFFECTS.ALLOW?Authority.LEVELS.AUTO:
    scoped.effect===EFFECTS.DENY?Authority.LEVELS.DENY:
    scoped.effect===EFFECTS.APPROVAL?Authority.LEVELS.APPROVAL:null;
  const result=await orchestrator.propose(action,hasScopedRule&&authorityLevel?{
    authorityLevel,
    reason:"Scoped authority policy "+scoped.ruleId
  }:{});
  auditLedger.append({actor:"nikky-core",actionType:action.type,decision:result.verdict?.level||result.status,payloadHash:null,metadata:{workflowId:wf.id,policyId:scoped.ruleId||null}});
  if(result.status==="approval_required") Workflow.transition(wf,Workflow.STATES.AWAITING_APPROVAL,"user approval required");
  else if(result.status==="denied") Workflow.transition(wf,Workflow.STATES.CANCELLED,"authority denied action");
  else if(result.status==="executed") {Workflow.transition(wf,Workflow.STATES.EXECUTING,"authority allowed");Workflow.transition(wf,Workflow.STATES.COMPLETED,"executor completed");}
  else if(result.status==="execution_failed") {Workflow.transition(wf,Workflow.STATES.EXECUTING,"authority allowed");Workflow.transition(wf,Workflow.STATES.FAILED,"executor failed");}
  await persistWorkflow(wf);
  recordAction(metrics,{decision:result.verdict?.level,status:result.status});
  return {workflow:wf,result,risk};
 }
 async function approve(id){
  const item=approvals.find(a=>a.id===id);
  const result=await orchestrator.approve(id);
  const wf=item?[...workflows.values()].find(w=>w.context?.action===item.action||w.context?.action?.type===item.action?.type&&w.state===Workflow.STATES.AWAITING_APPROVAL):null;
  if(wf){
   Workflow.transition(wf,Workflow.STATES.EXECUTING,"user approved");
   if(result.status==="executed")Workflow.transition(wf,Workflow.STATES.COMPLETED,"executor completed");
   else if(result.status==="execution_failed"||result.status==="approved_no_executor")Workflow.transition(wf,Workflow.STATES.FAILED,result.status);
  }
  if(wf)await persistWorkflow(wf);
  auditLedger.append({actor:"user",actionType:item?.action?.type||"unknown",decision:"approved",metadata:{approvalId:id}});
  recordAction(metrics,{decision:"approved",status:result.status});
  return result;
 }
 async function reject(id){
  const item=approvals.find(a=>a.id===id);
  const result=orchestrator.reject(id);
  const wf=item?[...workflows.values()].find(w=>w.context?.action===item.action||w.context?.action?.type===item.action?.type&&w.state===Workflow.STATES.AWAITING_APPROVAL):null;
  if(wf){Workflow.transition(wf,Workflow.STATES.CANCELLED,"user rejected");await persistWorkflow(wf);}
  auditLedger.append({actor:"user",actionType:item?.action?.type||"unknown",decision:"rejected",metadata:{approvalId:id}});
  recordAction(metrics,{decision:"rejected",status:result.status});
  return result;
 }
 const guardian=createGuardian({
  sensorFusion,now,
  notify:async incident=>propose({type:"proactive.notify",title:"Guardian alert",summary:"Potential "+incident.type+" incident detected",payload:{incidentId:incident.id,severity:incident.level},idempotencyKey:"guardian-notify-"+incident.id}),
  contactTrusted:async incident=>propose({type:"sms.send",payload:{recipient:incident.policy?.trustedContacts?.[0],body:"Nikky Guardian detected a potential "+incident.type+" emergency. Incident "+incident.id},idempotencyKey:"guardian-contact-"+incident.id}),
  requestProfessionalHelp:providers.requestProfessionalHelp||null
 });

 async function restoreWorkflows({state,limit=200}={}){
  if(!workflowRepository?.listWorkflows)return [];
  const rows=await workflowRepository.listWorkflows(userId,{state,limit});
  for(const row of rows){const wf={id:row.id,type:row.type,state:row.state,context:row.context||{},steps:row.steps||[],history:row.history||[],attempt:row.attempt||0,createdAt:row.created_at||row.createdAt,updatedAt:row.updated_at||row.updatedAt};workflows.set(wf.id,wf);}
  return [...workflows.values()];
 }
 return {memory,identity,scheduler,metrics,idempotency,approvals,audit,auditLedger,providerHealth,policyStore,credentialVault,fabric,capabilityPermissions,missionPlanner,transactionSafety,sensorFusion,emergencyPolicies,guardian,workflows,propose,approve,reject,restoreWorkflows,persistWorkflow};
}
module.exports={createRuntime,createActionExecutor};