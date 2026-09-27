const fs=require("fs"),path=require("path");
const {createPostgresPool}=require("./db.js");
async function migrate({pool,connectionString=process.env.DATABASE_URL,ssl=String(process.env.DATABASE_SSL||"false")==="true"}={}){
 const own=!pool;
 if(!pool)pool=createPostgresPool({connectionString,ssl});
 const sql=fs.readFileSync(path.join(__dirname,"schema.sql"),"utf8");
 try{
  await pool.query("BEGIN");
  await pool.query(sql);
  await pool.query("COMMIT");
  return {ok:true};
 }catch(err){
  try{await pool.query("ROLLBACK")}catch{}
  throw err;
 }finally{
  if(own)await pool.end();
 }
}
if(require.main===module)migrate().then(()=>{console.log("Nikky database migration complete")}).catch(e=>{console.error(e);process.exit(1)});
module.exports={migrate};