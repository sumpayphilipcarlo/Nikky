const WINDOWS={
 Anniversary:[{days:30,stage:"awareness"},{days:14,stage:"planning"},{days:7,stage:"finalize"},{days:2,stage:"final-prep"},{days:0,stage:"day-of"}],
 Birthday:[{days:14,stage:"planning"},{days:7,stage:"finalize"},{days:2,stage:"final-prep"},{days:0,stage:"day-of"}],
 Trip:[{days:14,stage:"planning"},{days:2,stage:"weather-route-packing"},{days:1,stage:"departure-plan"},{days:0,stage:"travel-day"}],
 Renewal:[{days:30,stage:"awareness"},{days:7,stage:"action"},{days:1,stage:"urgent"}],
 Appointment:[{days:2,stage:"prepare"},{days:1,stage:"confirm"},{days:0,stage:"day-of"}]
};
function daysUntil(date,now=new Date()){const a=new Date(date+"T00:00:00"),b=new Date(now);b.setHours(0,0,0,0);return Math.ceil((a-b)/86400000)}
function preparation(event,now=new Date()){
 const days=daysUntil(event.date,now);if(days<0)return null;
 const windows=WINDOWS[event.type]||[{days:7,stage:"prepare"},{days:0,stage:"day-of"}];
 const applicable=[...windows].sort((a,b)=>b.days-a.days).find(w=>days<=w.days);
 if(!applicable)return null;
 const suggestions={
  "awareness":["Review plans and availability"],
  "planning":["Check calendar and prepare options"],
  "finalize":["Finalize reservations, gift, or logistics"],
  "final-prep":["Confirm arrangements and reminders"],
  "day-of":["Greet, review today's plan, and surface key details"],
  "weather-route-packing":["Check weather, route, and packing list"],
  "departure-plan":["Calculate wake and departure time"],
  "travel-day":["Recheck traffic, documents, and departure"],
  "action":["Complete renewal before deadline"],
  "urgent":["Renewal deadline is imminent"],
  "prepare":["Review appointment requirements"],
  "confirm":["Confirm appointment details"]
 };
 return {eventId:event.id,daysUntil:days,stage:applicable.stage,suggestions:suggestions[applicable.stage]||["Prepare for event"]};
}
module.exports={WINDOWS,daysUntil,preparation};