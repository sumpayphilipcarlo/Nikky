function createNotificationCenter({now=()=>Date.now(),dedupeMs=15*60*1000}={}){
 const delivered=new Map(),history=[];const clone=v=>JSON.parse(JSON.stringify(v));
 function keyOf(n){return n.dedupeKey||[n.type,n.title,n.body].join("|")}
 function shouldDeliver(n){const k=keyOf(n),last=delivered.get(k);return last===undefined||now()-last>=dedupeMs||n.priority>=95}
 function classify(priority=50){if(priority>=95)return "urgent";if(priority>=80)return "high";if(priority>=50)return "normal";return "quiet"}
 function prepare(n={}){const priority=Number(n.priority)||50;return {...n,priority,urgency:classify(priority),requiresWake:priority>=98,preparedAt:new Date(now()).toISOString()}}
 function record(n,channel,status="delivered"){const item={...prepare(n),channel,status,at:new Date(now()).toISOString()};if(status==="delivered")delivered.set(keyOf(n),now());history.unshift(item);if(history.length>500)history.pop();return clone(item)}
 function snapshot(){return history.map(clone)}
 function restore(items=[]){history.length=0;delivered.clear();for(const item of items.slice(0,500)){history.push(clone(item));if(item.status==="delivered")delivered.set(keyOf(item),new Date(item.at||item.preparedAt||0).getTime()||now())}return snapshot()}
 return {shouldDeliver,prepare,record,history,snapshot,restore};
}
module.exports={createNotificationCenter};