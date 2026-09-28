const {assertValidConfig}=require("./config.js");
const {createWorker}=require("./worker.js");
const {createPostgresPool}=require("../storage/db.js");
const {createPostgresRepository}=require("../storage/postgres.js");
const {createRuntime}=require("./runtime.js");
const {buildStoredProviders}=require("./provider-bootstrap.js");

async function startWorker(){
 const {config}=assertValidConfig(process.env);
 if(!config.databaseUrl)throw new Error("DATABASE_URL is required for worker");
 const pool=createPostgresPool({connectionString:config.databaseUrl,ssl:String(process.env.DATABASE_SSL||"false")==="true",sslCa:process.env.DATABASE_SSL_CA||null});
 const repository=createPostgresRepository(pool);
 const userId=process.env.NIKKY_DEFAULT_USER_ID||"default-user";
 await repository.upsertUser({id:userId});
 const providers=await buildStoredProviders({repository,userId,keyMaterial:config.memoryKey});
 const runtime=createRuntime({workflowRepository:repository,userId,providers});
 await runtime.restoreWorkflows();
 await runtime.restoreRuntimeState();
 await runtime.restoreMemories();
 await repository.upsertJob(userId,{id:userId+":scheduler",type:"runtime.scheduler.tick",intervalMs:60000,nextRunAt:new Date()});
 await repository.upsertJob(userId,{id:userId+":missions",type:"runtime.missions.tick",intervalMs:Number(process.env.NIKKY_MISSION_RETRY_MS||60000),nextRunAt:new Date()});
 const handlers={
  "runtime.scheduler.tick":async()=>runtime.scheduler.tick(),
  "runtime.missions.tick":async()=>{
   await runtime.restoreRuntimeState();
   const waiting=runtime.missionPlanner.list().filter(m=>m.state==="waiting_external");
   const results=[];
   for(const mission of waiting)results.push(await runtime.missionRunner.resume(mission.id));
   if(waiting.length)await runtime.persistRuntimeState("missions");
   return {checked:waiting.length,results};
  },
  "provider.health":async job=>({provider:job.payload?.provider||"unknown",status:"scheduled-check"})
 };
 const worker=createWorker({repository,handlers,pollMs:Number(process.env.NIKKY_WORKER_POLL_MS||60000)});
 worker.start();
 const shutdown=async()=>{worker.stop();await pool.end();process.exit(0)};
 process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);
 console.log(JSON.stringify({event:"nikky_worker_started"}));
 return {worker,pool,runtime};
}
if(require.main===module)startWorker().catch(e=>{console.error(e);process.exit(1)});
module.exports={startWorker};