const {assertValidConfig}=require("./config.js");
const {createRuntime}=require("./runtime.js");
const {createServer}=require("./index.js");
const {createPostgresPool,checkDatabase}=require("../storage/db.js");
const {createPostgresRepository}=require("../storage/postgres.js");
const {migrate}=require("../storage/migrate.js");
const {buildStoredProviders}=require("./provider-bootstrap.js");
const {createMonitor}=require("./monitoring.js");
const {installGracefulShutdown}=require("./lifecycle.js");

async function start(){
 const {config,warnings}=assertValidConfig(process.env);
 if(!config.databaseUrl)throw new Error("DATABASE_URL is required for production runtime");
 const pool=createPostgresPool({connectionString:config.databaseUrl,ssl:String(process.env.DATABASE_SSL||"false")==="true",sslCa:process.env.DATABASE_SSL_CA||null});
 await migrate({pool});
 const db=await checkDatabase(pool);
 const repository=createPostgresRepository(pool);
 const userId=process.env.NIKKY_DEFAULT_USER_ID||"default-user";
 await repository.upsertUser({id:userId});
 const providers=await buildStoredProviders({repository,userId,keyMaterial:config.memoryKey});
 const runtime=createRuntime({workflowRepository:repository,userId,providers});
 runtime.monitor=createMonitor();
 runtime.readiness=async()=>{
  try{
   const database=await checkDatabase(pool);
   const audit=runtime.auditLedger?.verify?.()||{ok:true};
   return {ok:database.ok&&audit.ok,checks:{database,audit}};
  }catch(error){
   runtime.monitor.error("readiness_failed",error);
   return {ok:false,checks:{database:{ok:false,error:error.message}}};
  }
 };
 await runtime.restoreWorkflows();
 await runtime.restoreRuntimeState();
 const server=createServer({runtime,config,warnings});
 server.listen(config.port,()=>runtime.monitor.info("nikky_core_started",{port:config.port,database:db,warnings}));
 const lifecycle=installGracefulShutdown({
  server,
  closeables:[()=>pool.end()],
  logger:entry=>runtime.monitor.info(entry.event,entry)
 });
 return {server,pool,runtime,lifecycle};
}
if(require.main===module)start().catch(e=>{console.error(e);process.exit(1)});
module.exports={start};