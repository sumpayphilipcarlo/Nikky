const fs=require("fs"),path=require("path"),crypto=require("crypto");
function checksum(data){return crypto.createHash("sha256").update(data).digest("hex")}
function createJsonStore({filePath}={}){
 if(!filePath)throw new Error("filePath required");
 let state={version:1,data:{}};
 function load(){
  if(!fs.existsSync(filePath))return state;
  const raw=fs.readFileSync(filePath,"utf8"),parsed=JSON.parse(raw);
  if(parsed.checksum&&checksum(JSON.stringify(parsed.payload))!==parsed.checksum)throw new Error("persistence checksum mismatch");
  state=parsed.payload||state;return state;
 }
 function save(){
  fs.mkdirSync(path.dirname(filePath),{recursive:true});
  const payload=state,body={payload,checksum:checksum(JSON.stringify(payload))};
  const tmp=filePath+".tmp";fs.writeFileSync(tmp,JSON.stringify(body,null,2),{mode:0o600});fs.renameSync(tmp,filePath);
  return true;
 }
 function get(bucket,id){return state.data[bucket]?.[id]??null}
 function put(bucket,id,value){state.data[bucket]=state.data[bucket]||{};state.data[bucket][id]=value;save();return value}
 function remove(bucket,id){if(!state.data[bucket]?.[id])return false;delete state.data[bucket][id];save();return true}
 function list(bucket){return Object.values(state.data[bucket]||{})}
 function replace(bucket,items,key="id"){state.data[bucket]={};for(const item of items)state.data[bucket][item[key]]=item;save()}
 load();
 return {load,save,get,put,remove,list,replace,state};
}
module.exports={createJsonStore,checksum};