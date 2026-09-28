function createSensorFusion({now=()=>Date.now(),staleMs=5*60*1000}={}){
 const readings=new Map();
 function ingest(reading){
  if(!reading?.sourceId||!reading?.signal)throw new Error("sourceId and signal required");
  const item={...reading,confidence:Math.max(0,Math.min(1,Number(reading.confidence??1))),at:Number(reading.at||now())};
  readings.set(reading.sourceId+"|"+reading.signal,item);return {...item};
 }
 function current(signal){
  return [...readings.values()].filter(r=>r.signal===signal).map(r=>({...r,stale:now()-r.at>staleMs}));
 }
 function correlate(signals,{minConfidence=.7,minSources=2,windowMs=120000}={}){
  const cutoff=now()-windowMs;
  const selected=[...readings.values()].filter(r=>signals.includes(r.signal)&&r.at>=cutoff&&r.confidence>=minConfidence);
  const sources=new Set(selected.map(r=>r.sourceId));
  const confidence=selected.length?selected.reduce((a,r)=>a+r.confidence,0)/selected.length:0;
  return {ok:sources.size>=minSources,sourceCount:sources.size,confidence,readings:selected.map(r=>({...r})),signals:[...signals]};
 }
 function health(){return [...readings.values()].map(r=>({sourceId:r.sourceId,signal:r.signal,stale:now()-r.at>staleMs,lastAt:r.at}))}
 return {ingest,current,correlate,health};
}
module.exports={createSensorFusion};