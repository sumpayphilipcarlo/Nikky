const LEVELS={INFO:"info",WARN:"warn",URGENT:"urgent",TRUSTED_CONTACT:"trusted_contact",PROFESSIONAL_HELP:"professional_help"};
function createGuardian({sensorFusion,now=()=>Date.now(),notify,contactTrusted,requestProfessionalHelp}={}){
 const incidents=new Map();
 function start({type,signals=[],policy={},location=null}={}){
  if(!type)throw new Error("incident type required");
  const corroboration=sensorFusion?.correlate?.(signals,{minConfidence:policy.minConfidence??.8,minSources:policy.minSources??2,windowMs:policy.windowMs??120000})||{ok:false,confidence:0,sourceCount:0};
  const id="incident_"+now().toString(36)+"_"+Math.random().toString(36).slice(2,7);
  const incident={id,type,signals,policy,location,corroboration,level:corroboration.ok?LEVELS.URGENT:LEVELS.WARN,status:"open",createdAt:now(),timeline:[]};
  incident.timeline.push({at:now(),event:"incident_started",level:incident.level,corroboration});
  incidents.set(id,incident);return clone(incident);
 }
 function clone(v){return JSON.parse(JSON.stringify(v))}
 async function escalate(id,{responsive=false,userConfirmedEmergency=false}={}){
  const i=incidents.get(id);if(!i)throw new Error("incident not found");
  if(responsive&&!userConfirmedEmergency){
   i.level=LEVELS.INFO;i.status="acknowledged";i.timeline.push({at:now(),event:"user_responsive"});return clone(i);
  }
  if(notify){await notify(i);i.timeline.push({at:now(),event:"urgent_notification"})}
  const strong=!!i.corroboration.ok;
  const hasTrustedContact=Array.isArray(i.policy?.trustedContacts)&&i.policy.trustedContacts.some(Boolean);
  if(strong&&hasTrustedContact&&contactTrusted){
   await contactTrusted(i);i.level=LEVELS.TRUSTED_CONTACT;i.timeline.push({at:now(),event:"trusted_contact_requested"});
  }
  const mayRequestProfessional=strong&&(userConfirmedEmergency||i.policy.allowProfessionalHelpWhenUnresponsive===true);
  if(mayRequestProfessional&&requestProfessionalHelp){
   const r=await requestProfessionalHelp(i);
   i.timeline.push({at:now(),event:"professional_help_requested",result:r});
   if(r?.ok)i.level=LEVELS.PROFESSIONAL_HELP;
  }
  return clone(i);
 }
 function close(id,resolution){
  const i=incidents.get(id);if(!i)throw new Error("incident not found");
  i.status="closed";i.resolution=resolution||null;i.timeline.push({at:now(),event:"incident_closed",resolution});return clone(i);
 }
 return {LEVELS,start,escalate,close,get:id=>incidents.has(id)?clone(incidents.get(id)):null,list:()=>[...incidents.values()].map(clone)};
}
module.exports={LEVELS,createGuardian};