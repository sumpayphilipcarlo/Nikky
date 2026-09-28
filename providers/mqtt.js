function createMqttAdapter({client,topicPrefix="nikky"}={}){
 function safeSegment(v){return /^[A-Za-z0-9._-]+$/.test(String(v||""))}
 async function command({deviceId,capability,value}={}){
  if(!client?.publish)return {ok:false,live:false,reason:"MQTT client unavailable"};
  if(!safeSegment(deviceId)||!safeSegment(capability))return {ok:false,live:false,reason:"invalid MQTT device or capability"};
  const topic=`${topicPrefix}/${deviceId}/set/${capability}`;
  await client.publish(topic,JSON.stringify({value}));
  return {ok:true,live:true,topic};
 }
 async function state({deviceId,capability}={}){
  if(!client?.request)return {ok:false,live:false,reason:"MQTT request interface unavailable"};
  if(!safeSegment(deviceId)||!safeSegment(capability))return {ok:false,live:false,reason:"invalid MQTT device or capability"};
  return client.request(`${topicPrefix}/${deviceId}/state/${capability}`);
 }
 return {command,state};
}
module.exports={createMqttAdapter};