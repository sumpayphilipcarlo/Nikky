(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports) module.exports=api;
 root.NikkyJourney=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 function toMinutes(hhmm){
   if(typeof hhmm!=="string"||!/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
   const [h,m]=hhmm.split(":").map(Number);
   if(h<0||h>23||m<0||m>59) return null;
   return h*60+m;
 }
 function fmt(n){
   n=(n+1440)%1440;
   return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
 }
 function plan({event,routine={},learned={},trafficMinutes=null,now=new Date()}={}){
   if(!event||!event.time) return {ok:false,reason:"Event time is required"};
   const eventMinutes=toMinutes(event.time);
   if(eventMinutes===null) return {ok:false,reason:"Invalid event time"};
   const prep=Number.isFinite(learned.typicalPrepMinutes)?learned.typicalPrepMinutes:Number(routine.prep)||0;
   const commute=Number.isFinite(trafficMinutes)?trafficMinutes:(Number.isFinite(learned.typicalCommuteMinutes)?learned.typicalCommuteMinutes:Number(routine.commute)||0);
   const buffer=Number(routine.buffer)||0;
   const leaveAt=eventMinutes-commute-buffer;
   const prepareAt=leaveAt-prep;
   const current=now.getHours()*60+now.getMinutes();
   const lateBy=Math.max(0,current-leaveAt);
   const result={
     ok:true,
     event,
     prepMinutes:prep,
     commuteMinutes:commute,
     bufferMinutes:buffer,
     prepareAt:fmt(prepareAt),
     leaveAt:fmt(leaveAt),
     eventAt:fmt(eventMinutes),
     lateByMinutes:lateBy,
     status:lateBy>0?"late-risk":current>=prepareAt?"prepare-now":"on-track",
     steps:[
       {kind:"prepare",at:fmt(prepareAt),label:"Start preparing"},
       {kind:"leave",at:fmt(leaveAt),label:"Leave for destination"},
       {kind:"arrive",at:fmt(eventMinutes),label:"Event starts"}
     ]
   };
   if(lateBy>0){
     result.communicationAction={
       type:"sms.send",
       title:"Notify contact about possible delay",
       summary:`You may be about ${lateBy} minutes late for ${event.title||"your event"}. Prepare a delay message for approval.`,
       payload:{
         recipient:event.contact||"event contact",
         message:`I may be about ${lateBy} minutes late for ${event.title||"our meeting"}.`
       },
       provenance:{source:"journey-orchestrator",eventId:event.id||null}
     };
   }
   return result;
 }
 return {plan,toMinutes,fmt};
});