const Journey=require("../journey.js");
function minutesUntil(date,now){return Math.round((new Date(date)-now)/60000)}
function createDepartureService({calendar,maps,weather,proposeAction,getContext=()=>({}),now=()=>new Date()}={}){
 if(!calendar?.listUpcoming)throw new Error("calendar adapter required");
 async function scan({origin,coordinates}={}){
  const current=now();
  const cal=await calendar.listUpcoming({from:current,limit:5,interactive:false});
  if(!cal.ok)return {ok:false,stage:"calendar",reason:cal.reason,suggestions:[]};
  const results=[];
  for(const event of cal.events){
   if(!event.destination||!event.start)continue;
   const mins=minutesUntil(event.start,current);
   if(mins<0||mins>24*60)continue;
   let traffic=null;
   if(maps?.travelTime&&origin){
    const route=await maps.travelTime({origin,destination:event.destination,departureTime:current});
    if(route.ok)traffic=route;
   }
   let wx=null;
   if(weather?.current&&coordinates){
    const w=await weather.current(coordinates);if(w.ok)wx=w;
   }
   const ctx=getContext()||{};
   const j=Journey.plan({
    event:{...event,time:event.time||new Date(event.start).toTimeString().slice(0,5)},
    routine:ctx.routine||{},
    learned:ctx.learned||{},
    trafficMinutes:traffic?.durationMinutes??null,
    now:current
   });
   if(!j.ok)continue;
   const priority=j.status==="late-risk"?98:j.status==="prepare-now"?85:60;
   const weatherNote=wx&&(wx.rainMm>0||wx.precipitationMm>0)?" Rain is currently detected.":"";
   const action={
    type:"proactive.notify",
    title:j.status==="late-risk"?"You may be late":j.status==="prepare-now"?"Start preparing":"Upcoming trip",
    summary:`${event.title}: leave around ${j.leaveAt} for ${event.destination}.${weatherNote}`,
    payload:{eventId:event.id,leaveAt:j.leaveAt,destination:event.destination,traffic,weather:wx},
    meta:{externalImpact:false},
    provenance:{source:"departure-service",calendarSource:event.source}
   };
   let actionResult=null;
   if(typeof proposeAction==="function"&&(j.status==="late-risk"||j.status==="prepare-now")) actionResult=await proposeAction(action);
   results.push({event,journey:j,traffic,weather:wx,priority,action,actionResult});
  }
  return {ok:true,calendarLive:!!cal.live,results};
 }
 return {scan};
}
module.exports={minutesUntil,createDepartureService};