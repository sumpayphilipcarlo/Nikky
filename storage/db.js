function createPostgresPool({connectionString,ssl=false,max=10}={}){
 if(!connectionString)throw new Error("DATABASE_URL is required");
 let Pool;try{({Pool}=require("pg"))}catch{throw new Error("pg dependency is required for PostgreSQL production storage")}
 return new Pool({connectionString,max,ssl:ssl?{rejectUnauthorized:false}:false});
}
async function checkDatabase(pool){
 const started=Date.now();
 const r=await pool.query("SELECT 1 AS ok");
 return {ok:r.rows?.[0]?.ok===1,latencyMs:Date.now()-started};
}
module.exports={createPostgresPool,checkDatabase};