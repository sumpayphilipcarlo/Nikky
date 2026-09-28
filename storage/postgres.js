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

 async function saveProviderConnection(userId,connection){
  const r=await pool.query(
   `INSERT INTO provider_connections(id,user_id,provider,status,encrypted_credentials,scopes,last_health,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,NOW())
    ON CONFLICT(user_id,provider) DO UPDATE SET status=EXCLUDED.status,encrypted_credentials=EXCLUDED.encrypted_credentials,scopes=EXCLUDED.scopes,last_health=EXCLUDED.last_health,updated_at=NOW()
    RETURNING *`,
   [connection.id,userId,connection.provider,connection.status||"connected",JSON.stringify(connection.encryptedCredentials||null),JSON.stringify(connection.scopes||[]),JSON.stringify(connection.lastHealth||null)]);
  return r.rows[0];
 }
 async function getProviderConnection(userId,provider){
  const r=await pool.query("SELECT * FROM provider_connections WHERE user_id=$1 AND provider=$2",[userId,provider]);
  return r.rows[0]||null;
 }
 async function listProviderConnections(userId){
  const r=await pool.query("SELECT id,provider,status,scopes,last_health,updated_at FROM provider_connections WHERE user_id=$1 ORDER BY provider",[userId]);
  return r.rows;
 }
 async function deleteProviderConnection(userId,provider){
  const r=await pool.query("DELETE FROM provider_connections WHERE user_id=$1 AND provider=$2",[userId,provider]);
  return r.rowCount>0;
 }
 async function updateProviderHealth(userId,provider,health){
  const r=await pool.query("UPDATE provider_connections SET last_health=$3,updated_at=NOW() WHERE user_id=$1 AND provider=$2 RETURNING *",[userId,provider,JSON.stringify(health||{})]);
  return r.rows[0]||null;
 }

 async function saveRuntimeState(userId,bucket,value){
  if(!bucket)throw new Error("runtime state bucket required");
  const r=await pool.query(
   `INSERT INTO runtime_state(user_id,bucket,value,updated_at) VALUES($1,$2,$3,NOW())
    ON CONFLICT(user_id,bucket) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()
    RETURNING bucket,value,updated_at`,
   [userId,bucket,JSON.stringify(value??null)]);
  return r.rows[0];
 }
 async function loadRuntimeState(userId,bucket){
  const r=await pool.query("SELECT value FROM runtime_state WHERE user_id=$1 AND bucket=$2",[userId,bucket]);
  return r.rows[0]?.value??null;
 }
 async function loadRuntimeStates(userId,buckets=[]){
  if(!Array.isArray(buckets)||!buckets.length)return {};
  const r=await pool.query("SELECT bucket,value FROM runtime_state WHERE user_id=$1 AND bucket = ANY($2::text[])",[userId,buckets]);
  return Object.fromEntries(r.rows.map(row=>[row.bucket,row.value]));
 }
 async function appendFeedback(userId,{predictionKey,outcome,context}){
  const r=await pool.query("INSERT INTO feedback(user_id,prediction_key,outcome,context) VALUES($1,$2,$3,$4) RETURNING *",[userId,predictionKey,outcome,JSON.stringify(context||{})]);
  return r.rows[0];
 }
 return {upsertUser,saveWorkflow,listWorkflows,saveMemory,listDueJobs,updateJobResult,saveProviderConnection,getProviderConnection,listProviderConnections,deleteProviderConnection,updateProviderHealth,saveRuntimeState,loadRuntimeState,loadRuntimeStates,appendFeedback,pool};
}
module.exports={createPostgresRepository};