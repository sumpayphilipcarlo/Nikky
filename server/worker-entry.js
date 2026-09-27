const {assertValidConfig}=require("./config.js");
const {createWorker}=require("./worker.js");
const {createPostgresPool}=require("../storage/db.js");
const {createPostgresRepository}=require("../storage/postgres.js");
const {createRuntime}=require("./runtime.js");

async function startWorker(){
 const {config}=assertValidConfig(process.env);
 if(!config.databaseUrl)throw new Error("DATABASE_URL is required for worker");
 const pool=createPostgresPool({connectionString:config.databaseUrl,ssl:String(process.env.DATABASE_SSL||"false")==="true"});
 const repository=createPostgresRepository(pool);
 const runtime=createRuntime({workflowRepository:repository,userId:process.env.NIKKY_DEFAULT_USER_ID||"default-user"});
 const handlers={
  "runtime.scheduler.tick":async()=>runtime.scheduler.tick(),
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