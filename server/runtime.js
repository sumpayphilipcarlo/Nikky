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

function createActionExecutor({gmail,twilio}={}){
 const handlers={
  "email.send":async action=>gmail?.send?gmail.send({raw:action.raw,interactive:action.interactive!==false}):({ok:false,live:false,reason:"Gmail provider is not configured"}),
  "sms.send":async action=>twilio?.sendSms?twilio.sendSms({to:action.to,body:action.body}):({ok:false,live:false,reason:"Twilio provider is not configured"}),
  "call.place":async action=>twilio?.placeCall?twilio.placeCall({to:action.to,twiml:action.twiml}):({ok:false,live:false,reason:"Twilio provider is not configured"})
 };
 return async function execute(action){
  const handler=handlers[action?.type];
  if(!handler)return {ok:false,live:false,reason:"No backend provider executor configured for "+(action?.type||"unknown")};
  try{
   const result=await handler(action);
   if(!result||result.ok!==true)return {ok:false,live:false,reason:result?.reason||"Provider did not confirm execution",providerResult:result||null};
   if(result.live!==true)return {ok:false,live:false,reason:"Provider did not confirm live execution",providerResult:result};
   return result;
  }catch(error){
   return {ok:false,live:false,reason:"Provider execution error: "+(error?.message||String(error))};
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
 const approvals=[],audit=[];
 const gmail=providers.gmail||createGmailAdapter({tokenProvider:providers.gmailTokenProvider,fetchFn:providers.fetchFn});
 const twilio=providers.twilio||createTwilioAdapter({accountSid:env.TWILIO_ACCOUNT_SID,authToken:env.TWILIO_AUTH_TOKEN,fromNumber:env.TWILIO_FROM_NUMBER,fetchFn:providers.fetchFn});
 const providerExecutor=createActionExecutor({gmail,twilio});
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
 async function restoreWorkflows({state,limit=200}={}){
  if(!workflowRepository?.listWorkflows)return [];
  const rows=await workflowRepository.listWorkflows(userId,{state,limit});
  for(const row of rows){const wf={id:row.id,type:row.type,state:row.state,context:row.context||{},steps:row.steps||[],history:row.history||[],attempt:row.attempt||0,createdAt:row.created_at||row.createdAt,updatedAt:row.updated_at||row.updatedAt};workflows.set(wf.id,wf);}
  return [...workflows.values()];
 }
 return {memory,identity,scheduler,metrics,idempotency,approvals,audit,auditLedger,providerHealth,policyStore,workflows,propose,approve,reject,restoreWorkflows,persistWorkflow};
}
module.exports={createRuntime,createActionExecutor};