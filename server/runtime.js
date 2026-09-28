const Authority=require("../authority.js");
global.NikkyAuthority=Authority;
const Orchestrator=require("../orchestrator.js");
const {createMemoryStore,seal,open}=require("../core/memory.js");
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
const {createAppController}=require("../core/app-controller.js");
const {createDiscoveryManager}=require("../core/discovery.js");
const {createGoalPlanner}=require("../core/goal-planner.js");
const {createMissionRunner}=require("../core/mission-runner.js");
const {createFabricPolicy}=require("../core/fabric-policy.js");

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
 const fabricPolicy=createFabricPolicy({permissions:capabilityPermissions,transactionSafety});
 const appController=createAppController({
   fabric,
   executors:providers.fabricExecutors||{},
   verify:providers.fabricVerify,
   authority:async(action)=>{
     const endpointId=action?.meta?.endpointId;
     if(!endpointId)return {allowed:true};
     const decision=fabricPolicy.evaluate({endpointId,capability:action.type,payload:payload(action)});
     return {allowed:decision.allowed,reason:decision.reason||null};
   }
 });
 const discovery=createDiscoveryManager({fabric,adapters:providers.discoveryAdapters||[]});
 const goalPlanner=createGoalPlanner({fabric});
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
  const executeOnce=()=>action?.meta?.useFabric===true
    ? appController.execute({capability:action.type,payload:payload(action),context:{ownerId:action?.meta?.ownerId},preferredEndpointIds:action?.meta?.endpointId?[action.meta.endpointId]:[]})
    : providerExecutor(action);
  const run=await idempotency.run(key,executeOnce);
  if(run.pending)return {ok:false,live:false,reason:"action with this idempotency key is already executing"};
  await persistRuntimeState?.("idempotency");
  return {...run.result,deduplicated:run.deduplicated};
 };
 const orchestrator=Orchestrator.create({approvalQueue:approvals,auditLog:audit,executor});
 const workflows=new Map();
 async function persistWorkflow(wf){if(workflowRepository?.saveWorkflow)await workflowRepository.saveWorkflow(userId,wf);return wf;}
 async function persistMemoryRecord(record){
  if(!workflowRepository?.saveMemory)return record;
  const encryptedValue=await seal(record.value,env.NIKKY_MEMORY_KEY||env.NIKKY_MEMORY_KEY_MATERIAL||"");
  await workflowRepository.saveMemory(userId,{id:record.id,type:record.type,encryptedValue,source:record.source,sensitivity:record.sensitivity,expiresAt:record.expiresAt});
  return record;
 }
 async function deleteMemoryRecord(id){
  const removed=memory.remove(id);
  if(workflowRepository?.deleteMemory)await workflowRepository.deleteMemory(userId,id);
  return removed;
 }
 async function restoreMemories(){
  if(!workflowRepository?.listMemories)return [];
  const rows=await workflowRepository.listMemories(userId,{limit:1000});
  const restored=[];
  for(const row of rows){
   try{
    const value=await open(row.encrypted_value,env.NIKKY_MEMORY_KEY||env.NIKKY_MEMORY_KEY_MATERIAL||"");
    const rec=memory.put({id:row.id,type:row.type,value,source:row.source||"stored",sensitivity:row.sensitivity||"normal",retentionDays:null});
    rec.createdAt=row.created_at||rec.createdAt;rec.updatedAt=row.updated_at||rec.updatedAt;rec.expiresAt=row.expires_at||null;
    restored.push(rec);
   }catch(error){auditLedger.append({actor:"nikky-core",actionType:"memory.restore",decision:"failed",metadata:{id:row.id,error:error.message}})}
  }
  return restored;
 }

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
  const fabricDecision=action?.meta?.useFabric===true&&action?.meta?.endpointId
    ? fabricPolicy.evaluate({endpointId:action.meta.endpointId,capability:action.type,payload:payload(action)})
    : null;
  let authorityLevel=null,authorityReason=null;
  if(fabricDecision){
    if(fabricDecision.allowed===false){authorityLevel=Authority.LEVELS.DENY;authorityReason=fabricDecision.reason||"Fabric capability policy denied action";}
    else if(fabricDecision.mode==="approval"){authorityLevel=Authority.LEVELS.APPROVAL;authorityReason="Fabric capability requires approval";}
  }
  if(!authorityLevel&&scoped.ruleId){
    authorityLevel=scoped.effect===EFFECTS.ALLOW?Authority.LEVELS.AUTO:
      scoped.effect===EFFECTS.DENY?Authority.LEVELS.DENY:
      scoped.effect===EFFECTS.APPROVAL?Authority.LEVELS.APPROVAL:null;
    if(authorityLevel)authorityReason="Scoped authority policy "+scoped.ruleId;
  }
  const result=await orchestrator.propose(action,authorityLevel?{authorityLevel,reason:authorityReason}:{});
  auditLedger.append({actor:"nikky-core",actionType:action.type,decision:result.verdict?.level||result.status,payloadHash:null,metadata:{workflowId:wf.id,policyId:scoped.ruleId||null,fabricMode:fabricDecision?.mode||null}});
  if(result.status==="approval_required") Workflow.transition(wf,Workflow.STATES.AWAITING_APPROVAL,"user approval required");
  else if(result.status==="denied") Workflow.transition(wf,Workflow.STATES.CANCELLED,"authority denied action");
  else if(result.status==="executed") {Workflow.transition(wf,Workflow.STATES.EXECUTING,"authority allowed");Workflow.transition(wf,Workflow.STATES.COMPLETED,"executor completed");}
  else if(result.status==="execution_failed") {Workflow.transition(wf,Workflow.STATES.EXECUTING,"authority allowed");Workflow.transition(wf,Workflow.STATES.FAILED,"executor failed");}
  await persistWorkflow(wf);
  await Promise.all([persistRuntimeState("approvals"),persistRuntimeState("audit_log"),persistRuntimeState("audit_ledger")]);
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
  if(result.status==="executed"&&item?.action?.meta?.missionId&&item?.action?.meta?.missionStepId){
   const missionId=item.action.meta.missionId,stepId=item.action.meta.missionStepId;
   try{
    missionPlanner.completeStep(missionId,stepId,result);
    const mission=missionPlanner.get(missionId);
    if(mission&&mission.state!=="completed"){
     missionPlanner.transition(missionId,"running",{waitingFor:null,approvalId:null});
     await missionRunner.run(missionId);
    }
   }catch(error){
    auditLedger.append({actor:"nikky-core",actionType:"mission.advance",decision:"failed",metadata:{missionId,stepId,error:error.message}});
   }
  }
  auditLedger.append({actor:"user",actionType:item?.action?.type||"unknown",decision:"approved",metadata:{approvalId:id}});
  await Promise.all([persistRuntimeState("missions"),persistRuntimeState("approvals"),persistRuntimeState("audit_log"),persistRuntimeState("audit_ledger")]);
  recordAction(metrics,{decision:"approved",status:result.status});
  return result;
 }
 async function reject(id){
  const item=approvals.find(a=>a.id===id);
  const result=orchestrator.reject(id);
  const wf=item?[...workflows.values()].find(w=>w.context?.action===item.action||w.context?.action?.type===item.action?.type&&w.state===Workflow.STATES.AWAITING_APPROVAL):null;
  if(wf){Workflow.transition(wf,Workflow.STATES.CANCELLED,"user rejected");await persistWorkflow(wf);}
  auditLedger.append({actor:"user",actionType:item?.action?.type||"unknown",decision:"rejected",metadata:{approvalId:id}});
  await Promise.all([persistRuntimeState("approvals"),persistRuntimeState("audit_log"),persistRuntimeState("audit_ledger")]);
  recordAction(metrics,{decision:"rejected",status:result.status});
  return result;
 }
 const missionRunner=createMissionRunner({planner:missionPlanner,proposeAction:propose});
 const guardian=createGuardian({
  sensorFusion,now,
  notify:async incident=>propose({type:"proactive.notify",title:"Guardian alert",summary:"Potential "+incident.type+" incident detected",payload:{incidentId:incident.id,severity:incident.level},idempotencyKey:"guardian-notify-"+incident.id}),
  contactTrusted:async incident=>propose({type:"sms.send",payload:{recipient:incident.policy?.trustedContacts?.[0],body:"Nikky Guardian detected a potential "+incident.type+" emergency. Incident "+incident.id},idempotencyKey:"guardian-contact-"+incident.id}),
  requestProfessionalHelp:providers.requestProfessionalHelp||null
 });

 const runtimeStateBuckets={
  approvals:()=>JSON.parse(JSON.stringify(approvals)),
  audit_log:()=>JSON.parse(JSON.stringify(audit)),
  audit_ledger:()=>auditLedger.exportAll(),
  idempotency:()=>idempotency.snapshot(),
  authority_policies:()=>policyStore.snapshot(),
  fabric:()=>fabric.snapshot(),
  capability_permissions:()=>capabilityPermissions.snapshot(),
  missions:()=>missionPlanner.snapshot(),
  transactions:()=>transactionSafety.snapshot(),
  sensors:()=>sensorFusion.snapshot(),
  emergency_policies:()=>emergencyPolicies.snapshot(),
  guardian_incidents:()=>guardian.snapshot()
 };
 async function persistRuntimeState(bucket){
  if(!workflowRepository?.saveRuntimeState)return false;
  if(bucket){
   const getter=runtimeStateBuckets[bucket];if(!getter)throw new Error("unknown runtime state bucket");
   await workflowRepository.saveRuntimeState(userId,bucket,getter());return true;
  }
  await Promise.all(Object.entries(runtimeStateBuckets).map(([name,getter])=>workflowRepository.saveRuntimeState(userId,name,getter())));
  return true;
 }
 async function restoreRuntimeState(){
  if(!workflowRepository?.loadRuntimeStates)return {};
  const names=Object.keys(runtimeStateBuckets);
  const states=await workflowRepository.loadRuntimeStates(userId,names);
  if(states.approvals){approvals.length=0;approvals.push(...JSON.parse(JSON.stringify(states.approvals)))}
  if(states.audit_log){audit.length=0;audit.push(...JSON.parse(JSON.stringify(states.audit_log)))}
  if(states.audit_ledger)auditLedger.restore(states.audit_ledger);
  if(states.idempotency)idempotency.restore(states.idempotency);
  if(states.authority_policies)policyStore.restore(states.authority_policies);
  if(states.fabric)fabric.restore(states.fabric);
  if(states.capability_permissions)capabilityPermissions.restore(states.capability_permissions);
  if(states.missions)missionPlanner.restore(states.missions);
  if(states.transactions)transactionSafety.restore(states.transactions);
  if(states.sensors)sensorFusion.restore(states.sensors);
  if(states.emergency_policies)emergencyPolicies.restore(states.emergency_policies);
  if(states.guardian_incidents)guardian.restore(states.guardian_incidents);
  return states;
 }

 async function restoreWorkflows({state,limit=200}={}){
  if(!workflowRepository?.listWorkflows)return [];
  const rows=await workflowRepository.listWorkflows(userId,{state,limit});
  for(const row of rows){const wf={id:row.id,type:row.type,state:row.state,context:row.context||{},steps:row.steps||[],history:row.history||[],attempt:row.attempt||0,createdAt:row.created_at||row.createdAt,updatedAt:row.updated_at||row.updatedAt};workflows.set(wf.id,wf);}
  return [...workflows.values()];
 }
 return {userId,memory,persistMemoryRecord,deleteMemoryRecord,restoreMemories,identity,scheduler,metrics,idempotency,approvals,audit,auditLedger,providerHealth,policyStore,credentialVault,fabric,capabilityPermissions,fabricPolicy,appController,discovery,goalPlanner,missionPlanner,missionRunner,transactionSafety,sensorFusion,emergencyPolicies,guardian,workflows,propose,approve,reject,restoreWorkflows,persistWorkflow,persistRuntimeState,restoreRuntimeState};
}
module.exports={createRuntime,createActionExecutor};