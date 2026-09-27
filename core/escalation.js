function createEscalation({now=()=>Date.now()}={}){
 function plan({priority=50,minutesUntilDeadline=null,userInactive=false,quietHours=false}={}){
  const steps=[];
  if(priority<50)return steps;
  if(quietHours&&priority<90)steps.push({level:"silent",delayMs:0});
  else steps.push({level:"normal",delayMs:0});
  if(priority>=80||Number(minutesUntilDeadline)<=30)steps.push({level:"alert",delayMs:5*60*1000});
  if((priority>=95||Number(minutesUntilDeadline)<=15)&&userInactive)steps.push({level:"urgent",delayMs:3*60*1000});
  if((priority>=98||Number(minutesUntilDeadline)<=10)&&userInactive)steps.push({level:"wake",delayMs:2*60*1000,requiresCapability:"wake-word"});
  return steps;
 }
 function next(plan,history=[]){
  const used=new Set(history.map(h=>h.level));
  return plan.find(s=>!used.has(s.level))||null;
 }
 return {plan,next,createdAt:now()};
}
module.exports={createEscalation};