const EFFECTS={ALLOW:"allow",APPROVAL:"approval",DENY:"deny"};
function createPolicyEngine(initialRules=[]){
 const rules=[];
 function clone(v){return JSON.parse(JSON.stringify(v))}
 function add(rule){
  if(!rule?.id||!Object.values(EFFECTS).includes(rule.effect))throw new Error("valid policy id and effect required");
  const normalized={enabled:true,priority:0,...rule};
  const idx=rules.findIndex(r=>r.id===normalized.id);
  if(idx>=0)rules[idx]=normalized;else rules.push(normalized);
  return clone({...normalized,condition:undefined});
 }
 function remove(id){const i=rules.findIndex(r=>r.id===id);if(i<0)return false;rules.splice(i,1);return true}
 function matches(rule,action,ctx){
  if(rule.actionType&&rule.actionType!==action.type)return false;
  if(rule.recipient&&rule.recipient!==(action.payload?.recipient||action.recipient))return false;
  if(rule.provider&&rule.provider!==ctx?.provider)return false;
  if(rule.deviceId&&rule.deviceId!==(ctx?.deviceId||action?.meta?.endpointId))return false;
  if(rule.skill&&rule.skill!==ctx?.skill)return false;
  if(rule.maxRisk!=null&&Number(ctx?.riskScore||0)>Number(rule.maxRisk))return false;
  if(rule.condition&&typeof rule.condition==="function"&&!rule.condition(action,ctx))return false;
  return true;
 }
 function evaluate(action,ctx={}){
  const applicable=rules.filter(r=>r.enabled!==false&&matches(r,action,ctx)).sort((a,b)=>(b.priority||0)-(a.priority||0));
  const rule=applicable[0];
  return rule?{effect:rule.effect,ruleId:rule.id}:{effect:EFFECTS.APPROVAL,ruleId:null};
 }
 function list(){return rules.map(r=>clone({...r,condition:undefined}))}
 function snapshot(){return list()}
 function restore(items=[]){rules.length=0;for(const item of items){if(item?.condition)continue;add(item)}return list()}
 for(const item of initialRules) add(item);
 return {add,remove,evaluate,list,snapshot,restore,rules};
}
module.exports={EFFECTS,createPolicyEngine};