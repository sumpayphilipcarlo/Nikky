function decodeBase64Url(s=""){return Buffer.from(String(s).replace(/-/g,"+").replace(/_/g,"/"),"base64").toString("utf8")}
function parseEml(text=""){
 const normalized=String(text).replace(/\r\n/g,"\n");
 const split=normalized.indexOf("\n\n"),rawHeaders=split>=0?normalized.slice(0,split):normalized,body=split>=0?normalized.slice(split+2):"";
 const headers={};let last=null;
 for(const line of rawHeaders.split("\n")){
  if(/^\s/.test(line)&&last)headers[last]+=" "+line.trim();
  else{const i=line.indexOf(":");if(i>0){last=line.slice(0,i).toLowerCase();headers[last]=line.slice(i+1).trim()}}
 }
 return {subject:headers.subject||"",from:headers.from||"",to:headers.to||"",date:headers.date||"",body,headers};
}
function parseConfig(text=""){
 const out={};
 for(const raw of String(text).split(/\r?\n/)){
  const line=raw.trim();if(!line||line.startsWith("#")||line.startsWith(";"))continue;
  const i=line.search(/[:=]/);if(i<1)continue;
  const key=line.slice(0,i).trim(),value=line.slice(i+1).trim();
  out[key]=/password|secret|token|key/i.test(key)?"[REDACTED]":value;
 }
 return out;
}
function extractText(file){
 if(!file)return {ok:false,reason:"file required"};
 if(file.kind==="text"&&typeof file.text==="string"){
  if(file.name.toLowerCase().endsWith(".eml"))return {ok:true,type:"email",content:parseEml(file.text)};
  if(/\.(ini|conf|config|yaml|yml)$/i.test(file.name))return {ok:true,type:"config",content:parseConfig(file.text)};
  if(file.name.toLowerCase().endsWith(".json")){
   try{return {ok:true,type:"json",content:JSON.parse(file.text)}}catch{return {ok:true,type:"text",content:file.text}}
  }
  return {ok:true,type:"text",content:file.text};
 }
 return {ok:false,reason:"binary document requires a configured document/vision extractor"};
}
module.exports={decodeBase64Url,parseEml,parseConfig,extractText};