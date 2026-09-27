function sortEvents(events=[]){return [...events].sort((a,b)=>new Date(a.start||a.date)-new Date(b.start||b.date))}
function morningBrief({events=[],tasks=[],weather,traffic,lifeEvents=[],predictions=[]}={}){
 const upcoming=sortEvents(events).slice(0,5),openTasks=tasks.filter(t=>t.status!=="completed").slice(0,5);
 const important=predictions.filter(p=>p.status==="candidate").sort((a,b)=>b.confidence-a.confidence).slice(0,3);
 return {
  type:"morning",
  generatedAt:new Date().toISOString(),
  headline:upcoming[0]?`First up: ${upcoming[0].title}`:(openTasks[0]?`Priority: ${openTasks[0].title}`:"No urgent commitments"),
  events:upcoming,
  tasks:openTasks,
  weather:weather||null,
  traffic:traffic||null,
  lifeEvents:lifeEvents.slice(0,3),
  predictions:important
 };
}
function eveningBrief({completedTasks=[],openTasks=[],commitments=[],tomorrowEvents=[],audit=[]}={}){
 return {
  type:"evening",
  generatedAt:new Date().toISOString(),
  completedCount:completedTasks.length,
  unresolved:openTasks.slice(0,5),
  commitments:commitments.filter(c=>c.status==="open").slice(0,5),
  tomorrow:sortEvents(tomorrowEvents).slice(0,5),
  recentActions:audit.slice(0,10)
 };
}
module.exports={morningBrief,eveningBrief};