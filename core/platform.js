const BASE_CAPABILITIES=["ui","notifications"];
const PLATFORM_DEFAULTS={
 web:["ui","notifications","speech-input","geolocation","files"],
 android:["ui","notifications","background-jobs","wake-word","speech-input","calls","sms","contacts","geolocation","files","push"],
 ios:["ui","notifications","background-refresh","speech-input","shortcuts","contacts","geolocation","files","push"],
 windows:["ui","notifications","background-jobs","wake-word","speech-input","active-window","files","push"],
 macos:["ui","notifications","background-jobs","wake-word","speech-input","active-window","files","push"],
 linux:["ui","notifications","background-jobs","wake-word","speech-input","active-window","files","push"]
};
function capabilitiesFor(platform,declared=[]){return [...new Set([...(PLATFORM_DEFAULTS[platform]||BASE_CAPABILITIES),...declared])]}
function negotiate(devices,requirements=[]){
 return (devices||[]).map(d=>({...d,effectiveCapabilities:capabilitiesFor(d.platform,d.capabilities)}))
  .filter(d=>!d.revoked&&requirements.every(r=>d.effectiveCapabilities.includes(r)))
  .sort((a,b)=>(Number(b.presence)||0)-(Number(a.presence)||0));
}
function bestDevice(devices,requirements=[]){return negotiate(devices,requirements)[0]||null}
module.exports={BASE_CAPABILITIES,PLATFORM_DEFAULTS,capabilitiesFor,negotiate,bestDevice};