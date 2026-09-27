function createPostgresRepository(pool){
 if(!pool?.query)throw new Error("PostgreSQL pool with query() required");
 async function upsertUser(user){
  const r=await pool.query(
   `INSERT INTO users(id,email,display_name) VALUES($1,$2,$3)
    ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email,display_name=EXCLUDED.display_name
    RETURNING *`,[user.id,user.email||null,user.displayName||null]);
  return r.rows[0];
 }
 async function saveWorkflow(userId,w){
  const r=await pool.query(
   `INSERT INTO workflows(id,user_id,type,state,context,steps,history,attempt,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT(id) DO UPDATE SET state=EXCLUDED.state,context=EXCLUDED.context,steps=EXCLUDED.steps,history=EXCLUDED.history,attempt=EXCLUDED.attempt,updated_at=EXCLUDED.updated_at
    RETURNING *`,
   [w.id,userId,w.type,w.state,JSON.stringify(w.context||{}),JSON.stringify(w.steps||[]),JSON.stringify(w.history||[]),w.attempt||0,w.createdAt||new Date(),w.updatedAt||new Date()]);
  return r.rows[0];
 }
 async function listWorkflows(userId,{state,limit=50}={}){
  const values=[userId],where=["user_id=$1"];
  if(state){values.push(state);where.push("state=$"+values.length)}
  values.push(Math.min(200,Math.max(1,limit)));
  const r=await pool.query(`SELECT * FROM workflows WHERE ${where.join(" AND ")} ORDER BY updated_at DESC LIMIT $${values.length}`,values);
  return r.rows;
 }
 async function saveMemory(userId,memory){
  const r=await pool.query(
   `INSERT INTO memories(id,user_id,type,encrypted_value,source,sensitivity,expires_at,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
    ON CONFLICT(id) DO UPDATE SET encrypted_value=EXCLUDED.encrypted_value,source=EXCLUDED.source,sensitivity=EXCLUDED.sensitivity,expires_at=EXCLUDED.expires_at,updated_at=NOW()
    RETURNING *`,
   [memory.id,userId,memory.type,JSON.stringify(memory.encryptedValue),memory.source||null,memory.sensitivity||"normal",memory.expiresAt||null]);
  return r.rows[0];
 }
 async function listDueJobs(at=new Date(),limit=100){
  const r=await pool.query("SELECT * FROM jobs WHERE enabled=TRUE AND next_run_at <= $1 ORDER BY next_run_at ASC LIMIT $2",[at,limit]);
  return r.rows;
 }
 async function updateJobResult(id,{nextRunAt,lastStatus,lastError=null}={}){
  const r=await pool.query("UPDATE jobs SET last_run_at=NOW(),next_run_at=$2,last_status=$3,last_error=$4 WHERE id=$1 RETURNING *",[id,nextRunAt,lastStatus,lastError]);
  return r.rows[0];
 }
 async function appendFeedback(userId,{predictionKey,outcome,context}){
  const r=await pool.query("INSERT INTO feedback(user_id,prediction_key,outcome,context) VALUES($1,$2,$3,$4) RETURNING *",[userId,predictionKey,outcome,JSON.stringify(context||{})]);
  return r.rows[0];
 }
 return {upsertUser,saveWorkflow,listWorkflows,saveMemory,listDueJobs,updateJobResult,appendFeedback,pool};
}
module.exports={createPostgresRepository};