const DEFAULT_RANGES={heartRate:{min:40,max:180},spo2:{min:90,max:100},temperatureC:{min:35,max:39.5}};
function normalizeHealthReading({sourceId,type,value,unit,at=Date.now(),confidence=1}={}){
 if(!sourceId||!type||!Number.isFinite(Number(value)))throw new Error("valid sourceId, type and value required");
 return {sourceId,type,value:Number(value),unit:unit||null,at:Number(at),confidence:Math.max(0,Math.min(1,Number(confidence)))};
}
function flagAnomaly(reading,{baseline,ranges=DEFAULT_RANGES}={}){
 const range=ranges[reading.type];
 const reasons=[];
 if(range&&(reading.value<range.min||reading.value>range.max))reasons.push("outside configured safety range");
 if(baseline&&Number.isFinite(baseline.mean)&&Number.isFinite(baseline.stdDev)&&baseline.stdDev>0&&Math.abs(reading.value-baseline.mean)>3*baseline.stdDev)reasons.push("significantly different from personal baseline");
 return {abnormal:reasons.length>0,reasons,reading};
}
module.exports={DEFAULT_RANGES,normalizeHealthReading,flagAnomaly};