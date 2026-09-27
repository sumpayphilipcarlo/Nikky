function ratio(n,d){return d?Math.round(n/d*10000)/10000:0}
function calculate(snapshot={}){
 const c=snapshot.counters||{};
 const val=k=>Number(c[k]||c[k+":{}"]||0);
 const suggestions=val("suggestions.total"),accepted=val("suggestions.accepted"),rejected=val("suggestions.rejected"),ignored=val("suggestions.ignored");
 const actionsCompleted=val("actions.completed")+val("actions.executed"),actionsFailed=val("actions.execution_failed")+val("actions.failed");
 return {
  suggestionAcceptanceRate:ratio(accepted,suggestions),
  suggestionRejectionRate:ratio(rejected,suggestions),
  suggestionIgnoreRate:ratio(ignored,suggestions),
  actionReliability:ratio(actionsCompleted,actionsCompleted+actionsFailed),
  approvalRate:ratio(val("authority.approved"),val("authority.approved")+val("authority.rejected")),
  raw:{suggestions,accepted,rejected,ignored,actionsCompleted,actionsFailed}
 };
}
module.exports={ratio,calculate};