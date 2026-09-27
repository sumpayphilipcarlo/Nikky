function createMemorySecretStore(initial={}){
 const values=new Map(Object.entries(initial));
 function validateName(name){if(!/^[A-Z0-9_]{2,100}$/.test(String(name)))throw new Error("invalid secret name")}
 async function set(name,value){validateName(name);if(value===undefined||value===null)throw new Error("secret value required");values.set(name,String(value));return true}
 async function get(name){validateName(name);return values.has(name)?values.get(name):null}
 async function remove(name){validateName(name);return values.delete(name)}
 async function has(name){validateName(name);return values.has(name)}
 function listNames(){return [...values.keys()]}
 return {set,get,remove,has,listNames};
}
function envSecretStore(env=process.env){
 return {get:async name=>env[name]||null,has:async name=>!!env[name],listNames:()=>[]};
}
module.exports={createMemorySecretStore,envSecretStore};