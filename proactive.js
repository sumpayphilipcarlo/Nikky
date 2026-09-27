(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports) module.exports=api;
 root.NikkyProactive=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 function parseDateOnly(value){
   if(!value) return null;
   const d=new Date(value+"T00:00:00");
   return Number.isNaN(d.getTime())?null:d;
 }
 function dayDiff(dateValue,now){
   const d=parseDateOnly(dateValue); if(!d)return null;
   const n=new Date(now); n.setHours(0,0,0,0);
   return Math.ceil((d-n)/86400000);
 }
 function detect({now=new Date(),routine={},learned={},events=[]}={}){
   const suggestions=[];
   const current=now.getHours()*60+now.getMinutes();
   const arrival=typeof routine.arrival==="string" ? (()=>{const [h,m]=routine.arrival.split(":").map(Number);return h*60+m})() : null;
   const prep=Number.isFinite(learned.typicalPrepMinutes)?learned.typicalPrepMinutes:Number(routine.prep);
   const commute=Number.isFinite(learned.typicalCommuteMinutes)?learned.typicalCommuteMinutes:Number(routine.commute);
   const buffer=Number(routine.buffer)||0;
   if(Number.isFinite(arrival)&&Number.isFinite(prep)&&Number.isFinite(commute)){
     const leave=arrival-commute-buffer;
     const wake=leave-prep;
     if(current>=wake-15 && current<wake+30){
       suggestions.push({
         id:"departure-prepare",
         kind:"departure",
         priority:90,
         title:"Start getting ready",
         summary:`To arrive by ${routine.arrival}, your current pattern suggests preparing now and leaving around ${formatMinutes(leave)}.`,
         action:{type:"proactive.notify",title:"Departure preparation",summary:"Start getting ready for your planned departure.",payload:{leaveAt:formatMinutes(leave)}}
       });
     } else if(current>=leave-20 && current<=leave+20){
       suggestions.push({
         id:"departure-leave",
         kind:"departure",
         priority:100,
         title:current>leave?"Departure time has passed":"Leave soon",
         summary:`Your planned departure is around ${formatMinutes(leave)} to arrive by ${routine.arrival}.`,
         action:{type:"proactive.notify",title:"Departure reminder",summary:`Leave around ${formatMinutes(leave)}.`,payload:{leaveAt:formatMinutes(leave)}}
       });
     }
   }
   for(const event of events){
     const days=dayDiff(event.date,now);
     if(days===null||days<0) continue;
     let priority=0,summary="";
     const type=String(event.type||"event").toLowerCase();
     if(days===0){priority=95;summary=`${event.title} is today.`;}
     else if(days===1){priority=85;summary=`${event.title} is tomorrow. Check that preparation is complete.`;}
     else if((type==="anniversary"||type==="birthday")&&days<=7){priority=75;summary=`${event.title} is in ${days} days. Consider finalizing plans, gifts, or reservations.`;}
     else if((type==="trip"||type==="appointment")&&days<=2){priority=80;summary=`${event.title} is in ${days} days. Review timing, destination, and preparation.`;}
     else if(days<=14 && (type==="anniversary"||type==="birthday")){priority=55;summary=`${event.title} is in ${days} days. This is a good planning window.`;}
     if(priority){
       suggestions.push({
         id:`event-${event.id||event.title}-${days}`,
         kind:"life-event",
         priority,
         title:event.title,
         summary,
         action:{type:"proactive.notify",title:event.title,summary,payload:{eventId:event.id||null,daysUntil:days}}
       });
     }
   }
   return suggestions.sort((a,b)=>b.priority-a.priority).slice(0,8);
 }
 function formatMinutes(n){n=(n+1440)%1440;return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")}
 return {detect,dayDiff,formatMinutes};
});