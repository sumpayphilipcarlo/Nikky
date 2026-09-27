function clamp(n,min=0,max=1){return Math.min(max,Math.max(min,n))}
function scoreEvidence(evidence=[]){
 if(!evidence.length)return 0;
 let weighted=0,total=0;
 for(const e of evidence){
  const weight=Number(e.weight)||1,confidence=clamp(Number(e.confidence)||0);
  weighted+=confidence*weight;total+=weight;
 }
 return total?clamp(weighted/total):0;
}
function makePrediction({type,title,action,evidence=[],threshold=0.65,impact="low"}={}){
 const confidence=scoreEvidence(evidence);
 const impactPenalty={low:0,medium:.05,high:.15,critical:.3}[impact]||0;
 const effectiveThreshold=clamp(threshold+impactPenalty);
 return {
  id:"pred_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7),
  type,title:title||type,action,evidence,confidence,effectiveThreshold,
  status:confidence>=effectiveThreshold?"candidate":"insufficient-confidence",
  createdAt:new Date().toISOString()
 };
}
function rank(predictions=[]){return [...predictions].sort((a,b)=>(b.confidence-b.effectiveThreshold)-(a.confidence-a.effectiveThreshold))}
module.exports={clamp,scoreEvidence,makePrediction,rank};