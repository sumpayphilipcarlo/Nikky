const {assertValidConfig}=require("./config.js");
const {createRuntime}=require("./runtime.js");
const {createServer}=require("./index.js");
const {createPostgresPool,checkDatabase}=require("../storage/db.js");
const {createPostgresRepository}=require("../storage/postgres.js");
const {migrate}=require("../storage/migrate.js");

async function start(){
 const {config,warnings}=assertValidConfig(process.env);
 if(!config.databaseUrl)throw new Error("DATABASE_URL is required for production runtime");
 const pool=createPostgresPool({connectionString:config.databaseUrl,ssl:String(process.env.DATABASE_SSL||"false")==="true"});
 await migrate({pool});
 const db=await checkDatabase(pool);
 const repository=createPostgresRepository(pool);
 const runtime=createRuntime({workflowRepository:repository,userId:process.env.NIKKY_DEFAULT_USER_ID||"default-user"});
 await repository.upsertUser({id:process.env.NIKKY_DEFAULT_USER_ID||"default-user"});
 await runtime.restoreWorkflows();
 const server=createServer({runtime,config,warnings});
 server.on("close",()=>pool.end().catch(()=>{}));
 server.listen(config.port,()=>console.log(JSON.stringify({event:"nikky_core_started",port:config.port,database:db,warnings})));
 return {server,pool,runtime};
}
if(require.main===module)start().catch(e=>{console.error(e);process.exit(1)});
module.exports={start};