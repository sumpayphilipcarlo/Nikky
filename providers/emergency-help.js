function createEmergencyHelpAdapter({channels={},audit=()=>{}}={}){
 async function request({incident,channelId}={}){
  const id=channelId||incident?.policy?.professionalHelpChannel;
  if(!id)return {ok:false,live:false,reason:"no professional-help channel configured"};
  const channel=channels[id];
  if(!channel||typeof channel.request!=="function")return {ok:false,live:false,reason:"professional-help channel unavailable"};
  if(!incident?.location&&channel.locationRequired!==false)return {ok:false,live:false,reason:"verified location required"};
  if(!incident?.corroboration?.ok&&!incident?.userConfirmedEmergency)return {ok:false,live:false,reason:"emergency not sufficiently corroborated"};
  const result=await channel.request({incident});
  audit({type:"professional_help",channelId:id,incidentId:incident.id,ok:result?.ok===true,at:new Date().toISOString()});
  return result?.ok===true?{ok:true,live:result.live===true,channel:id,reference:result.reference||null}:{ok:false,live:false,channel:id,reason:result?.reason||"help request failed"};
 }
 return {request,channels:()=>Object.keys(channels)};
}
module.exports={createEmergencyHelpAdapter};