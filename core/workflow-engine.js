const STATES=Object.freeze({
 DETECTED:"detected",PLANNED:"planned",AWAITING_APPROVAL:"awaiting_approval",
 EXECUTING:"executing",COMPLETED:"completed",FAILED:"failed",CANCELLED:"cancelled"
});
const ALLOWED={
 [STATES.DETECTED]:[STATES.PLANNED,STATES.CANCELLED],
 [STATES.PLANNED]:[STATES.AWAITING_APPROVAL,STATES.EXECUTING,STATES.CANCELLED],
 [STATES.AWAITING_APPROVAL]:[STATES.EXECUTING,STATES.CANCELLED],
 [STATES.EXECUTING]:[STATES.COMPLETED,STATES.FAILED],
 [STATES.FAILED]:[STATES.PLANNED,STATES.EXECUTING,STATES.CANCELLED],
 [STATES.COMPLETED]:[],[STATES.CANCELLED]:[]
};
function id(){return "wf_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8)}
function createWorkflow({type,context={},steps=[]}={}){
 if(!type) throw new Error("workflow type is required");
 const now=new Date().toISOString();
 return {id:id(),type,state:STATES.DETECTED,context,steps,history:[{at:now,state:STATES.DETECTED,reason:"created"}],createdAt:now,updatedAt:now,attempt:0};
}
function transition(workflow,next,reason=""){
 if(!workflow||!ALLOWED[workflow.state]?.includes(next)) throw new Error(`invalid transition ${workflow?.state} -> ${next}`);
 workflow.state=next;workflow.updatedAt=new Date().toISOString();
 if(next===STATES.EXECUTING) workflow.attempt=(workflow.attempt||0)+1;
 workflow.history.push({at:workflow.updatedAt,state:next,reason});
 return workflow;
}
function canTransition(workflow,next){return !!ALLOWED[workflow?.state]?.includes(next)}
module.exports={STATES,ALLOWED,createWorkflow,transition,canTransition};