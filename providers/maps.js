function createGoogleRoutesAdapter({apiKey,fetchFn}={}){
 const request=fetchFn||(typeof fetch==="function"?fetch.bind(globalThis):null);
 async function travelTime({origin,destination,departureTime=new Date()}={}){
  if(!request)return {ok:false,live:false,reason:"Fetch API unavailable"};
  if(!apiKey)return {ok:false,live:false,reason:"Google Routes API key is not configured"};
  if(!origin||!destination)return {ok:false,live:false,reason:"origin and destination are required"};
  const body={
   origin:{address:String(origin)},
   destination:{address:String(destination)},
   travelMode:"DRIVE",
   routingPreference:"TRAFFIC_AWARE",
   departureTime:(departureTime instanceof Date?departureTime:new Date(departureTime)).toISOString()
  };
  let r;
  try{
   r=await request("https://routes.googleapis.com/directions/v2:computeRoutes",{
    method:"POST",
    headers:{
     "content-type":"application/json",
     "X-Goog-Api-Key":apiKey,
     "X-Goog-FieldMask":"routes.duration,routes.distanceMeters,routes.staticDuration"
    },
    body:JSON.stringify(body)
   });
  }catch(err){return {ok:false,live:false,reason:err?.message||"Routes request failed"}}
  if(!r.ok){
   let detail="";try{const b=await r.json();detail=b?.error?.message||""}catch{}
   return {ok:false,live:false,reason:detail||("Google Routes returned HTTP "+r.status)};
  }
  const data=await r.json(),route=data.routes?.[0];
  if(!route)return {ok:false,live:true,reason:"No route found"};
  const seconds=v=>Number(String(v||"0s").replace(/s$/,""))||0;
  const durationSeconds=seconds(route.duration),staticSeconds=seconds(route.staticDuration);
  return {
   ok:true,live:true,source:"google-routes",
   durationMinutes:Math.ceil(durationSeconds/60),
   baselineMinutes:staticSeconds?Math.ceil(staticSeconds/60):null,
   trafficDelayMinutes:staticSeconds?Math.max(0,Math.ceil((durationSeconds-staticSeconds)/60)):null,
   distanceMeters:route.distanceMeters||null
  };
 }
 return {travelTime};
}
module.exports={createGoogleRoutesAdapter};