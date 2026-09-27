const {extractText}=require("./extractors.js");
function fallbackSummary(content,{maxChars=700}={}){
 const text=typeof content==="string"?content:JSON.stringify(content);
 const cleaned=text.replace(/\s+/g," ").trim();
 return cleaned.length<=maxChars?cleaned:cleaned.slice(0,maxChars).replace(/\s+\S*$/,"")+"…";
}
function createDocumentIntelligence({analyzer,binaryExtractor}={}){
 async function analyze(file,{instruction="Summarize the document"}={}){
  let extracted=extractText(file);
  if(!extracted.ok&&binaryExtractor)extracted=await binaryExtractor(file);
  if(!extracted.ok)return {ok:false,reason:extracted.reason,requiresExtractor:true};
  if(analyzer){
   const result=await analyzer({file,extracted,instruction});
   return {ok:true,source:"configured-analyzer",extracted,result};
  }
  return {ok:true,source:"local-fallback",extracted,result:{summary:fallbackSummary(extracted.content)}};
 }
 return {analyze};
}
module.exports={fallbackSummary,createDocumentIntelligence};