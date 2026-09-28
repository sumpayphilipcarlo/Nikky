function assessResponsiveness(signals=[],{now=Date.now(),windowMs=120000,minConfidence=.6}={}){
 const recent=signals.filter(s=>Number(s.at||0)>=now-windowMs&&Number(s.confidence??1)>=minConfidence);
 const positive=recent.filter(s=>s.responsive===true);
 const negative=recent.filter(s=>s.responsive===false);
 if(positive.length)return {responsive:true,confidence:Math.max(...positive.map(s=>Number(s.confidence??1))),evidence:positive};
 if(negative.length>=2)return {responsive:false,confidence:negative.reduce((a,s)=>a+Number(s.confidence??1),0)/negative.length,evidence:negative};
 return {responsive:null,confidence:0,evidence:recent};
}
module.exports={assessResponsiveness};