function createTaskManager(initial=[]){
 const tasks=new Map(initial.map(t=>[t.id,{...t}]));
 function add(task){
  const id=task.id||"task_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7);
  const rec={id,title:task.title||task.task||"Task",status:"open",source:task.source||"explicit",dueAt:task.dueAt||null,priority:task.priority||50,context:task.context||{},createdAt:new Date().toISOString(),...task};
  tasks.set(id,rec);return rec;
 }
 function update(id,patch){const t=tasks.get(id);if(!t)return null;Object.assign(t,patch,{updatedAt:new Date().toISOString()});return t}
 function complete(id){return update(id,{status:"completed",completedAt:new Date().toISOString()})}
 function open(){return [...tasks.values()].filter(t=>t.status==="open").sort((a,b)=>(b.priority||0)-(a.priority||0))}
 function due(now=new Date()){return open().filter(t=>t.dueAt&&new Date(t.dueAt)<=now)}
 function fromCommitment(c){return add({id:"commitment:"+c.id,title:c.task,status:c.status||"open",source:"commitment",dueAt:c.dueAt,context:{commitmentId:c.id}})}
 return {add,update,complete,open,due,fromCommitment,list:()=>[...tasks.values()]};
}
module.exports={createTaskManager};