function scoreParking(p,preferences={}){
 let score=0;
 const walk=Number(p.walkMinutes??999),price=Number(p.price??9999);
 score+=Math.max(0,40-walk*3);
 score+=Math.max(0,30-price*(preferences.priceWeight??.2));
 if(preferences.covered&&p.covered)score+=10;
 if(preferences.evCharging&&p.evCharging)score+=15;
 if(preferences.accessible&&p.accessible)score+=15;
 if(p.available===false)score-=100;
 if(p.open===false)score-=100;
 if(preferences.maxHeightM&&p.maxHeightM&&preferences.vehicleHeightM>p.maxHeightM)score-=100;
 return score;
}
function chooseParking(options=[],preferences={}){
 const ranked=options.map(p=>({...p,score:scoreParking(p,preferences)})).sort((a,b)=>b.score-a.score);
 return {best:ranked[0]||null,alternatives:ranked.slice(1)};
}
module.exports={scoreParking,chooseParking};