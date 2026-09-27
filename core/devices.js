const CHANNELS=["push","local","voice","sms"];
function createDeviceRegistry(initial=[]){
 const devices=new Map(initial.map(d=>[d.id,{...d}]));
 function upsert(device){if(!device?.id)throw new Error("device id required");devices.set(device.id,{...devices.get(device.id),...device,lastSeen:device.lastSeen||new Date().toISOString()});return devices.get(device.id)}
 function list(){return [...devices.values()]}
 function revoke(id){const d=devices.get(id);if(!d)return false;d.revoked=true;return true}
 function route({priority=50,requiredCapability=null}={}){
  return list().filter(d=>!d.revoked&&d.online!==false&&(!requiredCapability||d.capabilities?.includes(requiredCapability)))
   .sort((a,b)=>(Number(b.presence)||0)-(Number(a.presence)||0)||(new Date(b.lastSeen)-new Date(a.lastSeen)))
   .map(d=>({deviceId:d.id,channel:d.channels?.find(c=>CHANNELS.includes(c))||"push",priority}));
 }
 return {upsert,list,revoke,route};
}
module.exports={CHANNELS,createDeviceRegistry};