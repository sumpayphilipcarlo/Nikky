function buildWorkoutPlan({goal="general-fitness",daysPerWeek=3,equipment=[],minutes=30,recovery={}}={}){
 const lowRecovery=Number(recovery.sleepHours||8)<6||Number(recovery.readiness??1)<.5;
 const intensity=lowRecovery?"light":"moderate";
 const templates={
  "general-fitness":["squat","push","hinge","row","carry","core"],
  "strength":["squat","push","hinge","pull","core"],
  "mobility":["mobility-flow","core","walk"],
  "cardio":["walk-run","core","mobility-flow"]
 };
 const base=templates[goal]||templates["general-fitness"];
 const exercises=base.map(name=>({name,sets:intensity==="light"?2:3,reps:intensity==="light"?"easy":"8-12",equipment}));
 return {goal,daysPerWeek,minutes,intensity,exercises,adjustedForRecovery:lowRecovery};
}
function adjustWorkout(plan,{pain=false,fatigue=false,timeMinutes}={}){
 const next=JSON.parse(JSON.stringify(plan));
 if(pain){next.intensity="light";next.note="Stop or modify painful movements; seek appropriate medical advice for concerning symptoms."}
 if(fatigue){next.intensity="light";next.exercises=next.exercises.slice(0,Math.max(2,Math.ceil(next.exercises.length/2)))}
 if(timeMinutes&&timeMinutes<next.minutes){next.minutes=timeMinutes;next.exercises=next.exercises.slice(0,Math.max(2,Math.floor(next.exercises.length*timeMinutes/plan.minutes)))}
 return next;
}
module.exports={buildWorkoutPlan,adjustWorkout};