function explain({prediction,action,authorityDecision,workflow}={}){
 const evidence=(prediction?.evidence||[]).map(e=>e.label||e.source||"signal");
 const why=[];
 if(prediction)why.push(`Prediction confidence ${Math.round((prediction.confidence||0)*100)}%`);
 if(evidence.length)why.push("Signals: "+evidence.join(", "));
 if(authorityDecision)why.push(`Authority decision: ${authorityDecision.level||authorityDecision.effect||authorityDecision}`);
 if(workflow?.state)why.push("Workflow state: "+workflow.state);
 return {
  title:action?.title||prediction?.title||"Nikky action",
  summary:action?.summary||"",
  why,
  source:action?.provenance?.source||prediction?.type||"unknown",
  canCorrect:true
 };
}
module.exports={explain};