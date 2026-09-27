function createMemoryRepository(){
 const users=new Map(),workflows=new Map(),memories=new Map(),jobs=new Map(),feedback=[];
 async function upsertUser(u){users.set(u.id,{...users.get(u.id),...u});return users.get(u.id)}
 async function saveWorkflow(userId,w){const rec={...w,userId};workflows.set(w.id,rec);return rec}
 async function listWorkflows(userId,{state,limit=50}={}){return [...workflows.values()].filter(w=>w.userId===userId&&(!state||w.state===state)).slice(0,limit)}
 async function saveMemory(userId,m){const rec={...m,userId};memories.set(m.id,rec);return rec}
 async function listDueJobs(at=new Date(),limit=100){return [...jobs.values()].filter(j=>j.enabled!==false&&new Date(j.nextRunAt)<=at).slice(0,limit)}
 async function updateJobResult(id,patch){const j=jobs.get(id);if(!j)return null;Object.assign(j,patch,{lastRunAt:new Date()});return j}
 async function appendFeedback(userId,x){const rec={id:feedback.length+1,userId,...x};feedback.push(rec);return rec}
 function putJob(j){jobs.set(j.id,{...j});return jobs.get(j.id)}
 return {upsertUser,saveWorkflow,listWorkflows,saveMemory,listDueJobs,updateJobResult,appendFeedback,putJob,users,workflows,memories,jobs,feedback};
}
module.exports={createMemoryRepository};