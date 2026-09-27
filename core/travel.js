function buildTravelPlan({trip,weather,route,now=new Date()}={}){
 if(!trip?.start)throw new Error("trip start required");
 const start=new Date(trip.start),hours=(start-now)/3600000;
 const tasks=[];
 if(hours<=336&&hours>48)tasks.push({stage:"planning",task:"Review itinerary, lodging, documents, and transport"});
 if(hours<=48&&hours>24)tasks.push({stage:"prepare",task:"Check forecast, route, and packing requirements"});
 if(hours<=24&&hours>4)tasks.push({stage:"departure",task:"Calculate wake time and departure buffer"});
 if(hours<=4&&hours>=0)tasks.push({stage:"travel-day",task:"Recheck traffic, weather, tickets, and documents"});
 if(weather?.rainMm>0)tasks.push({stage:"weather",task:"Rain expected/detected; adjust clothing and travel buffer"});
 if(route?.trafficDelayMinutes>15)tasks.push({stage:"traffic",task:`Traffic adds about ${route.trafficDelayMinutes} minutes; leave earlier`});
 return {tripId:trip.id||null,hoursUntilStart:Math.round(hours*10)/10,tasks};
}
module.exports={buildTravelPlan};