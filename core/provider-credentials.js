const Memory=require("./memory.js");
function createProviderCredentialVault({repository,userId,keyMaterial}={}){
 if(!repository)throw new Error("provider repository required");
 if(!userId)throw new Error("userId required");
 if(!keyMaterial)throw new Error("provider credential encryption key required");
 function id(provider){return userId+":"+String(provider)}
 async function save(provider,credentials,{scopes=[],status="connected"}={}){
  if(!provider||!credentials)throw new Error("provider and credentials required");
  const encrypted=await Memory.seal(credentials,keyMaterial);
  return repository.saveProviderConnection(userId,{
   id:id(provider),provider,status,encryptedCredentials:encrypted,scopes,lastHealth:null
  });
 }
 async function load(provider){
  const row=await repository.getProviderConnection(userId,provider);
  if(!row||!row.encrypted_credentials)return null;
  const credentials=await Memory.open(row.encrypted_credentials,keyMaterial);
  return {provider:row.provider,status:row.status,scopes:row.scopes||[],lastHealth:row.last_health||null,credentials};
 }
 async function list(){
  const rows=await repository.listProviderConnections(userId);
  return rows.map(r=>({id:r.id,provider:r.provider,status:r.status,scopes:r.scopes||[],lastHealth:r.last_health||null,updatedAt:r.updated_at}));
 }
 async function remove(provider){return repository.deleteProviderConnection(userId,provider)}
 async function setHealth(provider,health){return repository.updateProviderHealth(userId,provider,health)}
 return {save,load,list,remove,setHealth};
}
module.exports={createProviderCredentialVault};