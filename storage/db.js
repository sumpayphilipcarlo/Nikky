function createPostgresPool({connectionString,ssl=false,sslCa=null,max=10}={}){
 if(!connectionString)throw new Error("DATABASE_URL is required");
 let Pool;try{({Pool}=require("pg"))}catch{throw new Error("pg dependency is required for PostgreSQL production storage")}
 let sslConfig=false;
 if(ssl===true)sslConfig={rejectUnauthorized:true,...(sslCa?{ca:sslCa}:{})};
 else if(ssl&&typeof ssl==="object")sslConfig={rejectUnauthorized:true,...ssl};
 return new Pool({connectionString,max,ssl:sslConfig});
}
async function checkDatabase(pool){
 const started=Date.now();const r=await pool.query("SELECT 1 AS ok");
 return {ok:r.rows?.[0]?.ok===1,latencyMs:Date.now()-started};
}
module.exports={createPostgresPool,checkDatabase};