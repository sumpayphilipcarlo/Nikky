const crypto=require("crypto");
function token(){return crypto.randomBytes(24).toString("base64url")}
function createIdentityService({sessionTtlMs=24*60*60*1000,now=()=>Date.now()}={}){
 const users=new Map(),sessions=new Map(),devices=new Map();
 function registerUser({id,email,displayName}={}){
  if(!id)throw new Error("user id required");
  const u={id,email:email||null,displayName:displayName||null,createdAt:new Date(now()).toISOString()};
  users.set(id,u);return u;
 }
 function createSession(userId,{deviceId}={}){
  if(!users.has(userId))throw new Error("unknown user");
  const id=token(),expiresAt=now()+sessionTtlMs;
  const s={id,userId,deviceId:deviceId||null,createdAt:new Date(now()).toISOString(),expiresAt};
  sessions.set(id,s);return s;
 }
 function verifySession(id){
  const s=sessions.get(id);if(!s)return null;
  if(s.expiresAt<=now()){sessions.delete(id);return null}
  return s;
 }
 function revokeSession(id){return sessions.delete(id)}
 function trustDevice(userId,{id,name,platform,publicKey}={}){
  if(!users.has(userId))throw new Error("unknown user");
  if(!id)throw new Error("device id required");
  const d={id,userId,name:name||id,platform:platform||"unknown",publicKey:publicKey||null,trusted:true,createdAt:new Date(now()).toISOString()};
  devices.set(id,d);return d;
 }
 function revokeDevice(id){const d=devices.get(id);if(!d)return false;d.trusted=false;for(const [sid,s] of sessions)if(s.deviceId===id)sessions.delete(sid);return true}
 return {registerUser,createSession,verifySession,revokeSession,trustDevice,revokeDevice,users,sessions,devices};
}
module.exports={createIdentityService};