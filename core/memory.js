const {webcrypto}=require("crypto");
const cryptoImpl=globalThis.crypto?.subtle?globalThis.crypto:webcrypto;
function enc(){return new TextEncoder()} function dec(){return new TextDecoder()}
function b64(bytes){return Buffer.from(bytes).toString("base64")}
function unb64(s){return new Uint8Array(Buffer.from(s,"base64"))}
async function importKey(raw){
 const bytes=typeof raw==="string"?enc().encode(raw):raw;
 const digest=await cryptoImpl.subtle.digest("SHA-256",bytes);
 return cryptoImpl.subtle.importKey("raw",digest,{name:"AES-GCM"},false,["encrypt","decrypt"]);
}
async function seal(value,keyMaterial){
 const key=await importKey(keyMaterial),iv=cryptoImpl.getRandomValues(new Uint8Array(12));
 const plain=enc().encode(JSON.stringify(value));
 const cipher=await cryptoImpl.subtle.encrypt({name:"AES-GCM",iv},key,plain);
 return {v:1,alg:"AES-GCM",iv:b64(iv),ciphertext:b64(new Uint8Array(cipher))};
}
async function open(blob,keyMaterial){
 if(!blob||blob.alg!=="AES-GCM") throw new Error("unsupported memory blob");
 const key=await importKey(keyMaterial);
 const plain=await cryptoImpl.subtle.decrypt({name:"AES-GCM",iv:unb64(blob.iv)},key,unb64(blob.ciphertext));
 return JSON.parse(dec().decode(plain));
}
function createMemoryStore({now=()=>new Date(),retentionDays=365}={}){
 const records=new Map();
 function put({id,type="general",value,source="user",sensitivity="normal",retentionDays:override}={}){
  if(!id)throw new Error("memory id required");
  const createdAt=now().toISOString();
  const ttl=Number.isFinite(override)?override:retentionDays;
  const expiresAt=ttl===null?null:new Date(now().getTime()+ttl*86400000).toISOString();
  const rec={id,type,value,source,sensitivity,createdAt,updatedAt:createdAt,expiresAt};
  records.set(id,rec);return rec;
 }
 function get(id){purgeExpired();return records.get(id)||null}
 function list(){purgeExpired();return [...records.values()]}
 function remove(id){return records.delete(id)}
 function purgeExpired(){
  const t=now().getTime();
  for(const [id,r] of records)if(r.expiresAt&&new Date(r.expiresAt).getTime()<=t)records.delete(id);
 }
 function exportAll(){purgeExpired();return JSON.parse(JSON.stringify(list()))}
 function clear(){records.clear()}
 return {put,get,list,remove,purgeExpired,exportAll,clear};
}
module.exports={seal,open,createMemoryStore};