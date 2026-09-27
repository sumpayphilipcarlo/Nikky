const Authority=require("../authority.js");
global.NikkyAuthority=Authority;
const Orchestrator=require("../orchestrator.js");
const {createMemoryStore}=require("../core/memory.js");
const {createIdentityService}=require("../core/identity.js");
const {createScheduler}=require("../core/scheduler.js");
const {createMetrics,recordAction}=require("../core/observability.js");
const Risk=require("../core/risk.js");
const Workflow=require("../core/workflow-engine.js");

function createRuntime({now=()=>Date.now()}={}){
 const memory=createMemoryStore({now:()=>new Date(now())});
 const identity=createIdentityService({now});
 const scheduler=createScheduler({now});
 const metrics=createMetrics();
 const approvals=[],audit=[];
 const orchestrator=Orchestrator.create({
  approvalQueue:approvals,auditLog:audit,
  executor:async(action)=>({ok:false,reason:"No backend provider executor configured for "+action.type})
 });
 const workflows=new Map();

 async function propose(action){
  const risk=Risk.classify(action);
  const wf=Workflow.createWorkflow({type:action.type,context:{action,risk}});
  Workflow.transition(wf,Workflow.STATES.PLANNED,"action structured");
  workflows.set(wf.id,wf);
  const result=await orchestrator.propose(action);
  if(result.status==="approval_required") Workflow.transition(wf,Workflow.STATES.AWAITING_APPROVAL,"user approval required");
  else if(result.status==="denied") Workflow.transition(wf,Workflow.STATES.CANCELLED,"authority denied action");
  else if(result.status==="executed") {Workflow.transition(wf,Workflow.STATES.EXECUTING,"authority allowed");Workflow.transition(wf,Workflow.STATES.COMPLETED,"executor completed");}
  else if(result.status==="execution_failed") {Workflow.transition(wf,Workflow.STATES.EXECUTING,"authority allowed");Workflow.transition(wf,Workflow.STATES.FAILED,"executor failed");}
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
  recordAction(metrics,{decision:"approved",status:result.status});
  return result;
 }
 function reject(id){
  const item=approvals.find(a=>a.id===id);
  const result=orchestrator.reject(id);
  const wf=item?[...workflows.values()].find(w=>w.context?.action===item.action||w.context?.action?.type===item.action?.type&&w.state===Workflow.STATES.AWAITING_APPROVAL):null;
  if(wf)Workflow.transition(wf,Workflow.STATES.CANCELLED,"user rejected");
  recordAction(metrics,{decision:"rejected",status:result.status});
  return result;
 }
 return {memory,identity,scheduler,metrics,approvals,audit,workflows,propose,approve,reject};
}
module.exports={createRuntime};