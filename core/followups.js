function recommendFollowUps({commitments=[],messages=[],now=new Date(),staleHours=48}={}){
 const out=[];
 for(const c of commitments){
  if(c.status!=="open")continue;
  const due=c.dueAt?new Date(c.dueAt):null;
  if(due&&due<now)out.push({kind:"commitment-overdue",priority:90,commitmentId:c.id,title:"Overdue commitment",summary:c.task});
 }
 for(const m of messages){
  if(m.direction!=="outbound"||m.replied)return;
  const age=(now-new Date(m.at))/3600000;
  if(age>=staleHours)out.push({kind:"awaiting-reply",priority:60,messageId:m.id,title:"Follow up",summary:m.subject||"Awaiting reply"});
 }
 return out.sort((a,b)=>b.priority-a.priority);
}
function draftFollowUp(item,{personName="there"}={}){
 if(item.kind==="commitment-overdue")return {subject:"Follow-up",body:`Hi ${personName}, I wanted to follow up on ${item.summary}. I’ll send an update as soon as possible.`};
 return {subject:"Following up",body:`Hi ${personName}, just following up on my previous message. Please let me know when you have a chance.`};
}
module.exports={recommendFollowUps,draftFollowUp};