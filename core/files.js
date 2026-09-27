const crypto=require("crypto");
const TEXT_EXT=new Set(["txt","md","csv","json","yaml","yml","xml","ini","conf","config","log","eml"]);
const DOC_EXT=new Set(["pdf","docx","xlsx","pptx","png","jpg","jpeg","webp"]);
function extension(name=""){const m=String(name).toLowerCase().match(/\.([a-z0-9]+)$/);return m?m[1]:""}
function classify(name,mime=""){
 const ext=extension(name);
 if(TEXT_EXT.has(ext)||String(mime).startsWith("text/"))return "text";
 if(["png","jpg","jpeg","webp"].includes(ext)||String(mime).startsWith("image/"))return "image";
 if(DOC_EXT.has(ext))return "document";
 return "unknown";
}
function createFileContext(){
 let selected=null;const files=new Map();
 function ingest({id,name,mime,size,bytes,text,source="local"}={}){
  if(!id||!name)throw new Error("file id and name required");
  if(Number(size)>25*1024*1024)throw new Error("file exceeds 25 MB prototype limit");
  const hash=bytes?crypto.createHash("sha256").update(Buffer.from(bytes)).digest("hex"):crypto.createHash("sha256").update(String(text||"")).digest("hex");
  const rec={id,name,mime:mime||"",size:Number(size)||Buffer.byteLength(String(text||"")),kind:classify(name,mime),hash,source,text:typeof text==="string"?text:null,ingestedAt:new Date().toISOString()};
  files.set(id,rec);return rec;
 }
 function select(id){if(!files.has(id))throw new Error("unknown file");selected=id;return files.get(id)}
 function current(){return selected?files.get(selected)||null:null}
 function remove(id){if(selected===id)selected=null;return files.delete(id)}
 return {ingest,select,current,remove,list:()=>[...files.values()],files};
}
module.exports={TEXT_EXT,DOC_EXT,extension,classify,createFileContext};