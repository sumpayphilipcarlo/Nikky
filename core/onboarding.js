const STEPS=[
 {id:"identity",title:"Who is Nikky helping?",required:true},
 {id:"routine",title:"Work and daily routine",required:true},
 {id:"important-people",title:"Important people",required:false},
 {id:"calendar",title:"Connect calendar",required:false},
 {id:"communications",title:"Connect communication skills",required:false},
 {id:"authority",title:"Set Nikky's authority boundaries",required:true},
 {id:"privacy",title:"Choose memory and privacy preferences",required:true},
 {id:"devices",title:"Register your devices",required:false}
];
function createOnboarding(initial={}){
 const completed=new Set(initial.completed||[]),answers={...(initial.answers||{})};
 function complete(id,data){if(!STEPS.some(s=>s.id===id))throw new Error("unknown onboarding step");completed.add(id);if(data!==undefined)answers[id]=data;return progress()}
 function progress(){
  const required=STEPS.filter(s=>s.required),requiredDone=required.filter(s=>completed.has(s.id)).length;
  return {completed:[...completed],total:STEPS.length,percent:Math.round(completed.size/STEPS.length*100),requiredComplete:requiredDone===required.length,next:STEPS.find(s=>!completed.has(s.id))||null};
 }
 function snapshot(){return {completed:[...completed],answers:{...answers}}}
 return {complete,progress,snapshot,steps:STEPS};
}
module.exports={STEPS,createOnboarding};