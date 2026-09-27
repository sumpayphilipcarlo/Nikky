function createMetrics(){
 const counters=new Map(),events=[];
 function inc(name,n=1,tags={}){const key=name+":"+JSON.stringify(tags);counters.set(key,(counters.get(key)||0)+n);return counters.get(key)}
 function event(name,data={}){const e={name,data,at:new Date().toISOString()};events.push(e);if(events.length>1000)events.shift();return e}
 function snapshot(){return {counters:Object.fromEntries(counters),events:[...events]}}
 function reset(){counters.clear();events.length=0}
 return {inc,event,snapshot,reset};
}
function recordSuggestion(metrics,{accepted=false,ignored=false,rejected=false}={}){
 metrics.inc("suggestions.total");
 if(accepted)metrics.inc("suggestions.accepted");
 if(ignored)metrics.inc("suggestions.ignored");
 if(rejected)metrics.inc("suggestions.rejected");
}
function recordAction(metrics,{decision,status}={}){
 if(decision)metrics.inc("authority."+decision);
 if(status)metrics.inc("actions."+status);
}
module.exports={createMetrics,recordSuggestion,recordAction};