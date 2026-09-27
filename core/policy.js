const EFFECTS={ALLOW:"allow",APPROVAL:"approval",DENY:"deny"};
function createPolicyEngine(initialRules=[]){
 const rules=[...initialRules];
 function add(rule){
  if(!rule?.id||!rule.effect)throw new Error("policy id and effect required");
  const idx=rules.findIndex(r=>r.id===rule.id);
  if(idx>=0)rules[idx]={...rule};else rules.push({...rule});
  return {...rule};
 }
 function remove(id){const i=rules.findIndex(r=>r.id===id);if(i<0)return false;rules.splice(i,1);return true}
 function matches(rule,action,ctx){
  if(rule.actionType&&rule.actionType!==action.type)return false;
  if(rule.recipient&&rule.recipient!==action.payload?.recipient)return false;
  if(rule.skill&&rule.skill!==ctx?.skill)return false;
  if(rule.maxRisk&&Number(ctx?.riskScore||0)>Number(rule.maxRisk))return false;
  if(rule.condition&&typeof rule.condition==="function"&&!rule.condition(action,ctx))return false;
  return true;
 }
 function evaluate(action,ctx={}){
  const applicable=rules.filter(r=>r.enabled!==false&&matches(r,action,ctx)).sort((a,b)=>(b.priority||0)-(a.priority||0));
  const rule=applicable[0];
  return rule?{effect:rule.effect,ruleId:rule.id}:{effect:EFFECTS.APPROVAL,ruleId:null};
 }
 function list(){return rules.map(r=>({...r,condition:r.condition?undefined:r.condition}))}
 return {add,remove,evaluate,list,rules};
}
module.exports={EFFECTS,createPolicyEngine};